def serialize_auth_state(user, plenary=None):
    from accounts.models import User

    if not user.is_authenticated:
        return {
            'auth': {
                'is_authenticated': False,
                'username': "Anonymous",
                'display_name': 'Anonymous',
                "image": User.default_profile_image(),
            }
        }

    return {
        'auth': {
            'is_authenticated': True,
            'id': user.id,
            'username': user.username,
            'display_name': user.get_display_name(),
            'has_display_name': bool(user.display_name),
            'image': user.get_profile_image(),
            'has_default_image': user.get_profile_image() == User.default_profile_image(), 
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_admin': user.is_superuser or (plenary and plenary.admins.filter(pk=user.pk).exists()),
            'receive_wrapup_emails': user.receive_wrapup_emails,
            'contact_card_email': user.contact_card_email,
            'contact_card_twitter': user.contact_card_twitter,
        }
    }

