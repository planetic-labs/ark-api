from fastapi import APIRouter, Depends

from modules.users.dependencies import (
    get_users_service,
    require_role,
)
from modules.users.models import User
from modules.users.schemas import (
    ServiceClientCreateResponseSchema,
    ServiceClientCreateSchema,
    ServiceClientSchema,
)
from modules.users.service import UserService

router = APIRouter(tags=["services"])


@router.get("/services/list", response_model=list[ServiceClientSchema])
async def list_services(
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    List all service clients (admin only).
    """
    return await service.list_services()


@router.post("/services/create", response_model=ServiceClientCreateResponseSchema)
async def create_service(
    body: ServiceClientCreateSchema,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Create a new service client and generate a secret token (admin only).
    """
    client, raw_token = await service.create_service(body)
    return {"client": client, "token": raw_token}


@router.post("/services/{client_id}/revoke", response_model=ServiceClientSchema)
async def revoke_service(
    client_id: str,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Revoke/deactivate a service client (admin only).
    """
    return await service.revoke_service(client_id)


@router.post("/services/{client_id}/activate", response_model=ServiceClientSchema)
async def activate_service(
    client_id: str,
    service: UserService = Depends(get_users_service),
    current_user: User = Depends(require_role("admin")),
):
    """
    Activate a service client (admin only).
    """
    return await service.activate_service(client_id)
