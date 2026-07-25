# 역할: FastAPI 앱 진입점 / 앱 생성, 미들웨어 등록, DB 초기화, 라우터 연결 등
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config.settings import settings  # 글로벌 설정 인스턴스
from app.core.database.redis import SESSION_TTL, redis_client
from app.core.middleware import register
from app.core.utils.logger import setup_logging
from app.module import *
from app.module.infra.redis.redis_repository import RedisRepository


# FastAPI 앱을 생성하고 필요한 설정을 적용하는 팩토리 함수
def create_app() -> FastAPI:
    setup_logging()
    app = FastAPI()

    register.register_middlewares(app)
    register_routers(app)

    redis_repository = RedisRepository(redis_client, SESSION_TTL)
    app.state.redis_repository = redis_repository

    return app

# FastAPI 실행 인스턴스
app = create_app()
app.mount("/media", StaticFiles(directory=settings.MEDIA_ROOT), name="media")
