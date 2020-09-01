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

APP_TAGS = --tags reunhangout
USER = --user deploy
ALL_HOSTS = -i hosts.cfg
STAGE_HOSTS = -i hosts.cfg -l reunhangout-staging
PROD_HOSTS = -i hosts.cfg -l reunhangout

prod:
		ansible-playbook $(PROD_HOSTS) prod.yml $(VAULT) $(USER) $(TAGS)

prodapp:
		ansible-playbook $(PROD_HOSTS) prod.yml $(VAULT) $(USER) $(APP_TAGS)

createsuperuserprod:
		ansible-playbook $(PROD_HOSTS) createsuperuser.yml $(VAULT) $(USER) $(TAGS)

stage:
		ansible-playbook $(STAGE_HOSTS) stage.yml $(VAULT) $(USER) $(TAGS)

stageapp:
		ansible-playbook $(STAGE_HOSTS) stage.yml $(VAULT) $(USER) $(APP_TAGS)

upgrades:
		ansible-playbook $(ALL_HOSTS) upgrades.yml $(VAULT) $(USER)

reboot:
		ansible-playbook $(ALL_HOSTS) reboot.yml $(VAULT) $(USER)

prodbounce:
		ansible-playbook $(PROD_HOSTS) bounce-prod.yml $(VAULT) $(USER)

stagebounce:
		ansible-playbook $(STAGE_HOSTS) bounce-stage.yml $(VAULT) $(USER)

firstrunprod:
		ansible-playbook $(PROD_HOSTS) prod.yml $(VAULT) --user root

firstrunstage:
		ansible-playbook $(STAGE_HOSTS) stage.yml $(VAULT) --user root

