from fastapi import APIRouter

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import success

router = APIRouter()

@router.get("/me")
@with_provider
@with_login()
async def get_me(p: ServiceProvider):
    user = await p.user_service.get_me(p.request)
    return success(data=user)

@router.post("/request_directory")
@with_provider
@with_login()
async def request_directory(p: ServiceProvider):
    await p.user_service.request_directory(p.request)
    return success(status_code=201)

@router.post("/request_reset_password")
@with_provider
async def request_reset_password(p: ServiceProvider):
    await p.user_service.request_reset_password(p.request)
    return success(status_code=201)

@router.get("/get_user_directory")
@with_provider
@with_login()
async def get_user_directory(p: ServiceProvider):
    directory = await p.user_service.get_user_directory(p.request)
    return success(data=directory)

@router.get("/user_list")
@with_provider
@with_login("admin")
async def get_user_list(p: ServiceProvider):
    users = await p.user_service.get_user_list(p.request)
    return success(data=users)

@router.post("/check_user_alert")
@with_provider
@with_login()
async def check_user_alert(p: ServiceProvider):
    await p.user_service.check_user_alert(p.request)
    return success(status_code=201)

@router.get("/settings")
@with_provider
@with_login()
async def get_user_settings(p: ServiceProvider):
    data = await p.user_setting_service.get_settings(p.request)
    return success(data=data)

@router.post("/settings")
@with_provider
@with_login()
async def save_user_settings(p: ServiceProvider):
    await p.user_setting_service.save_settings(p.request)
    return success(status_code=201)