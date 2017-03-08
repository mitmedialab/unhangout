#!/usr/bin/env python3

import argparse
import asyncio
import datetime
import functools
import json
import logging
import os
import random
import re

import requests
import websockets
import websockets.exceptions

from howl import lines as chat_messages

logger = logging.getLogger()

parser = argparse.ArgumentParser("Loadtest a reunhangout server")
parser.add_argument('url', help='HTTP(S) URL for server to test')
parser.add_argument('plenary_slug', default='testy', help='Slug for plenary to test')
parser.add_argument('--user-range-min', default=0, type=int, help='Bottom of user index range')
parser.add_argument('--user-range-max', default=10, type=int, help='Top of user index range')
parser.add_argument('--password', default='password', help='Password to set/use for loadtest users')
parser.add_argument('--username-template', default='loadtest%s', help='Template string for creation of loadtest users. Must contain a single "%%s".')
parser.add_argument('--disable-chat', action='store_true', help='Disable chatting by loadtest users.')
parser.add_argument('--disable-event-leaving', action='store_true', help='Disable loadtest users leaving and rejoining the plenary.')
parser.add_argument('--disable-breakout-joining', action='store_true', help='Disable loadtest users joining breakout rooms.')
parser.add_argument('--verbose', action='store_true')
parser.add_argument('--cache-file', type=str, help='Path to a json file to cache client data in')
parser.add_argument('--read-only-cache', action='store_true', help='Disable writing the cache file. Useful when sharing across processes to avoid corruption.')
parser.add_argument('--chattiness', default=5, type=int, help='Level of chattiness, from 0 to 10. Higher is more chattier.')

def main(args):
    loop = asyncio.get_event_loop()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
        #loop.set_debug(True)
    else:
        logging.getLogger("requests").setLevel(logging.WARNING)
        logging.basicConfig(level=logging.INFO)

    #
    # Setup
    #

    # Read cache
    cache = {}
    if args.cache_file:
        if os.path.exists(args.cache_file):
            with open(args.cache_file, 'r') as fh:
                cache = json.load(fh)

    # Run setup
    logger.info("Running setup")
    clients = [Client(args, i, cache) for i in range(args.user_range_min, args.user_range_max)]
    for client in clients:
        client.clients = clients
    tasks = [loop.create_task(client.setup()) for client in clients]
    future = asyncio.gather(*tasks)
    loop.run_until_complete(future)

    # Write cache
    if args.cache_file and not args.read_only_cache:
        url_cache = cache.get(args.url, {})
        for client in clients:
            url_cache[str(client.index)] = {
                'cookies': {k: v for k, v in client.cookie_jar.items()},
                'plenary_data': client.plenary_data
            }
        cache[args.url] = url_cache
        with open(args.cache_file, 'w') as fh:
            logger.info('Writing cache')
            json.dump(cache, fh)

    # Run
    logger.info("Starting websockets")
    # See https://damienpontifex.github.io/asyncio-cancel-loop-task for how this works.
    tasks = [loop.create_task(client.run()) for client in clients]
    future = asyncio.gather(*tasks)
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt: Stopping, cleaning up")
    except Exception:
        logging.exception("O no!")
    finally:
        future.cancel()
        loop.run_until_complete(future)
        # Repeat this process for disposing.
        tasks = [loop.create_task(client.dispose()) for client in clients]
        future = asyncio.gather(*tasks)
        loop.run_until_complete(future)
        loop.close()


class AuthException(Exception):
    pass


