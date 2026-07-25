# app/module/directory/directory_router.py

from urllib.parse import quote

from fastapi import APIRouter
from fastapi.responses import Response

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import fail, success
from app.core.utils.s3_utils import get_s3_object

router = APIRouter()


@router.post("/save_directory")
@with_provider
@with_login("admin")
async def save_directory(p: ServiceProvider):
    await p.directory_service.create_or_update_directory(p.request)
    return success(message="successfully saved directory", status_code=201)

@router.get("/directory_list")
@with_provider
@with_login("admin")
async def get_directory_list(p: ServiceProvider):
    data = await p.directory_service.get_directory_list()
    return success(data=data, message="successfully got directory list", status_code=200)

@router.get("/directory_detail")
@with_provider
@with_login("admin")
async def get_directory_detail(p: ServiceProvider):
    data = await p.directory_service.get_directory_detail(p.request)
    return success(data=data, message="successfully got directory detail", status_code=200 )

@router.post("/delete_directory")
@with_provider
@with_login("admin")
async def delete_directory(p: ServiceProvider):
    await p.directory_service.delete_directory(p.request)
    return success(message="successfully deleted directory", status_code=200)

@router.get("/user_directory_list")
@with_provider
async def get_directory_list(p: ServiceProvider):
    data = await p.directory_service.get_directory_list()
    return success(data=data, message="successfully got directory list", status_code=200)

@router.get("/greetings")
@with_provider
@with_login()
async def get_greetings_data(p: ServiceProvider):
    data = await p.directory_service.get_greetings_data(p.request)
    return success(data=data)

@router.post("/reorder")
@with_provider
@with_login("admin")
async def reorder_directory(p: ServiceProvider):
    await p.directory_service.reorder_directory(p.request)
    return success(status_code=201)

@router.get("/file_download")
@with_provider
@with_login("admin")
async def download_learning_file(p: ServiceProvider):
    file_id = p.request.query_params.get("file_id")
    if not file_id:
        return fail(status_code=400, message="file_id가 필요합니다.")

    lf = await p.directory_repo.get_learning_file_by_file_id(file_id)
    if not lf or not lf.s3_key:
        return fail(status_code=404, message="원본 파일이 없습니다.")

    data, content_type = await get_s3_object(lf.s3_key)
    filename = lf.file_name or "file"
    encoded = quote(filename)
    ascii_fallback = filename.encode("ascii", "ignore").decode("ascii") or "file"
    return Response(
        content=data,
        media_type=content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded}'
        },
    )