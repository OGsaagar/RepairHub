from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in self.allowed_roles)


class IsAdminRole(HasRole):
    allowed_roles = ("admin",)


class IsRepairerRole(HasRole):
    allowed_roles = ("repairer", "admin")


class IsCustomerRole(HasRole):
    allowed_roles = ("customer", "admin")
