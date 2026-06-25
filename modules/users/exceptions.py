from fastapi import status

from core.exceptions import AppError, ConflictError, NotFoundError


class UserNotFoundError(NotFoundError):
    detail = "User not found"


class UserAlreadyExistsError(ConflictError):
    detail = "User with this email already exists"


class RoleNotFoundError(NotFoundError):
    detail = "Role not found"


class RoleAlreadyExistsError(ConflictError):
    detail = "Role already exists"


class SystemRoleModificationError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "System roles cannot be modified"


class ServiceClientNotFoundError(NotFoundError):
    detail = "Service client not found"
