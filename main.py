import asyncio

import jwt
import structlog
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.websocket import manager, redis_broadcast_reader
from modules.auth.router import router as auth_router
from modules.messaging.router import router as messaging_router
from modules.users.init_db import create_superuser_if_not_exists
from modules.users.router import router as users_router

# Setup logging
logger = structlog.get_logger()

app = FastAPI(
    title="Ark Messenger API",
    version="2026.5.23",
    description="Corporate messenger backend for closed communities",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(redis_broadcast_reader())
    await create_superuser_if_not_exists()


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = None,
):
    from core.security import decode_token

    await websocket.accept()
    logger.info("WS handshake started", has_token=bool(token))

    if not token:
        logger.warning("WS rejected: No token provided")
        await websocket.close(code=4003)
        return

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("WS rejected: Token missing subject")
            await websocket.close(code=4003)
            return
        logger.info("WS token validated", user_id=user_id)
    except jwt.PyJWTError as e:
        logger.warning("WS rejected: Token validation failed", error=str(e))
        await websocket.close(code=4003)
        return

    await manager.connect(user_id, websocket)

    from core.redis import get_redis_client

    async def keep_online():
        try:
            async with get_redis_client() as client:
                key = f"user:online:{user_id}"
                while True:
                    await client.set(key, "1", ex=30)
                    await asyncio.sleep(20)
        except asyncio.CancelledError:
            try:
                async with get_redis_client() as client:
                    await client.delete(f"user:online:{user_id}")
            except Exception:
                pass
        except Exception as e:
            logger.error(
                "Error keeping user online status", error=str(e), user_id=user_id
            )

    online_task = asyncio.create_task(keep_online())

    try:
        while True:
            # Just keep connection alive
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        online_task.cancel()
        manager.disconnect(user_id, websocket)
        try:
            async with get_redis_client() as client:
                await client.delete(f"user:online:{user_id}")
        except Exception:
            pass


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Global error", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(messaging_router, prefix="/api/v1")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to Ark Messenger API", "version": "2026.5.23"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/.well-known/jwks.json")
async def jwks():
    from core.security import get_jwks

    return get_jwks()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
