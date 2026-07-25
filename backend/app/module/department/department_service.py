# app/module/department/department_service.py

from fastapi import Request

from app.core.database.base import now_kst
from app.core.utils.response import fail
from app.module.department.department_repository import DepartmentRepository

class DepartmentService:
    def __init__(self, department_repo: DepartmentRepository):
        self.department_repo = department_repo

    async def get_department_list(self):
        return await self.department_repo.get_department_list()