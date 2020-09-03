# Ansible configuration for reunhangout

This is an ansible configuration for automating the provisioning and deployment
of a fully functional reunhangout server.  It can be deployed against targets
like a Digital Ocean, Linode or AWS server.

This is not meant as a generic configuration for running unhangout on any possible 
setup, but it serves as a starting point for other scenarios.

## Installation

1. Register a domain name or establish a subdomain and point it to the server you'd like to use.
2. Provision the server with a base operating system.  Ubuntu 20.04 is the only tested OS.
3. Edit `hosts.cfg` and change the hostname in the `[reunhangout]` group to
   your desired hostname.
4. Copy `vars/example.yml` to `vars/secrets.yml`. Encrypt it using [`ansible-vault`](https://docs.ansible.com/ansible/playbooks_vault.html) and then define all the variables therein. Some variables imply that you would need to setup an account.
5. Run the first deployment:
  ```
  make firstrunprod
  ```
6. Create an initial Django superuser:
  ```
  make createsuperuserprod
  ```
  This will create a superuser with username `admin` and email address
  `admin_email` from `vars/secrets.yml`.  To log in, you'll need to request a
  password reset by going to `https://<domain>/accounts/password/reset/`.
7. Log in as an admin user. Set the value for the `Site` domain and name at
   `https://<domain>/admin/sites/site/1/change/`.  Create initial Plenaries as
   needed.
8. For subsequent builds/runs of the playbook (e.g. after changes to variables or code), run:
    ```
    make prod
    ```
  Other useful make targets:
    * `make prodapp`: Only run the tasks pertaining to the reunhangout application
      (skipping the OS/user setup, firewall, webserver, letsencrypt, etc).
      Faster for rebuilding after code changes.
    * `make reboot`: Reboot the server if it thinks it needs it (e.g. after kernel upgrades)

If you have a staging server in addition to a production server, use the "stage" variants of the make targets to build that. (See `Makefile`).  Populate `vars/staging-secrets.yml` with any secrets that are different on the staging server (e.g. `uh_domain`, passwords, etc).
