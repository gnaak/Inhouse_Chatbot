# app/module/user/user_service.py

from fastapi import Request

from app.core.utils.response import fail
from app.module.user.user import UserDirectoryStatus
from app.module.request.request_repository import UserRequestRepository
from app.module.department.department import Department

def build_department_path(department: Department):
    path = []
    current = department

    while current:
        path.append(current)
        current = current.parent

    path.reverse()

    return path

class UserRequestService:
    def __init__(self, request_repo: UserRequestRepository):
        self.request_repo = request_repo

    async def get_waiting_requests(self):
        return await self.request_repo.get_waiting_requests()
    
    # 요청 처리 테이블
    async def get_request_list(self, request: Request):
        query_params = request.query_params
        page = int(query_params.get("page", 1))
        row_count = int(query_params.get("row_count", 12))
        search_value = query_params.get("search_value", "")
        status = query_params.get("search_type", "")
        department = query_params.get("department_type", "")

        requests, total, condition_total, waiting_total = await self.request_repo.get_request_list(page, search_value, row_count, status, department)
        
        request_list = []
        for request in requests:

            department_path = []
            if request.user.department:
                department_path = build_department_path(request.user.department)

            directory_list = [
                {
                    "directory_id": d.directory_id,
                    "directory_name": d.directory_name_snapshot,
                }
                for d in request.directories
            ]

            user_directory_list = [
                {
                    "directory_id": ud.directory_id,
                    "directory_name": ud.directory.name,
                    "status": ud.status,
                    "created_at": ud.created_at,
                    "approved_at": ud.approved_at
                }
                for ud in request.user.user_directories
                if ud.status == UserDirectoryStatus.APPROVED
            ]

            request_list.append({
                "id": request.id,
                "user_id": request.user.id,
                "name": request.user.name,
                "email": request.user.email,
                "type": request.type,
                "status": request.status,
                "user_directories": user_directory_list,
                "user_status": request.user.status,
                "department": request.user.department.name,
                "department_full_name": " > ".join([d.name for d in department_path]),
                "created_at": request.created_at,
                "approved_at": request.approved_at if request.approved_at else None,        
                "directories": directory_list,   

            })  
        return { "request_list": request_list, "total": total, "condition_total": condition_total, "waiting_total": waiting_total }
