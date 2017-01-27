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
ifdef v
	EXTRA = --extra-vars=django_repo_version=$(v)
endif

APP_TAGS = --tags reunhangout,django
USER = --user deploy
ALL_HOSTS = -i hosts.cfg
STAGE_HOSTS = -i hosts.cfg -l reunhangout-staging
PROD_HOSTS = -i hosts.cfg -l reunhangout

prod:
		ansible-playbook $(PROD_HOSTS) prod.yml $(VAULT) $(EXTRA) $(USER) $(TAGS)

prodapp:
		ansible-playbook $(PROD_HOSTS) prod.yml $(VAULT) $(EXTRA) $(USER) $(APP_TAGS)

prodcode:
		ansible-playbook $(PROD_HOSTS) prod.yml $(VAULT) $(EXTRA) $(USER) --tags djangocode

createsuperuserprod:
		ansible-playbook $(PROD_HOSTS) createsuperuser.yml $(VAULT) $(EXTRA) $(USER) $(TAGS)

stage:
		ansible-playbook $(STAGE_HOSTS) stage.yml $(VAULT) $(EXTRA) $(USER) $(TAGS)

stageapp:
		ansible-playbook $(STAGE_HOSTS) stage.yml $(VAULT) $(EXTRA) $(USER) $(APP_TAGS)

stagecode:
		ansible-playbook $(STAGE_HOSTS) stage.yml $(VAULT) $(EXTRA) $(USER) --tags djangocode

upgrades:
		ansible-playbook $(ALL_HOSTS) upgrades.yml $(VAULT) $(USER)

reboot:
		ansible-playbook $(ALL_HOSTS) reboot.yml $(VAULT) $(USER)

prodbounce:
		ansible-playbook $(PROD_HOSTS) bounce-prod.yml $(VAULT) $(USER)

stagebounce:
		ansible-playbook $(STAGE_HOSTS) bounce-stage.yml $(VAULT) $(USER)

firstrunprod:
		ansible-playbook $(PROD_HOSTS) firstrun.yml --user root
		ansible-playbook $(PROD_HOSTS) prod.yml $(VAULT) $(EXTRA) --user root

firstrunstage:
		ansible-playbook $(STAGE_HOSTS) firstrun.yml --user root
		ansible-playbook $(STAGE_HOSTS) stage.yml $(VAULT) $(EXTRA) --user root

