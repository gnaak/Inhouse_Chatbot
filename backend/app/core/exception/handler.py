# core/exception/handler.py
from core.utils.response import BaseResponse
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse


def register_exception_handlers(app: FastAPI) -> None:
    """
    main.py에서 불러서 예외 핸들러를 모두 등록하는 함수
    """

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ):
        # detail 이 str일 수도, dict일 수도 있어서 최소한 이렇게 처리
        if isinstance(exc.detail, str):
            message = exc.detail
        else:
            message = "HTTP Error"

        body = BaseResponse(
            success=False,
            message=message,
            data=None,
            errorCode=getattr(exc, "error_code", None),
        )

        return JSONResponse(
            status_code=exc.status_code,
            content=body.model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ):
        # 로그는 여기서 남기면 됨 (logger 사용)
        # logger.exception(exc)

        body = BaseResponse(
            success=False,
            message="Internal Server Error",
            data=None,
            errorCode="INTERNAL_ERROR",
        )

        return JSONResponse(
            status_code=500,
            content=body.model_dump(),
        )
