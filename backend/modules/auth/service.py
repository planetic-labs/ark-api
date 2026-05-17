import random
import secrets
import resend
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.redis import set_auth_code, get_auth_code, delete_auth_code
from backend.core.security import create_access_token, create_refresh_token, decode_token
from backend.core.config import settings
from backend.modules.users.models import User
from backend.modules.auth.models import RefreshToken
from backend.modules.auth.schemas import TokenSchema

# Configure Resend
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def request_code(self, email: str) -> str:
        # Generate 6-digit code
        code = "".join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Save to Redis
        await set_auth_code(email, code)
        
        print(f"DEBUG: Auth code for {email} is {code}")
        
        # Send email via Resend
        if settings.RESEND_API_KEY:
            try:
                params: resend.Emails.SendParams = {
                    "from": settings.EMAIL_FROM,
                    "to": [email],
                    "subject": "Your Ark Messenger Login Code",
                    "html": f"<strong>Your login code is: {code}</strong><br>It will expire in 10 minutes.",
                }
                email_response = resend.Emails.send(params)
                print(f"Resend email sent: {email_response}")
            except Exception as e:
                print(f"Failed to send email via Resend: {e}")
        else:
            print("WARNING: RESEND_API_KEY not set. Check logs for the auth code.")

        return code

    async def verify_code(self, email: str, code: str) -> TokenSchema | None:
        saved_code = await get_auth_code(email)
        
        if not saved_code or saved_code != code:
            return None
        
        # Delete code after use
        await delete_auth_code(email)
        
        # Find or create user
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(email=email)
            self.session.add(user)
            await self.session.flush() # Get user.id
        
        # Create tokens
        access_token = create_access_token(subject=user.id)
        refresh_token_str = create_refresh_token(subject=user.id)
        
        # Save refresh token to DB
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        db_refresh_token = RefreshToken(
            token=refresh_token_str,
            user_id=user.id,
            expires_at=expires_at
        )
        self.session.add(db_refresh_token)
        await self.session.commit()
        
        return TokenSchema(
            access_token=access_token,
            refresh_token=refresh_token_str
        )

    async def refresh_token(self, refresh_token: str) -> TokenSchema | None:
        try:
            payload = decode_token(refresh_token)
            user_id: str = payload.get("sub")
            if not user_id:
                return None
        except Exception:
            return None

        # Check if refresh token exists in DB and is not expired
        result = await self.session.execute(
            select(RefreshToken).where(
                RefreshToken.token == refresh_token,
                RefreshToken.expires_at > datetime.now(timezone.utc)
            )
        )
        db_token = result.scalar_one_or_none()
        if not db_token:
            return None

        # Generate new access token
        new_access_token = create_access_token(subject=user_id)
        
        return TokenSchema(
            access_token=new_access_token,
            refresh_token=refresh_token
        )
