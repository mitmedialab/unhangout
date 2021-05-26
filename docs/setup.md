---
title: Install unhangout
layout: doc
---

# Setting up unhagout

To use unhangout, you need to setup and configure a server to run the software.

This guide will require you to
- use the command line interface (CLI) on your computer
- install some software on your computer
- check out code from GitHub, 

If that seems too intimidating and you still wish to use unhangout, see our list of hosted instances that might be able to accommodate your events [here]({{site.baseurl}}/hosted-instances/), or have a look at [this brief job template]({{site.baseurl}}/job-template/) that could help you find someone that can set it up for you.

## Get the code from GitHub

Everything required to run Unhangout is stored in the [GitHub repository](https://github.com/mitmedialab/unhangout), including a copy of this and other documentation. Start by getting the code from GitHub. In your CLI run:

```
$ git clone https://github.com/mitmedialab/unhangout.git
```

Before we can start setting some configuration values, you need to sign up for a few 3rd party servers.

## Get a server

First you need to get a server running Ubuntu 20.04 somewhere on the internet. The easiest way to getis to use a Virtual Private Server (VPS) provider like DigitalOcean or Linode. You can sign up and get a server for ~$20 per month.

You need something with at least 2GB RAM, 20 odd GB hard drive space and a decent CPU core or more. If you're using a VPS you can probablyincrease the server specs at a later stage if performance becomes an issue.

## Register a domain

Next you need to register a domain name or use an existing domain you can configure. A service like [ghandi.net](https://www.gandi.net/) will work. You need to configure 2 subdomains and point them both to the IP address of your server using an DNS A record.

## Create an account on Mailgun

Unhangout uses the Mailgun API to send email messages. You can sign up for an account at [mailgun.com](https://www.mailgun.com/).

## Install ansible

To run the deployment process, you will need to install Ansible on your local workstation. You can find instructions on [their site](https://docs.ansible.com/ansible/latest/installation_guide/index.html)

## Configure unhangout

Now that the infrastructure is ready, you need to set a few configuration values. There is a detailed set of instructions on what you should configure at `[ansible/README.md](https://github.com/mitmedialab/unhangout/blob/master/ansible/README.md)`, but in short:

Make a copy of the template file 

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

You will need to set at least the following values:

```yaml
uh_domain: 
main_user_pass: 
main_user_salt: 
admin_email:
postgres_admin_password: 
youtube_api_key: 
mailgun_active_api_key: 
mailgun_smtp_hostname: 
mailgun_smtp_login: 
mailgun_smtp_password: 
uh_secret_key: 
uh_postgres_password: 
uh_etherpad_domain: 
uh_etherpad_db_password: 
uh_etherpad_session_key: 
uh_etherpad_api_key: 
main_user_authorized_keys:
```

You can optionally set the following variables for social login, google analytics and backups.
```
twitter_client_id: 
twitter_secret: 
facebook_client_id: 
facebook_secret: 
google_client_id: 
google_secret: 
tarsnap_key:
ga_tracking_id: 
```

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

Log in as an admin user. Set the value for the `Site` domain and name at `https://<domain>/admin/sites/site/1/change/`.  Create initial Plenaries as needed.

- Adding terms of service and privacy policy
- Logo?

