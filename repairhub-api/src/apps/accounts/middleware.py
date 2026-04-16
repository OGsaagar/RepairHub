from __future__ import annotations

from apps.accounts.bootstrap import ensure_env_admin_once


class BootstrapEnvAdminMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ensure_env_admin_once()
        return self.get_response(request)
