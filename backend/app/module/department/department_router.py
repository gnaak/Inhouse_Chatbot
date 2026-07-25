# app/module/department/department_router.py

from fastapi import APIRouter

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import success

router = APIRouter()


@router.get("/department_list")
@with_provider
async def get_department_list(p: ServiceProvider):
    data = await p.department_service.get_department_list()
    return success(data=data, message="successfully got department list", status_code=200)
