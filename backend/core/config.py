from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Ark Messenger"
    VERSION: str = "2026.5.17"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/ark"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Security
    SECRET_KEY: str = "secret-key-for-dev-only-change-in-prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Auth
    AUTH_CODE_EXPIRE_SECONDS: int = 600 # 10 minutes

    # Email (Resend)
    RESEND_API_KEY: str | None = None
    EMAIL_FROM: str = "Ark Messenger <onboarding@resend.dev>" # Default resend test email

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
