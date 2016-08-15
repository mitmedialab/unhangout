ifdef vault_password_file
  VAULT = --vault-password-file $(vault_password_file)
else ifdef ANSIBLE_VAULT_PASSWORD_FILE_UNHANGOUT
  VAULT = --vault-password-file $(ANSIBLE_VAULT_PASSWORD_FILE_UNHANGOUT)
else
  VAULT = --ask-vault-pass
endif
ifdef tags
  TAGS = --tags $(tags)
endif

all:
	ansible-playbook -i hosts.cfg app.yml $(VAULT) $(TAGS)

firstrun:
	ansible-playbook -i hosts.cfg firstrun.yml --user root
	ansible-playbook -i hosts.cfg app.yml $(VAULT) --user root

upgrades:
	ansible-playbook -i hosts.cfg upgrades.yml $(VAULT)

reboot:
	ansible-playbook -i hosts.cfg reboot.yml $(VAULT)

createsuperuser:
	ansible-playbook -i hosts.cfg createsuperuser.yml $(VAULT)
