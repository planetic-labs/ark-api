from fastapi import APIRouter, Depends

from modules.users.dependencies import (
    get_users_service,
    require_approved_user,
    require_role,
)
from modules.users.models import User
from modules.users.schemas import PermissionSchema, RoleCreateSchema, RoleSchema
from modules.users.service import UserService

router = APIRouter(tags=["roles"])


@router.get("/roles/list", response_model=list[RoleSchema])
async def list_roles(
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_approved_user),
):
    """
    List all roles in the system.
    """
    return await service.list_roles()


@router.post("/roles/create", response_model=RoleSchema)
async def create_role(
    body: RoleCreateSchema,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Create a new role with permissions (admin only).
    """
    return await service.create_role(body)


@router.patch("/roles/{role_id}", response_model=RoleSchema)
async def update_role(
    role_id: str,
    body: RoleCreateSchema,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Update a role and its permissions (admin only).
    """
    return await service.update_role(role_id, body)


@router.post("/roles/{role_id}/default", response_model=RoleSchema)
async def make_default_role(
    role_id: str,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Set a role as default (admin only).
    """
    return await service.make_default_role(role_id)


@router.get("/permissions/list", response_model=list[PermissionSchema])
async def list_permissions(
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_approved_user),
):
    """
    List all permissions in the system.
    """
    return await service.list_permissions()