class Client:
    def __init__(self, args, index, cache=None):
        self.args = args
        self.index = index
        self.username = self.args.username_template % index
        self.cookie_jar = requests.cookies.RequestsCookieJar()
        self.websocket = None
        self.breakout_websocket = None
        self.plenary_data = None
        self._chats_sent = 0
        self._chats_received = 0

        self.clients = [self] # override externally for room listening

        mycache = cache.get(args.url, {}).get(str(index), {})
        for k, v in mycache.get('cookies', {}).items():
            self.cookie_jar[k] = v
        self.plenary_data = mycache.get('plenary_data', self.plenary_data)

    def log(self, *args, level="log"):
        getattr(logger, level)("[%s] %s" % (self.username, " ".join("%s" % a for a in args)))

    def debug(self, *args):
        self.log(*args, level="debug")

    def info(self, *args):
        self.log(*args, level="info")

    def warn(self, *args):
        self.log(*args, level="warn")

    def is_logged_in(self):
        return bool(self.cookie_jar.get('sessionid'))

    def is_connected(self):
        return self.websocket and self.websocket.open and not self.failed

    def is_in_breakout(self):
        return self.breakout_websocket and self.breakout_websocket.open

    async def setup(self):
        try:
            if not self.is_logged_in():
                try:
                    self.info("registering")
                    await asyncio.ensure_future(self.register())
                except AuthException as e:
                    self.info("logging in")
                    await asyncio.ensure_future(self.login())
            if not self.plenary_data:
                self.plenary_data = await asyncio.ensure_future(self.get_plenary_data())
        except asyncio.CancelledError:
            pass

    async def run(self):
        '''
        Register / log in a load test user, and begin sending traffic.
        '''
        self.running = True
        try:
            count = 0
            await asyncio.sleep(random.uniform(0, 1) * 30)
            self.last_heartbeat = datetime.datetime.now()
            while self.running:
                count += 1
                diff = (datetime.datetime.now() - self.last_heartbeat).total_seconds()
                if diff >= 25:
                    self.info('heartbeat', diff)
                    await self.send_json("heartbeat")
                    self.last_heartbeat = datetime.datetime.now()
                await self.tick()
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass

    async def tick(self):
        '''
        Maybe take a random action that will generate traffic.
        '''
        if not self.running:
            return

        op = random.uniform(0, 1)
        self.debug("op: {}".format(op))
        chattiness = (1 - self.args.chattiness / 10.) * 0.1 + 0.9
        if not self.is_connected():
            if op > 0.5:
                await self.connect_websocket()
        else:
            if op > 0.95 and not self.args.disable_breakout_joining:
                if self.is_in_breakout():
                    if op > 0.995:
                        await self.leave_breakout()
                else:
                    await self.join_breakout()
            if op > 0.995 and not self.args.disable_event_leaving:
                await self.disconnect_websocket()
                self.info("disconnected websocket")
            elif op > chattiness and not self.args.disable_chat:
                await self.chat()

    async def chat(self):
        message = random.choice(chat_messages)
        futures = []
        for client in self.clients:
            if client.is_connected():
                futures.append((client, client.receive_chat(message)))
        await self.send_json({'type': 'chat', 'payload': {'message': message}})
        self.info("chat", message[0:20])

        await asyncio.wait_for(
            asyncio.gather(
                *[client.await_chat(future) for client, future in futures]),
            timeout=10
        )

    async def await_chat(self, future):
        self._chats_sent += 1
        try:
            await asyncio.wait_for(future, timeout=5)
        except asyncio.TimeoutError:
            self.warn(
                "{} Message delivery timeout".format(self.index),
                self._chats_received, "/", self._chats_sent
            )

    async def receive_chat(self, message):
        while True:
            recv = await self.websocket.recv()
            dct = json.loads(recv)
            satisfied = (
                dct['type'] == 'chat' and
                dct['payload']['message'] == message
            )
            if satisfied:
                self._chats_received += 1
                self.info(
                    "{} SATISFIED!".format(self.index),
                    self._chats_received, "/", self._chats_sent
                )
                break

    async def _post(self, path, data=None):
        url = ''.join((self.args.url, path))
        csrf_token = await self._get_csrf_token(path)
        post = {'csrfmiddlewaretoken': csrf_token}
        post.update(data or {})
        self.cookie_jar.set('csrftoken', csrf_token)
        res = await _run_as_async(requests.post, url, post,
                cookies=self.cookie_jar, allow_redirects=False)
        return res

    async def _get(self, path):
        url = ''.join((self.args.url, path))
        res = await _run_as_async(requests.get, url,
                cookies=self.cookie_jar, allow_redirects=False)
        return res

    async def _get_csrf_token(self, path):
        res = await self._get(path)
        token_match = re.search("name='csrfmiddlewaretoken' value='([A-Za-z0-9]+)'", res.text)
        if not token_match:
            raise AuthException("Can't find CSRF token")
        csrf_token = token_match.group(1)
        return csrf_token

    async def login(self):
        self.debug("attempting to login")
        res = await self._post("/accounts/login/", {
            'login': self.username,
            'password': self.args.password
        })
        # Redirect means success.
        if res.status_code == 302:
            self.cookie_jar = res.cookies
            self.info("login succeeded: {}".format(self.cookie_jar.get('sessionid')))
        else:
            self.info("login failed")
            raise AuthException("Login failed, status {}.".format(res.status_code))
        return res

    async def register(self):
        self.debug("attempting to register")
        res = await self._post('/accounts/signup/', {
            'username': self.username,
            'email': '',
            'password1': self.args.password,
            'password2': self.args.password,
        })
        # Redirect means success.
        if res.status_code == 302:
            self.cookie_jar = res.cookies
            self.debug("Successfully registered: {}".format(
                self.cookie_jar.get('sessionid')
            ))
        else:
            self.debug("Registration failed")
            raise AuthException("Registration failed, status {}.".format(res.status_code))
        return res

    async def delete_account(self):
        self.info("deleting account")
        if not self.cookie_jar.get('sessionid'):
            await self.login()
        res = await self._post('/accounts/delete/')
        if res.status_code == 302:
            self.debug("deletion complete")
        else:
            self.info("deletion failed -- status {}".format(res.status_code))
        return res

    async def get_plenary_data(self):
        res = await self._get("/event/{}/".format(self.args.plenary_slug))
        if res.status_code == 200:
            match = re.search("window.__INITIAL_STATE__ = (.*);\s*$", res.text, re.M)
            if match:
                return json.loads(match.group(1))
        self.warn("Event data not found! Status: {}".format(res.status_code))
        return None

    async def connect_websocket(self):
        self.debug("attempting to connect websocket")
        plenary_url = ''.join((self.args.url, '/event/', self.args.plenary_slug))
        ws_url = re.sub('^http', 'ws', plenary_url)
        headers = {
            'Cookie': 'sessionid=%s' % self.cookie_jar.get('sessionid'),
        }
        self.debug('headers: %s' % headers)
        try:
            self.websocket = await websockets.connect(ws_url, extra_headers=headers)
        except (ConnectionResetError, websockets.exceptions.InvalidHandshake):
            self.warn('Websocket connection failed')
            self.failed = True
            self.websocket = None
        else:
            self.info("websocket connected")
            self.failed = False

    async def disconnect_websocket(self):
        try:
            self.info("disconnecting websocket")
            await self.websocket.close()
        except websockets.ConnectionClosed:
            self.warn("Already closed websocket")
        except Exception as e:
            self.warn(str(e))

    async def join_breakout(self):
        if self.plenary_data and not self.args.disable_breakout_joining:
            def usable_breakout(b):
                return not b['is_proposal'] and not b['is_random'] and self.plenary_data['plenary']['breakouts_open']
            possible = [b for b in self.plenary_data['breakouts'] if usable_breakout(b)]
            breakout_url = ''.join((self.args.url, '/breakout/',
                str(random.choice(possible)['id']), '/'))
            self.info("Joining breakout {}".format(breakout_url))
            ws_url = re.sub('^http', 'ws', breakout_url)
            headers = {
                'Cookie': 'sessionid=%s' % self.cookie_jar.get('sessionid')
            }
            self.breakout_websocket = await websockets.connect(ws_url, extra_headers=headers)

    async def leave_breakout(self):
        if self.is_in_breakout():
            self.info("Leaving breakout")
            await self.breakout_websocket.close()

    async def send_json(self, struct):
        if not self.websocket:
            return self.warn("Attempt to send message without connection")
        try:
            res = await self.websocket.send(json.dumps(struct))
        except (websockets.ConnectionClosed, ConnectionResetError):
            self.warn("Connection closed when attemting to send message.")
            self.failed = True
            return None
        return res

    async def dispose(self):
        self.debug("DISPOSE!")
        self.running = False
        if self.websocket:
            await self.websocket.close()
        if self.breakout_websocket:
            await self.breakout_websocket.close()
        #await self.delete_account()
        #self.cookie_jar.clear()


async def _run_as_async(method, *args, **kwargs):
    loop = asyncio.get_event_loop()
    future = loop.run_in_executor(None, functools.partial(method, *args, **kwargs))
    res = await future
    return res

if __name__ == "__main__":
    args = parser.parse_args()
    main(args)
