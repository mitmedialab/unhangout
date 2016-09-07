import argparse
import asyncio
import functools
import json
import logging
import random
import re

import requests
import websockets

from howl import lines as chat_messages

logger = logging.getLogger()

parser = argparse.ArgumentParser("Loadtest a reunhangout server")
parser.add_argument('url', help='HTTP(S) URL for server to test')
parser.add_argument('event_slug', default='testy', help='Slug for event to test')
parser.add_argument('--user-range-min', default=0, help='Bottom of user index range')
parser.add_argument('--user-range-max', default=10, help='Top of user index range')
parser.add_argument('--password', default='password', help='Password for loadtest users')
parser.add_argument('--username-template', default='loadtest%s')
parser.add_argument('--disable-chat', action='store_true')
parser.add_argument('--disable-event-leaving', action='store_true')
parser.add_argument('--verbose', action='store_true')

def main(args):
    loop = asyncio.get_event_loop()
    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
        #loop.set_debug(True)
    else:
        logging.basicConfig(level=logging.INFO)

    clients = [Client(args, i) for i in range(args.user_range_min, args.user_range_max)]
    tasks = []
    try:
        tasks = [asyncio.async(client.run()) for client in clients]
        loop.run_until_complete(asyncio.gather(*tasks))
    except Exception:
        logging.exception("O no!")
        for task in tasks:
            task.cancel()
    finally:
        deletions = [asyncio.async(client.dispose()) for client in clients]
        loop.run_until_complete(asyncio.gather(*deletions))

class AuthException(Exception):
    pass

class Client:
    def __init__(self, args, index):
        self.args = args
        self.index = index
        self.username = self.args.username_template % index
        self.cookie_jar = requests.cookies.RequestsCookieJar()
        self.websocket = None

    def is_logged_in(self):
        return bool(self.cookie_jar.get('sessionid'))

    def is_connected(self):
        return self.websocket and self.websocket.open

    @asyncio.coroutine
    def run(self):
        '''
        Register / log in a load test user, and begin sending traffic.
        '''
        if not self.is_logged_in():
            try:
                yield from self.register()
            except AuthException as e:
                yield from self.login()

        count = 0
        while True:
            count += 1
            if count % 30 == 0:
                yield from self.send_json("heartbeat")
            yield from self.tick()
            yield from asyncio.sleep(1)

    @asyncio.coroutine
    def tick(self):
        '''
        Maybe take a random action that will generate traffic.
        '''
        op = random.uniform(0, 1)
        #self.debug("op: {}".format(op))
        if not self.is_connected():
            if op > 0.7:
                yield from self.connect_websocket()
        else:
            if op > 0.99 and not self.args.disable_chat:
                yield from self.send_json({
                    'type': 'chat',
                    'payload': {'message': random.choice(chat_messages)}
                })
            elif op > 0.999 and not self.args.disable_event_leaving:
                yield from self.websocket.close()

    @asyncio.coroutine
    def _get_csrf_token(self, url):
        res = yield from _run_as_async(requests.get, url, cookies=self.cookie_jar)
        token_match = re.search("name='csrfmiddlewaretoken' value='([A-Za-z0-9]+)'", res.text)
        if not token_match:
            raise AuthException("Can't find CSRF token")
        csrf_token = token_match.group(1)
        return csrf_token

    @asyncio.coroutine
    def _post(self, path, data=None):
        url = ''.join((self.args.url, path))
        csrf_token = yield from self._get_csrf_token(url)
        post = {'csrfmiddlewaretoken': csrf_token}
        post.update(data or {})
        self.cookie_jar.set('csrftoken', csrf_token)
        res = yield from _run_as_async(requests.post, url, post,
                cookies=self.cookie_jar, allow_redirects=False)
        return res

    def debug(self, message):
        logger.debug("[%s] %s" % (self.username, message))

    def info(self, message):
        logger.info("[%s] %s" % (self.username, message))

    @asyncio.coroutine
    def login(self):
        self.debug("attempting to login")
        res = yield from self._post("/accounts/login/", {
            'login': self.username,
            'password': self.args.password
        })
        # Redirect means success.
        if res.status_code == 302:
            self.cookie_jar = res.cookies
            self.debug("login succeeded: {}".format(
                self.cookie_jar.get('sessionid')
            ))
        else:
            self.debug("login failed")
            raise AuthException("Login failed, status {}.".format(res.status_code))
        return res

    @asyncio.coroutine
    def register(self):
        self.debug("attempting to register")
        res = yield from self._post('/accounts/signup/', {
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

    @asyncio.coroutine
    def delete_account(self):
        self.debug("attempting to delete account")
        if not self.cookie_jar.get('sessionid'):
            yield from self.login()
        res = yield from self._post('/accounts/delete/')
        if res.status_code == 200:
            self.debug("deletion complete")
        else:
            self.info("deletion failed -- status {}".format(res.status_code))
        return res

    @asyncio.coroutine
    def connect_websocket(self):
        self.debug("attempting to connect websocket")
        plenary_url = ''.join((self.args.url, '/event/', self.args.event_slug))
        ws_url = re.sub('^http', 'ws', plenary_url)
        headers = {
            'Cookie': 'sessionid=%s' % self.cookie_jar.get('sessionid'),
        }
        self.debug('headers: %s' % headers)
        self.websocket = yield from websockets.connect(ws_url, extra_headers=headers)

    @asyncio.coroutine
    def send_json(self, struct):
        res = yield from self.websocket.send(json.dumps(struct))
        return res

    @asyncio.coroutine
    def dispose(self):
        self.debug("DISPOSE!")
        if self.websocket:
            yield from self.websocket.close()
        yield from self.delete_account()
        self.cookie_jar.clear()

@asyncio.coroutine
def _run_as_async(method, *args, **kwargs):
    loop = asyncio.get_event_loop()
    future = loop.run_in_executor(None, functools.partial(method, *args, **kwargs))
    res = yield from future
    return res

if __name__ == "__main__":
    args = parser.parse_args()
    main(args)
