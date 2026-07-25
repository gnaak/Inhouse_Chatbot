# app/module/user/user_service.py

from fastapi import Request

from app.core.utils.response import fail
from app.module.directory.directory_repository import DirectoryRepository
from app.module.user.user_repository import UserRepository
from app.module.request.request_repository import UserRequestRepository, UserRequestStatus
from app.module.department.department import Department

def build_department_path(department: Department):
    path = []
    current = department

    while current:
        path.append(current)
        current = current.parent

    path.reverse()

    return path

class UserService:
    def __init__(self, user_repo: UserRepository, request_repo: UserRequestRepository, directory_repo: DirectoryRepository):
        self.user_repo = user_repo
        self.request_repo = request_repo
        self.directory_repo = directory_repo

    async def get_me(self, request):
        user_id = request.user_id
        user = await self.user_repo.get_user_by_id(user_id)

        department_path = []
        if user.department:
            department_path = build_department_path(user.department)

        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "profile_image": user.profile_image,
            "department_full_name": " > ".join([d.name for d in department_path]),
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
        }
    
    # 디렉토리 추가 요청 
    async def request_directory(self, request: Request):
        body = await request.json()
        user_id = request.user_id
        selectedIds = body.get("selectedIds")

        # USER_DIRECTORY 테이블 처리 
        await self.user_repo.register_user_directory(user_id, selectedIds)

        # USER_REQUEST 테이블 처리
        request = await self.user_repo.register_user_directory_request(user_id)

        directory_names = await self.directory_repo.get_directory_name_list_by_id_list(selectedIds)
        await self.request_repo.register_user_request_directory(request.id, selectedIds, directory_names)

        await self.user_repo.db.commit()

    # 비밀번호 초기화 요청 
    async def request_reset_password(self, request: Request):
        body = await request.json()
        user_email = body.get("email")
        user = await self.user_repo.get_user_by_email(user_email)
        if user:
            await self.user_repo.register_user_reset_password(user)
        
        else: 
            return fail(message="등록된 이메일이 존재하지 않습니다.", status_code=404)
    

    # 사용자 디렉토리 조회 
    async def get_user_directory(self, request: Request):
        user_id = request.user_id
        return await self.user_repo.get_user_directory_list(user_id)
        

    # 사용자 관리 테이블 
    async def get_user_list(self, request: Request):
        query_params = request.query_params
        page = int(query_params.get("page", 1))
        row_count = int(query_params.get("row_count", 12))
        search_value = query_params.get("search_value", "")
        status = query_params.get("search_type", "")
        department = query_params.get("department_type", "")

        users, total = await self.user_repo.get_user_list(page, search_value, row_count, status, department)    
        
        user_list = []
        for user in users:
            user_directory_list = []

            department_path = []

            if user.department:
                department_path = build_department_path(user.department)

            for user_directory in user.user_directories:
                user_directory_list.append({
                    "name": user_directory.directory.name,
                    "directory_id": user_directory.directory_id,
                    "status": user_directory.status,
                    "created_at": user_directory.created_at,
                    "approved_at": user_directory.approved_at
                })

            user_request_list = []
            for user_request in user.user_requests:
                if user_request.status != UserRequestStatus.WAITING:
                    continue
                user_request_directory_list = []
                
                for directory in user_request.directories:
                    user_request_directory_list.append({
                        "id": directory.directory_id,
                        "name": directory.directory.name,
                    })

                user_request_list.append({
                    "request_id": user_request.id,
                    "type": user_request.type,
                    "directory": user_request_directory_list
                })

            user_model_list = []
            for user_model in user.user_models:
                user_model_list.append({
                    "model_id": user_model.model_id,
                    "value": user_model.model.value,
                    "label": user_model.model.label,
                    "type": user_model.model.type.value,
                })

            user_list.append({
                "id": user.id,
                "name": user.name,
                "department": user.department.name if user.department else None,
                "department_full_name": " > ".join([d.name for d in department_path]),
                "email": user.email,
                "request_list": user_request_list,
                "directory_list": user_directory_list,
                "model_list": user_model_list,
                "status": user.status,
                "created_at": user.created_at,
                "last_login_at": user.last_login_at
            })

        return { "user_list": user_list, "total": total }
    
    
    # 유저 디렉토리 변경 사항 전체 확인 처리 
    async def check_user_alert(self, request: Request):
        user_id = request.user_id
        await self.user_repo.check_user_alert(user_id)