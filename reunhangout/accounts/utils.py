def serialize_auth_state(user, plenary=None):
    if not user.is_authenticated():
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
            'image': user.get_profile_image(),
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_admin': user.is_superuser or (plenary and plenary.admins.filter(pk=user.pk).exists()),
            'twitter_handle': user.twitter_handle,
            'linkedin_profile': user.linkedin_profile,
            'share_info': user.share_info
        }
    }

