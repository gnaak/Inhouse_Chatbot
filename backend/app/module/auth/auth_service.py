# app/module/auth/auth_service.py
import os
import secrets
import string

from fastapi import Request
from passlib.context import CryptContext
from pydantic import EmailStr, TypeAdapter, ValidationError

from app.core.utils.logger import get_logger
from app.core.utils.response import fail, success
from app.module.admin.admin_repository import AdminRepository
from app.module.auth.auth_token import AuthToken
from app.module.directory.directory_repository import DirectoryRepository
from app.module.user.user import UserStatus
from app.module.user.user_repository import UserRepository
from app.module.request.request_repository import UserRequestRepository

def _generate_random_string(length=8):
    chars = string.ascii_letters + string.digits
    new_password =  ''.join(secrets.choice(chars) for _ in range(length))
    hashed_new_password = hash_password(new_password)
    return new_password, hashed_new_password

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

logger = get_logger(__name__)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

class AuthService:
    def __init__(self, user_repo: UserRepository, request_repo: UserRequestRepository, admin_repo: AdminRepository, directory_repo: DirectoryRepository):
        self.user_repo = user_repo
        self.request_repo = request_repo
        self.admin_repo = admin_repo
        self.directory_repo = directory_repo
        self.token_util = AuthToken()

    async def check_status(self, request: Request):
        user_id = request.user_id
        user = await self.user_repo.get_user_by_id(user_id)
        status = user.status.value
        return status 

    # 로그인 
    async def login(self, request):
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
        print(hash_password(password))
        type = body.get("type")
        if type == "user":
            user_obj = await self.user_repo.get_user_by_email(email)
        elif type == "admin":
            user_obj = await self.admin_repo.get_admin_by_email(email)
        else:
            fail("invalid type", "INVALID_TYPE", 400)
        if not user_obj or not verify_password(password, user_obj.password if type == "admin" else user_obj.password):
            fail("user does not exists", "USER_DOES_NOT_EXISTS", 404)

        if type == "user":
            if user_obj.status.value == "waiting":
                return fail(status_code=403, message="waiting")
            elif user_obj.status.value == "rejected":
                return fail(status_code=403, message="rejected")
            elif user_obj.status.value == "disabled":
                return fail(status_code=403, message="disabled")


        await self.user_repo.update_user_login(user_obj.id)
        await self.user_repo.db.commit()
        return user_obj, type

    # 리프레시 토큰 발급 
    async def get_user_by_id(self, user_id: int):
        return await self.user_repo.get_user_by_id(user_id)

    async def get_admin_by_id(self, admin_id: int):
        return await self.admin_repo.get_admin_by_id(admin_id)

    # 회원 탈퇴 -- NOT USED
    async def withdraw(self, request):
        user_id = request.user_id
        profile_dir = os.path.join("media", "profile", str(user_id))
        profile_path = os.path.join(profile_dir, "profile.jpg")
        # 프로필 이미지 삭제
        if os.path.exists(profile_path):
            try:
                os.remove(profile_path)
            except Exception:
                # 로그만 남기고 탈퇴는 계속 진행
                logger.exception("프로필 이미지 삭제 실패")

        # 디렉토리 비어있으면 폴더도 삭제
        if os.path.exists(profile_dir) and not os.listdir(profile_dir):
            os.rmdir(profile_dir)

        await self.user_repo.withdraw(user_id)


    # 회원 가입 전 이메일 유효성 검증 -- BLOG
    async def validate_email(self, request: Request) -> None:
        body = await request.json()
        email = body.get("email")

        email_adapter = TypeAdapter(EmailStr)

        try:
            email_adapter.validate_python(email)
        except ValidationError:
            return fail(message="올바른 이메일 형식이 아닙니다.", status_code=400)

        user = await self.user_repo.get_user_by_email(email)
        if user:
            if user.status == UserStatus.WAITING or user.status == UserStatus.APPROVED:
                return fail(message="이미 사용 중인 이메일입니다.", status_code=409)
            elif user.status == UserStatus.REJECTED or user.status == UserStatus.DISABLED:
                return success(status_code=200, data="retry")
        else:
            return success(status_code=200)


    # 회원 가입 
    async def register_user(self, request: Request):
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
        name = body.get("name")
        department_id = body.get("department")
        selectedIds = body.get("selectedIds")
        retry = body.get("retry")

        hashed_password = hash_password(password)
        
        # USER 테이블 처리
        # 탈퇴 처리 혹은 반려되서 재신청 넣은 사람들은 user status 업데이트 
        if retry:
            user = await self.user_repo.re_register_user(email, hashed_password, name, department_id)
            await self.user_repo.deleted_existing_request(user.id)
        else:
            user = await self.user_repo.register_user(email, hashed_password, name, department_id)

        # USER_DIRECTORY 테이블 처리 
        await self.user_repo.register_user_directory(user.id, selectedIds)

        # USER_REQUEST 테이블 처리
        request = await self.request_repo.register_user_sign_in_request(user.id)

        # USER_REQUEST_DIRECTORY 테이블 처리
        directory_names = await self.directory_repo.get_directory_name_list_by_id_list(selectedIds)
        await self.request_repo.register_user_request_directory(request.id, selectedIds, directory_names)

        await self.user_repo.db.commit()

    
    # 사용자 계정 상태 변경 
    async def update_user_status(self, request: Request):
        body = await request.json()
        user_id = body.get("user_id")
        status = body.get("status")

        await self.user_repo.update_user_status(user_id, status)
        
        await self.user_repo.db.commit()
        return success(status_code=201)
    
    # 사용자 계정 상태 변경하는데, 아니 이런 계정 생성 요청이 있잖아?
    async def update_user_sign_in_request(self, request: Request):
        body = await request.json()
        user_id = body.get("user_id")
        request_id = body.get("requestId")
        selected_ids = body.get("selectedIds")
        await self.user_repo.update_user_directory_with_sign_in(user_id, selected_ids)
        await self.request_repo.update_user_sign_in_request(user_id, request_id)
        await self.user_repo.update_user_status(user_id, "approved")
        
        await self.user_repo.db.commit()
        return success(status_code=201)

    # 비밀번호 변경 
    async def change_password(self, request: Request):
        body = await request.json()
        user_id = request.user_id
        current_password = body.get("password")
        new_password = body.get("newPassword")

        user = await self.user_repo.get_user_by_id(user_id)
        if not verify_password(current_password, user.password):
            return fail(status_code=400, message="비밀번호가 일치하지 않습니다.")
        
        else:
            hashed_password = hash_password(new_password)
            await self.user_repo.reset_user_password(user_id, hashed_password)


    # 비밀번호 초기화 요청 
    async def reset_user_password(self, request: Request):
        body = await request.json()
        user_id = body.get("user_id")
        new_password, hashed_new_password = _generate_random_string(8)
        await self.user_repo.reset_user_password(user_id, hashed_new_password)
        await self.user_repo.update_user_reset_password_request(user_id)
        return new_password
    
    
    # 계정 생성 및 디렉토리 추가 권한 요청 
    async def update_user_directory(self, request: Request):
        body = await request.json()
        
        user_id = body.get("user_id")
        waiting = body.get("waiting")
        selected_ids = body.get("selectedIds")

        # 승인 대기 상태였으면 승인 완료로 변경 
        if waiting:
            await self.user_repo.update_user_status(user_id, "approved")
        
        # # USER_DIRECTORY 테이블 처리 -> 체크한거 다 승인 / 체크 안한거 다 거절 
        await self.user_repo.update_user_directory(user_id, selected_ids)
        
        # USER_REQUEST 테이블 처리 
        # USER_REQUEST에 계정 생성이 있었는지 확인 
        request_id = await self.request_repo.check_user_sign_in_request(user_id)
        if request_id:
            await self.request_repo.update_user_sign_in_request(user_id, request_id)
            await self.user_repo.update_user_status(user_id, "approved")
        
        # 계정 생성 요청이 없었을 때는 그냥 REQUEST_DIRECTORY들만 돌면서 확인
        else:
            await self.request_repo.update_user_directory_requests(user_id,selected_ids)
        
        await self.user_repo.db.commit()