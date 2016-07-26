def serialize_auth_state(user, plenary=None):
    if not user.is_authenticated():
        return {'auth': {'is_authenticated': False}}

    return {
        'auth': {
            'is_authenticated': True,
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_admin': user.is_superuser or (plenary and plenary.admins.filter(pk=user.pk).exists()),
        }
    }

