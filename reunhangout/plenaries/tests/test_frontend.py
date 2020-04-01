import pytest
from channels.testing import ChannelsLiveServerTestCase
from selenium.webdriver.common.by import By
from selenium import webdriver

from django.contrib.auth import get_user_model

User = get_user_model()


class SomeLiveTests(ChannelsLiveServerTestCase):
    serve_static = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.driver = webdriver.Firefox()
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

    def test_add_plenary(self):
        #TODO login user
        self.driver.get(self.live_server_url + '/accounts/login/')
        username_input = self.driver.find_element_by_name("login")
        username_input.send_keys('user')
        password_input = self.driver.find_element_by_name("password")
        password_input.send_keys('password')
        self.driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()

        self.driver.get(self.live_server_url + '/events/add/')
        assert 'Add an Event' in self.driver.title
