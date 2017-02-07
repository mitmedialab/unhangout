ifdef vault_password_file
  VAULT = --vault-password-file $(vault_password_file)
else ifdef ANSIBLE_VAULT_PASSWORD_FILE_UNHANGOUT
  VAULT = --vault-password-file $(ANSIBLE_VAULT_PASSWORD_FILE_UNHANGOUT)
else
  VAULT = --ask-vault-pass
endif
ifdef l
	LOW = --user-range-min=$(l)
endif
ifdef h
	HIGH = --user-range-max=$(h)
endif
ifdef c
	CHATTINESS = --chattiness=$(c)
endif
ifdef d
	DISABLE_CHAT = --disable-chat
endif

all:
	ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook loadtest.yml $(VAULT) --user ubuntu $(VARS)

local2prod:
	../venv/bin/python loadtest.py https://unhangout.media.mit.edu loadtest $(LOW) $(HIGH) $(CHATTINESS) $(DISABLE_CHAT) --disable-event-leaving --disable-breakout-joining --cache-file ./cache.json --password $(UNHANGOUT_LOADTEST_USER_PASSWORD)
