import structlog
from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal
from modules.users.models import Role, User

logger = structlog.get_logger()


async def create_superuser_if_not_exists() -> None:
    if not settings.SUPERUSER_EMAIL:
        logger.info(
            "SUPERUSER_EMAIL is not configured, skipping superuser auto-creation"
        )
        return

    emails = [
        e.strip().lower() for e in settings.SUPERUSER_EMAIL.split(",") if e.strip()
    ]
    if not emails:
        logger.info("SUPERUSER_EMAIL is empty, skipping superuser auto-creation")
        return

    async with AsyncSessionLocal() as session:
        try:
            # 1. Ensure basic roles exist: admin (system) and student (default)
            roles_to_check = [
                {"name": "admin", "is_system": True, "is_default": False},
                {"name": "student", "is_system": False, "is_default": True},
            ]

            roles_map = {}
            for r_data in roles_to_check:
                result = await session.execute(
                    select(Role).where(Role.name == r_data["name"])
                )
                role = result.scalar_one_or_none()
                if not role:
                    role = Role(
                        name=r_data["name"],
                        is_system=r_data["is_system"],
                        is_default=r_data["is_default"],
                    )
                    session.add(role)
                    await session.flush()
                    logger.info("Created system role", role_name=r_data["name"])
                roles_map[r_data["name"]] = role

            admin_role = roles_map["admin"]

            # 2. Check and create/update superusers
            for email in emails:
                result = await session.execute(select(User).where(User.email == email))
                superuser = result.scalar_one_or_none()

                if not superuser:
                    # Create superuser
                    superuser = User(
                        email=email,
                        is_active=True,
                        is_approved=True,
                        email_verified=True,
                        status="active",
                        first_name="Admin",
                        last_name="",
                    )
                    superuser.roles.append(admin_role)
                    session.add(superuser)
                    logger.info("Superuser created successfully", email=email)
                else:
                    # Update status and role if needed
                    updated = False
                    if not superuser.is_approved:
                        superuser.is_approved = True
                        updated = True
                    if not superuser.is_active:
                        superuser.is_active = True
                        updated = True
                    if superuser.status != "active":
                        superuser.status = "active"
                        updated = True
                    if not superuser.email_verified:
                        superuser.email_verified = True
                        updated = True
                    if admin_role not in superuser.roles:
                        superuser.roles.append(admin_role)
                        updated = True

                    if updated:
                        logger.info(
                            "Superuser configuration updated to match admin parameters",
                            email=email,
                        )

            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to initialize roles or superusers", error=str(e))
            raise e
