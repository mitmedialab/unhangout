# Ansible configuration for reunhangout

This is an ansible configuration for automating the provisioning and deployment
of a fully functional reunhangout server.  It can be deployed against targets
like a cheap Digital Ocean, Linode or AWS server.

As of now, this is a somewhat opinionated and un-flexible configuration; but it
can act as a starting point for broader use.

NOTE: This configuration uses submodules, so be sure to run
`git submodule init` followed by `git submodule update` within this repository
before use.

## Installation

1. Register a domain name or establish a subdomain and point it to the server you'd like to use.
2. Provision the server with a base operating system.  Ubuntu 16.04 is the only tested OS.
3. Edit `hosts.cfg` and change the hostname in the `[reunhangout]` group to
   your desired hostname.
4. Replace the file `vars/secrets.yml` with a file for containing your secrets.
   You can do this with
   [`ansible-vault`](https://docs.ansible.com/ansible/playbooks_vault.html) or
   as plain text; but if you don't use ansible-vault, be careful not to commit
   the file to source control, as it contains keys to the kingdom.  The file
   should define the following variables:
    * `reunhangout_domain`: The domain name as found in `hosts.cfg`.
    * `main_user_name`: The username to use for deployment
    * `main_user_salt`: A 16-character-ish alphanumerical string for salting
      the password in /etc/shadow. (This allows idempotent password changes).
    * `ansible_become_pass`: The desired sudo password for `main_user_name`.
    * `admin_email`: An email address for system emails (root will alias to this).
    * `monitoring_server_ip`: IP address of a nagios monitoring server (or
      127.0.0.1 if you aren't using nagios monitoring).
    * `monitoring_server_ip_as_regex`: The same IP as `monitoring_server_ip`,
      but expressed as a regex (e.g. `^127\.0\.0\.1$`).
    * `uh_postgres_db`: A database name for reunhangout to use.  Suggestion: `"reunhangout"`
    * `uh_postgres_user`: A database user for reunhangout to use. Suggestion: `"reunhangout"`
    * `uh_postgres_password`: A nice long complex password for reunhangout's postgres db.
    * `main_user_authorized_keys`: One or more SSH public keys to install as
      `authorized_keys` for `main_user_name`. After the first run,
      password-based authentication will be disabled, requiring these keys for
      auth.
    * `letsencrypt_account_key`: An RSA private key to use as an account key
      for letsencrypt. Can be generated with `openssl genrsa 4096`.
5. Run the first deployment:
  ```
  make firstrun
  ```
6. Create an initial Django superuser:
  ```
  make createsuperuser
  ```
  This will create a superuser with username `admin` and email address
  `admin_email` from `vars/secrets.yml`.  To log in, you'll need to request a
  password reset by going to `https://<domain>/accounts/password/reset/`.
7. Log in as an admin user. Set the value for the `Site` domain and name at
   `https://<domain>/admin/sites/site/1/change/`.  Create initial Plenaries as
   needed.
8. For subsequent builds/runs of the playbook (e.g. after changes to variables or code), run:
    ```
    make all
    ```
  Other useful make targets:
    * `make app`: Only run the tasks pertaining to the reunhangout application
      (skipping the OS/user setup, firewall, webserver, letsencrypt, etc).
      Faster for rebuilding after code changes.
    * `make reboot`: Reboot the server if it thinks it needs it (e.g. after kernel upgrades)
    * `make upgrades`: Run `apt-get update && apt-get upgrade`.
