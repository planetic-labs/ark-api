from fastapi import FastAPI
from core.config import settings
from main import app

def test_docs_urls_when_debug_matches_app_state():
    if settings.DEBUG:
        assert app.docs_url == "/docs"
        assert app.redoc_url == "/redoc"
        assert app.openapi_url == "/openapi.json"
    else:
        assert app.docs_url is None
        assert app.redoc_url is None
        assert app.openapi_url is None


def test_docs_urls_when_debug_true_are_enabled():
    from core.config import Settings
    custom_settings = Settings(
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@db:5432/ark",
        REDIS_URL="redis://redis:6379/0",
        SECRET_KEY="test",
        ALLOWED_ORIGINS="http://localhost:3000",
        DEBUG=True
    )
    
    test_app = FastAPI(
        docs_url="/docs" if custom_settings.DEBUG else None,
        redoc_url="/redoc" if custom_settings.DEBUG else None,
        openapi_url="/openapi.json" if custom_settings.DEBUG else None,
    )
    assert test_app.docs_url == "/docs"
    assert test_app.redoc_url == "/redoc"
    assert test_app.openapi_url == "/openapi.json"


def test_docs_urls_when_debug_false_are_disabled():
    from core.config import Settings
    custom_settings = Settings(
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@db:5432/ark",
        REDIS_URL="redis://redis:6379/0",
        SECRET_KEY="test",
        ALLOWED_ORIGINS="http://localhost:3000",
        DEBUG=False
    )
    
    test_app = FastAPI(
        docs_url="/docs" if custom_settings.DEBUG else None,
        redoc_url="/redoc" if custom_settings.DEBUG else None,
        openapi_url="/openapi.json" if custom_settings.DEBUG else None,
    )
    assert test_app.docs_url is None
    assert test_app.redoc_url is None
    assert test_app.openapi_url is None
