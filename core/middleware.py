import structlog
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware

from core.redis import get_redis_client

logger = structlog.get_logger()

RATE_LIMITS = {
    "/api/v1/auth/identify": (5, 60),  # 5 req/min
    "/api/v1/auth/verify-code": (10, 60),  # 10 req/min
    "/api/v1/auth/refresh": (30, 60),  # 30 req/min
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if path in RATE_LIMITS:
            limit, period = RATE_LIMITS[path]
            ip = request.client.host if request.client else "unknown"
            key = f"rate_limit:{path}:{ip}"

            try:
                async with get_redis_client() as redis:
                    pipeline = redis.pipeline()
                    await pipeline.incr(key)
                    await pipeline.ttl(key)
                    results = await pipeline.execute()

                    current_requests = results[0]

                    if current_requests == 1:
                        await redis.expire(key, period)

                    if current_requests > limit:
                        logger.warning(
                            "Rate limit exceeded",
                            path=path,
                            ip=ip,
                            requests=current_requests,
                            limit=limit,
                        )
                        return Response(
                            content="Rate limit exceeded",
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        )
            except Exception as e:
                logger.error("Rate limit check failed", error=str(e))

        return await call_next(request)
