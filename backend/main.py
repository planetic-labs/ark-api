from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import structlog
import asyncio

# Setup logging
logger = structlog.get_logger()

from backend.modules.auth.router import router as auth_router
from backend.modules.users.router import router as users_router
from backend.modules.messaging.router import router as messaging_router
from backend.core.websocket import manager, redis_broadcast_reader

app = FastAPI(
    title="Ark Messenger API",
    version="2026.5.17",
    description="Corporate messenger backend for closed communities",
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(redis_broadcast_reader())

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = None,
):
    from backend.core.security import decode_token
    from jose import JWTError
    
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
    except JWTError as e:
        logger.warning("WS rejected: Token validation failed", error=str(e))
        await websocket.close(code=4003)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            # Just keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Ark Messenger API", "version": "2026.5.17"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
