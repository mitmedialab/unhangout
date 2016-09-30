ifdef vault_password_file
  VAULT = --vault-password-file $(vault_password_file)
else ifdef ANSIBLE_VAULT_PASSWORD_FILE_UNHANGOUT
  VAULT = --vault-password-file $(ANSIBLE_VAULT_PASSWORD_FILE_UNHANGOUT)
else
  VAULT = --ask-vault-pass
endif

all:
	ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook loadtest.yml $(VAULT) --user ubuntu $(VARS)

one:
	ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook loadtest.yml $(VAULT) --user ubuntu --extra-vars 'loadtest_user_min=0 loadtest_user_max=45'

two:
	ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook loadtest.yml $(VAULT) --user ubuntu --extra-vars 'loadtest_user_min=45 loadtest_user_max=90'

three:
	ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook loadtest.yml $(VAULT) --user ubuntu --extra-vars 'loadtest_user_min=90 loadtest_user_max=135'
