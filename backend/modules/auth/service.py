import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.redis import (
    set_auth_code, get_auth_code, delete_auth_code,
    set_setup_token, get_setup_token, delete_setup_token
)
from backend.core.security import create_access_token, create_refresh_token, hash_token
from backend.core.config import settings
from backend.modules.users.models import User, Role
from backend.modules.auth.models import RefreshToken

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _get_or_create_default_role(self) -> Role:
        result = await self.session.execute(select(Role).where(Role.is_default == True))
        default_role = result.scalar_one_or_none()
        if not default_role:
            result = await self.session.execute(select(Role).where(Role.name == "student"))
            default_role = result.scalar_one_or_none()
            if not default_role:
                default_role = Role(name="student", is_default=True, is_system=False)
                self.session.add(default_role)
                await self.session.flush()
            else:
                default_role.is_default = True
                await self.session.flush()
        return default_role

    async def identify(self, email: str) -> dict:
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        # "email не найден или status='disabled': 200 { error: 'not_found' } -- одинаковый ответ, не раскрываем причину"
        if not user or user.status == 'disabled':
            return {"error": "not_found"}
            
        code = "".join([secrets.choice("0123456789") for _ in range(6)])
        await set_auth_code(email, code)
        
        print(f"DEBUG: Auth code for {email} is {code}")
        
        if settings.RESEND_API_KEY:
            try:
                import resend
                resend.api_key = settings.RESEND_API_KEY
                params: resend.Emails.SendParams = {
                    "from": settings.EMAIL_FROM,
                    "to": [email],
                    "subject": "Your Ark Messenger Login Code",
                    "html": f"<strong>Your login code is: {code}</strong><br>It will expire in 10 minutes.",
                }
                resend.Emails.send(params)
            except Exception as e:
                print(f"Failed to send email via Resend: {e}")
                
        return {"next": "enter_code"}

    async def verify_code(self, email: str, code: str) -> dict | None:
        saved_code = await get_auth_code(email)
        if not saved_code or saved_code != code:
            return None
            
        await delete_auth_code(email)
        
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or user.status == 'disabled':
            return None
            
        if user.status == 'created':
            user.email_verified = True
            
            setup_token = secrets.token_hex(32)
            await set_setup_token(setup_token, user.id)
            
            await self.session.commit()
            return {
                "next": "setup_profile",
                "setup_token": setup_token
            }
            
        elif user.status == 'active':
            if not user.roles:
                default_role = await self._get_or_create_default_role()
                user.roles.append(default_role)
                await self.session.flush()
                
            import ulid
            refresh_token_id = str(ulid.ULID())
            refresh_token_str = create_refresh_token()
            refresh_token_hash = hash_token(refresh_token_str)
            
            expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            db_refresh_token = RefreshToken(
                id=refresh_token_id,
                token_hash=refresh_token_hash,
                user_id=user.id,
                expires_at=expires_at
            )
            self.session.add(db_refresh_token)
            
            role_names = [role.name for role in user.roles]
            access_token = create_access_token(
                subject=user.id,
                roles=role_names,
                status=user.status,
                jti=refresh_token_id
            )
            
            await self.session.commit()
            return {
                "next": "home",
                "access_token": access_token,
                "refresh_token": refresh_token_str,
                "expires_in": settings.JWT_ACCESS_TTL
            }
        return None

    async def setup(self, setup_token: str, first_name: str | None, last_name: str | None, avatar_url: str | None) -> dict | None:
        user_id = await get_setup_token(setup_token)
        if not user_id:
            return None
            
        result = await self.session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or user.status == 'disabled':
            return None
            
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        user.status = 'active'
        if avatar_url:
            user.avatar_url = avatar_url
            
        if not user.roles:
            default_role = await self._get_or_create_default_role()
            user.roles.append(default_role)
            
        await delete_setup_token(setup_token)
        
        import ulid
        refresh_token_id = str(ulid.ULID())
        refresh_token_str = create_refresh_token()
        refresh_token_hash = hash_token(refresh_token_str)
        
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db_refresh_token = RefreshToken(
            id=refresh_token_id,
            token_hash=refresh_token_hash,
            user_id=user.id,
            expires_at=expires_at
        )
        self.session.add(db_refresh_token)
        
        role_names = [role.name for role in user.roles]
        access_token = create_access_token(
            subject=user.id,
            roles=role_names,
            status=user.status,
            jti=refresh_token_id
        )
        
        await self.session.commit()
        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "expires_in": settings.JWT_ACCESS_TTL
        }

    async def refresh_token(self, refresh_token_str: str) -> dict | None:
        token_hash = hash_token(refresh_token_str)
        
        result = await self.session.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.expires_at > datetime.now(timezone.utc)
            )
        )
        db_token = result.scalar_one_or_none()
        if not db_token:
            return None
            
        result = await self.session.execute(select(User).where(User.id == db_token.user_id))
        user = result.scalar_one_or_none()
        if not user or user.status == 'disabled':
            return None
            
        await self.session.delete(db_token)
        
        if not user.roles:
            default_role = await self._get_or_create_default_role()
            user.roles.append(default_role)
            await self.session.flush()
            
        import ulid
        new_refresh_token_id = str(ulid.ULID())
        new_refresh_token_str = create_refresh_token()
        new_refresh_token_hash = hash_token(new_refresh_token_str)
        
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_db_token = RefreshToken(
            id=new_refresh_token_id,
            token_hash=new_refresh_token_hash,
            user_id=user.id,
            expires_at=expires_at
        )
        self.session.add(new_db_token)
        
        role_names = [role.name for role in user.roles]
        new_access_token = create_access_token(
            subject=user.id,
            roles=role_names,
            status=user.status,
            jti=new_refresh_token_id
        )
        
        await self.session.commit()
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token_str,
            "expires_in": settings.JWT_ACCESS_TTL
        }

    async def logout(self, jti: str) -> bool:
        if not jti:
            return False
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.id == jti)
        )
        db_token = result.scalar_one_or_none()
        if db_token:
            user_id = db_token.user_id
            await self.session.delete(db_token)
            await self.session.commit()
            
            from backend.modules.auth.models import WebhookClient
            webhooks_result = await self.session.execute(
                select(WebhookClient).where(WebhookClient.is_active == True)
            )
            webhooks = webhooks_result.scalars().all()
            
            from backend.core.redis import enqueue_revocation_webhook
            for webhook in webhooks:
                await enqueue_revocation_webhook(
                    user_id=user_id,
                    jti=jti,
                    webhook_url=webhook.url,
                    webhook_secret=webhook.secret_key
                )
            
            return True
        return False
