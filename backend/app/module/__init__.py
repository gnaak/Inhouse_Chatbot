# app/module/__init__.py
from fastapi import FastAPI

# --- 라우터 등록 함수 ---
from app.module.auth import auth_router
from app.module.admin import admin_router
from app.module.user import user_router
from app.module.request import request_router
from app.module.directory import directory_router
from app.module.department import department_router
from app.module.log import log_router
from app.module.chat import chat_router
from app.module.image import image_router
from app.module.models import model_router

# --- 모델 등록 (SQLAlchemy 관계 인식용) ---
from app.module.admin.admin import Admin
from app.module.department.department import Department
from app.module.user.user import User, UserDirectory
from app.module.user.user_setting import UserSetting
from app.module.models.model import Model, UserModel
from app.module.request.request import UserRequest, UserRequestDirectory
from app.module.directory.directory import (Directory, LearningFile,
                                            LearningText)
from app.module.log.log import Log, LogDetail

def register_routers(app: FastAPI):
    """모든 도메인 라우터를 FastAPI 인스턴스에 등록"""
    app.include_router(auth_router.router, prefix="/api/auth")
    app.include_router(admin_router.router, prefix="/api/admin")
    app.include_router(user_router.router, prefix="/api/user")
    app.include_router(request_router.router, prefix="/api/request")
    app.include_router(directory_router.router, prefix="/api/directory")
    app.include_router(department_router.router, prefix="/api/department")
    app.include_router(log_router.router, prefix="/api/log")
    app.include_router(chat_router.router, prefix="/api/chat")
    app.include_router(image_router.router, prefix="/api/image")
    app.include_router(model_router.router, prefix="/api/models")
