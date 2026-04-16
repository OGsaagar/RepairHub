from __future__ import annotations

import os

from django.db.utils import OperationalError, ProgrammingError

from apps.accounts.models import User

_env_admin_ensured = False


def ensure_env_admin_account() -> None:
    admin_email = (os.getenv("ADMIN_EMAIL") or "").strip()
    admin_password = os.getenv("ADMIN_PASSWORD") or ""
    if not admin_email or not admin_password:
        return

    try:
        user, _ = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "username": admin_email,
                "role": User.Role.ADMIN,
                "profile_status": User.ProfileStatus.ACTIVE,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
    except (OperationalError, ProgrammingError):
        return

    update_fields: list[str] = []
    desired_values = {
        "username": admin_email,
        "role": User.Role.ADMIN,
        "profile_status": User.ProfileStatus.ACTIVE,
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
    }
    for field_name, desired_value in desired_values.items():
        if getattr(user, field_name) != desired_value:
            setattr(user, field_name, desired_value)
            update_fields.append(field_name)

    if not user.check_password(admin_password):
        user.set_password(admin_password)
        update_fields.append("password")

    if update_fields:
        user.save(update_fields=update_fields)


def ensure_env_admin_once() -> None:
    global _env_admin_ensured
    if _env_admin_ensured:
        return

    ensure_env_admin_account()
    _env_admin_ensured = True
