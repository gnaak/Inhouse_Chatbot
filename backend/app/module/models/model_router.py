from fastapi import APIRouter

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import success

router = APIRouter()


@router.get("/chat")
@with_provider
@with_login()
async def get_chat_models(p: ServiceProvider):
    data = await p.model_service.get_chat_models(p.request.user_id)
    return success(data=data)


@router.get("/image")
@with_provider
@with_login()
async def get_image_models(p: ServiceProvider):
    data = await p.model_service.get_image_models(p.request.user_id)
    return success(data=data)


@router.get("/all")
@with_provider
@with_login("admin")
async def get_all_models(p: ServiceProvider):
    data = await p.model_service.get_all_models()
    return success(data=data)


@router.post("/update_user_models")
@with_provider
@with_login("admin")
async def update_user_models(p: ServiceProvider):
    await p.model_service.update_user_models(p.request)
    return success()


# ── 카탈로그 (admin AI 모델 관리) ─────────────────────────────────────────

@router.get("/catalog")
@with_provider
@with_login("admin")
async def get_catalog(p: ServiceProvider):
    data = await p.model_service.get_catalog()
    return success(data=data)


@router.post("/refresh")
@with_provider
@with_login("admin")
async def refresh_catalog(p: ServiceProvider):
    data = await p.model_service.refresh_catalog()
    return success(data=data)


@router.post("/set_active")
@with_provider
@with_login("admin")
async def set_active(p: ServiceProvider):
    data = await p.model_service.set_active(p.request)
    return success(data=data)
