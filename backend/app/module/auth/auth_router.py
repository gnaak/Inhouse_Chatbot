# app/module/auth/auth_router.py

from fastapi import APIRouter, HTTPException

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import success

router = APIRouter()

@router.post("/login")
@with_provider
async def login(p: ServiceProvider):
    user, auth_type = await p.auth_service.login(p.request)
    response = success(message="user login successful")
    await p.auth_service.token_util.create_jwt_token(user, response, auth_type)
    return response

@router.post("/logout")
@with_provider
@with_login()
async def logout(p:ServiceProvider):
    auth_type = p.request.auth_type
    response = success(message="user logout successful")
    await p.auth_service.token_util.delete_token(response, auth_type)
    return response

@router.post("/logout_admin")
@with_provider
@with_login("admin")
async def logout_admin(p: ServiceProvider):
    auth_type = p.request.auth_type
    response = success(message="admin logout successful")
    await p.auth_service.token_util.delete_token(response, auth_type)
    return response

@router.post("/refresh_token")
@with_provider
async def refresh_token(p: ServiceProvider):
    id, _ = await p.auth_service.token_util.verify_refresh_by_type(p.request, "user")
    user = await p.auth_service.get_user_by_id(id)
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    response = success(message="user login successful")
    await p.auth_service.token_util.create_jwt_token(user, response, "user")
    return response

@router.post("/refresh_token_admin")
@with_provider
async def refresh_token_admin(p: ServiceProvider):
    id, _ = await p.auth_service.token_util.verify_refresh_by_type(p.request, "admin")
    admin = await p.admin_service.get_admin_by_id(id)
    if not admin:
        raise HTTPException(status_code=404, detail="admin not found")
    response = success(message="admin login successful")
    await p.auth_service.token_util.create_jwt_token(admin, response, "admin")
    return response

@router.post("/withdraw")
@with_provider
@with_login()
async def withdraw(p: ServiceProvider):
    await p.auth_service.withdraw(p.request)
    response = success(message="user withdrawal successful")
    await p.auth_service.token_util.delete_token(response, "user")
    return response


@router.post("/register")
@with_provider
async def register_user(p: ServiceProvider):
    await p.auth_service.register_user(p.request)
    return success(status_code=201)


@router.post("/change_password")
@with_provider
@with_login()
async def change_password(p: ServiceProvider):
    await p.auth_service.change_password(p.request)
    return success(status_code=201)

@router.post("/reset_password")
@with_provider
@with_login("admin")
async def reset_user_password(p: ServiceProvider):
    new_password = await p.auth_service.reset_user_password(p.request)
    return success(status_code=201, data=new_password)

@router.post("/update_user_directory")
@with_provider
@with_login("admin")
async def update_user_directory(p: ServiceProvider):
    await p.auth_service.update_user_directory(p.request)
    return success(status_code=201)


@router.post("/validate_email")
@with_provider
async def validate_email(p: ServiceProvider):
    return await p.auth_service.validate_email(p.request)

@router.post("/update_user_status")
@with_provider
@with_login("admin")
async def update_user_status(p: ServiceProvider):
    return await p.auth_service.update_user_status(p.request)

@router.post("/update_user_sign_in_request")
@with_provider
@with_login("admin")
async def update_user_sign_in_request(p: ServiceProvider):
    return await p.auth_service.update_user_sign_in_request(p.request)

@router.get("/check_status")
@with_provider
@with_login()
async def check_status(p: ServiceProvider):
    status = await p.auth_service.check_status(p.request)
    return success(data=status)