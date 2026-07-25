from fastapi import APIRouter

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import success

router = APIRouter()

@router.get("/waiting_requests")
@with_provider
@with_login("admin")
async def get_waiting_requests(p: ServiceProvider):
    data= await p.request_service.get_waiting_requests()
    return success(data=data)

@router.get("/request_list")
@with_provider
@with_login("admin")
async def get_request_list(p: ServiceProvider):
    requests = await p.request_service.get_request_list(p.request)
    return success(data=requests)