import pytest
from channels.testing import ChannelsLiveServerTestCase
from selenium.webdriver.common.by import By
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

from django.contrib.auth import get_user_model

import socket

User = get_user_model()


class SomeLiveTests(ChannelsLiveServerTestCase):
    serve_static = True
    host = '0.0.0.0'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.host = socket.gethostbyname(socket.gethostname())
        cls.driver = webdriver.Remote(
            command_executor='http://selenium:4444/wd/hub',
            desired_capabilities=DesiredCapabilities.CHROME
        )
        cls.driver.implicitly_wait(10)

    @classmethod
    def tearDownClass(cls):
        #cls.driver.quit()
        super().tearDownClass()

    def setUp(self):
        self.user = User.objects.create_user(
            username='user',
            password='password',
            display_name='User Oneypants',
            email='user@example.com',
        receive_wrapup_emails=True)

    def _url(self, path):
        url = self.live_server_url
        print(url)
        return url + path
        #return url.replace('localhost', 'test') + path

    def test_add_plenary(self):
        #TODO login user
        self.driver.get(self._url('/accounts/login/'))
        username_input = self.driver.find_element_by_name("login")
        username_input.send_keys('user')
        password_input = self.driver.find_element_by_name("password")
        password_input.send_keys('password')
        self.driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()

        self.driver.get(self._url('/events/add/'))
        assert 'Add an Event' in self.driver.title
