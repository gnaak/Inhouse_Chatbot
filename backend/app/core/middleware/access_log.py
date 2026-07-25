import time

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.utils.logger import get_logger

access_logger = get_logger("access")


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        client = request.client.host if request.client else "-"
        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000
            access_logger.info(
                "%s %s %s → %d (%.1fms)",
                client,
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
            return response
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            access_logger.exception(
                "%s %s %s → 500 (%.1fms)",
                client,
                request.method,
                request.url.path,
                duration_ms,
            )
            raise


def add_access_log(app: FastAPI):
    app.add_middleware(AccessLogMiddleware)
