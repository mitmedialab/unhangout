---
title: Setup unhangout
layout: doc
---

# Setting up unhangout

To use unhangout, you need to setup and configure a server to run the software.

This guide will require you to
- use the command line interface (CLI) on your computer
- install some software on your computer
- check out code from GitHub, 

If that seems too intimidating and you still wish to use unhangout, send us an email at [unhangout@media.mit.edu](mailto:unhangout@media.mit.edu) and we'll try to help you find someone that can do it for you.

## Get the code from GitHub

Everything required to run Unhangout is stored in the [GitHub repository](https://github.com/mitmedialab/unhangout), including a copy of this and other documentation. Start by getting the code from GitHub. In your CLI run:

```
$ git clone https://github.com/mitmedialab/unhangout.git
```

Before we can start setting some configuration values, you need to sign up for a few 3rd party servers.

## Get a server

First you need to get a server running Ubuntu 20.04 somewhere on the internet. The easiest way to getis to use a Virtual Private Server (VPS) provider like DigitalOcean or Linode. You can sign up and get a server for ~$20 per month.

You need something with at least 2GB RAM, 20 odd GB hard drive space and a decent CPU core or more. If you're using a VPS you can probably increase the server specs at a later stage if performance becomes an issue.

## Register a domain

Next you need to register a domain name or use an existing domain you can configure. A service like [ghandi.net](https://www.gandi.net/) will work. You need to configure 2 subdomains and point them both to the IP address of your server using a DNS A record.

## Create an account on Mailgun

Unhangout uses the Mailgun API to send email messages. You can sign up for an account at [mailgun.com](https://www.mailgun.com/).

## Install ansible

To run the deployment process, you will need to install Ansible on your local workstation. You can find instructions on [their site](https://docs.ansible.com/ansible/latest/installation_guide/index.html)

## Configure unhangout

Now that the infrastructure is ready, you need to set a few configuration values. Make a copy of the template file 

```
$ cp ansible/vars/example.yml ansible/vars/secrets.yml
```

Encrypt it using ansible vault

```
$ ansible-vault encrypt ansible/vars/secrets.yml
```

Edit the values:

```
$ ansible-vault edit ansible/vars/secrets.yml
```

You could also setup a vault password file for the 2 steps above to avoid entering a password all the time.

The template YAML file has some comments about the values you need to define, but in short here is a list of the required values:

 - `uh_domain`: the subdomain where users will find and join events
 - `main_user_pass`: a unique password
 - `main_user_salt`: 
 - `admin_email`: your email address
 - `postgres_admin_password`: a random long password
 - `youtube_api_key`: Youtube API key used for embedding videos
 - `mailgun_active_api_key`: Mailgun config for sending email
 - `mailgun_smtp_hostname`: probably smtp.mailgun.org
 - `mailgun_smtp_login`: Mailgun credentials for SMTP user (not your mailgun account login)
 - `mailgun_smtp_password`: Mailgun credetials for SMTP user (not your mailgun account password)
 - `uh_secret_key`: a long (>64 characters) randomly generated key. This is used to sign and encrypt things.
 - `uh_postgres_password`: A long random password
 - `uh_etherpad_domain`: The subdomain where etherpad will be running
 - `uh_etherpad_db_password`: A long random password
 - `uh_etherpad_session_key`: Another long random string
 - `uh_etherpad_api_key`: Yet another long random string
 - `main_user_authorized_keys`: public SSH keys for anyone who will be deploying/updating the code on your unhangout instance. You can usually find a public key at `~/.ssh/id_rsa.pub`. You can add multiple ssh keys here, just use YAML multi-line syntax.

If you want to enable social login, you can set the twitter, facebook and google variables that are named `twitter_client_id`, `twitter_secret`, `google_client_id`, etc.

If you want to run backups, you will need to sign up for a [tarsnap](https://www.tarsnap.com/) account and set the `tarsnap_key` variable.

And if you wish to use Google Analytics to track web traffic, you can set `ga_tracking_id`.

## Deploy unhangout to your server

You are now ready to deploy unhangout to your server! To run the first deployment, change in the ansible directory and run:
```
$ make firstrunprod
```

Create an initial Django superuser:
```
$ make createsuperuserprod
```

This will create a superuser with username `admin` and email address `admin_email` from `vars/secrets.yml`.  To log in, you'll need to request a password reset by going to `https://<domain>/accounts/password/reset/`.
   
## Final touches

You are almost done! Log in as an admin user and set the value for the `Site` domain and name at `https://<domain>/admin/sites/site/1/change/`. You can now start using your instance of Unhangout!
