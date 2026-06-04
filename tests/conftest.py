import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from core.config import settings
from core.database import get_session
from main import app

# Use NullPool for tests to guarantee completely isolated connections per session
# and prevent asyncpg interface collisions (concurrency errors)
test_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    echo=False,  # Set to False to keep test logs cleaner
    future=True
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function", autouse=True)
async def reset_redis_pool():
    import redis.asyncio as redis

    import core.redis as r
    from core.config import settings
    
    # Close old pool if any
    try:
        await r.pool.disconnect()
    except Exception:
        pass
        
    r.pool = redis.ConnectionPool.from_url(
        settings.REDIS_URL, 
        decode_responses=True
    )
    yield
    try:
        await r.pool.disconnect()
    except Exception:
        pass

async def clean_database():
    tables = [
        "refresh_tokens",
        "user_roles",
        "role_permissions",
        "user_permissions",
        "users",
        "roles",
        "permissions",
        "service_clients",
        "webhook_clients"
    ]
    async with TestingSessionLocal() as session:
        for table in tables:
            try:
                await session.execute(sa.text(f"TRUNCATE TABLE {table} CASCADE;"))
            except Exception as e:
                print(f"Error truncating {table}: {e}")
        await session.commit()

@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession]:
    # Clear DB before test
    await clean_database()
    
    # Yield a clean session for test setup
    async with TestingSessionLocal() as session:
        yield session
        await session.commit()
        
    # Clear DB after test
    await clean_database()

@pytest_asyncio.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient]:
    # Override get_session to use the NullPool testing session maker
    async def override_get_session():
        async with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
