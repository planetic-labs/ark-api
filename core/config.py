from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Ark Messenger"
    VERSION: str = "2026.5.23"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str

    # Debug mode (controls interactive docs visibility)
    DEBUG: bool = False

    # Security
    SECRET_KEY: str
    ALLOWED_ORIGINS: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    JWT_PRIVATE_KEY: str | None = None
    JWT_PUBLIC_KEY: str | None = None
    JWT_ACCESS_TTL: int = 900  # 15 minutes
    JWT_ISSUER: str = "ark-api"
    JWT_AUDIENCE: str = "pulsar"

    # Auth
    # Auth
    AUTH_CODE_EXPIRE_SECONDS: int = 600  # 10 minutes
    SUPERUSER_EMAIL: str | None = None

    # Email (Resend)
    # Email (Resend)
    RESEND_API_KEY: str | None = None
    EMAIL_FROM: str = (
        "Ark Messenger <onboarding@resend.dev>"  # Default resend test email
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [x.strip() for x in self.ALLOWED_ORIGINS.split(",") if x.strip()]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
