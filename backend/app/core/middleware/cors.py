# 역할: CORS 설정을 FastAPI 애플리케이션에 적용하는 모듈

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config.settings import settings


# FastAPI 앱에 CORS 설정 미들웨어를 추가
def add_cors(app: FastAPI):
    origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    if settings.prod_frontend_origin:
        origins.append(settings.prod_frontend_origin)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )