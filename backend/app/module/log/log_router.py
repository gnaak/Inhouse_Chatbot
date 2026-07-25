from fastapi import APIRouter

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import success

router = APIRouter()

@router.get("/log_list")
@with_provider
@with_login("admin")
async def get_log_list(p: ServiceProvider):
    users = await p.log_service.get_log_list(p.request)
    return success(data=users)

@router.get("/log_detail")
@with_provider
@with_login("admin")
async def get_log_detail(p: ServiceProvider):
    log = await p.log_service.get_log_detail(p.request)
    return success(data=log)

@router.get("/my_recent")
@with_provider
@with_login()
async def get_my_recent_logs(p: ServiceProvider):
    items = await p.log_service.get_my_recent_logs(p.request)
    return success(data=items)

@router.get("/my_images")
@with_provider
@with_login()
async def get_my_images(p: ServiceProvider):
    data = await p.log_service.get_my_images(p.request)
    return success(data=data)

@router.get("/my_log_detail")
@with_provider
@with_login()
async def get_my_log_detail(p: ServiceProvider):
    log = await p.log_service.get_my_log_detail(p.request)
    return success(data=log)

@router.get("/my_search")
@with_provider
@with_login()
async def search_my_logs(p: ServiceProvider):
    items = await p.log_service.search_my_logs(p.request)
    return success(data=items)

@router.post("/my_rename")
@with_provider
@with_login()
async def rename_my_log(p: ServiceProvider):
    res = await p.log_service.rename_my_log(p.request)
    return success(data=res)

@router.post("/my_delete")
@with_provider
@with_login()
async def delete_my_log(p: ServiceProvider):
    res = await p.log_service.delete_my_log(p.request)
    return success(data=res)