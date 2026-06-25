from core.exceptions import AccessDeniedError


class ChatAccessDeniedError(AccessDeniedError):
    detail = "User not in chat"
