# app/module/request/request_repository.py

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database.base import now_kst
from app.core.utils.response import fail

from app.module.request.request import (UserRequest, UserRequestDirectory,
                                        UserRequestStatus, UserRequestType)

from app.module.user.user import User, UserDirectory, UserDirectoryStatus
from app.module.department.department import Department

class UserRequestRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_waiting_requests(self):
        waiting_stmt = select(func.count()).select_from(UserRequest).where(UserRequest.status == "waiting")
        waiting_total = (await self.db.execute(waiting_stmt)).scalar_one()
        return waiting_total
    
    # 회원 가입 시 USER REQUEST 테이블 추가
    async def register_user_sign_in_request(self, user_id: int):
        user_request = UserRequest(
                user_id=user_id,
                status="waiting",
                type="signin"
            )

        self.db.add(user_request)
        await self.db.flush()
        return user_request
    
    # USER REQUEST DIRECTORY 추가 - REQUEST_ID(FK)
    async def register_user_request_directory(self, request_id: int, directory_ids: List[int], directory_names: List[str]):
        for directory_id, directory_name in zip(directory_ids, directory_names):
            user_request_directory = UserRequestDirectory(
                request_id = request_id,
                directory_id = directory_id, 
                directory_name_snapshot = directory_name
            )

            self.db.add(user_request_directory)
        
        await self.db.flush()
 

    # 계정 생성 요청이 있는지 확인 -> 그냥 승인 대기 중이였을 수도 있음 
    async def check_user_sign_in_request(self, user_id):
        result = await self.db.execute(
            select(UserRequest)
            .where(
                UserRequest.user_id == user_id,
                UserRequest.type == UserRequestType.SIGNIN,
                UserRequest.status == UserRequestStatus.WAITING,
            )
        )

        sign_in_request = result.scalar_one_or_none()
        if sign_in_request:
            return sign_in_request.id
        return None


    # 계정 생성 요청 변경
    async def update_user_sign_in_request(self, user_id, request_id):
        # 계정은 활성화 시켰고, 회원 가입 하면서 요청한 디렉토리가 있는지 확인
        result = await self.db.execute(
            select(UserRequest)
            .where(UserRequest.id == request_id)
        )
        request = result.scalar_one_or_none()

        await self.grant_common_directory(user_id)

        # 요청하면서 보낸 DIRECTORY 요청 내역 확인  
        requested_ids = {d.directory_id for d in request.directories}
        # 현재 사용자가 승인된 디렉토리
        result = await self.db.execute(
            select(UserDirectory.directory_id)
            .where(
                UserDirectory.user_id == user_id,
                UserDirectory.status == UserDirectoryStatus.APPROVED
            )
        )

        approved_ids = {row[0] for row in result.all()}
        request.approved_at = now_kst()

        if requested_ids.issubset(approved_ids):
            request.status = UserRequestStatus.APPROVED

        else:
            request.status = UserRequestStatus.PARTIAL

        await self.db.flush()

    # 회원 가입 시 1번 (공용 디렉토리) 권한 부여
    async def grant_common_directory(self, user_id):
        common = UserDirectory(
            status = UserDirectoryStatus.APPROVED,
            created_at = now_kst(),
            approved_at = now_kst(),
            user_id = user_id,
            directory_id = 1,
        )

        self.db.add(common)
        await self.db.flush()

    # 유저 디렉토리 요청 상태 변경 
    async def update_user_directory_requests(self, user_id, selected_ids):
        result = await self.db.execute(
            select(UserRequest)
            .where(
                UserRequest.user_id == user_id,
                UserRequest.status == UserRequestStatus.WAITING,
                UserRequest.type == UserRequestType.DIRECTORY
            )
        )

        requests = result.scalars().all()

        # 승인된 디렉토리 
        selected_set = set(selected_ids or [])

        for request in requests:
            request_directory_ids = {
                directory.directory_id
                for directory in request.directories
            }

            intersection = request_directory_ids & selected_set

            if not intersection:
                request.status = UserRequestStatus.REJECTED

            elif intersection == request_directory_ids:
                request.status = UserRequestStatus.APPROVED
                request.approved_at = now_kst()

            else:
                request.status = UserRequestStatus.PARTIAL


    # 요청 처리 테이블
    async def get_request_list(
            self,
            page: int = 1,
            search_value: Optional[str] = "",
            row_count: Optional[int] = 12,
            status: Optional[str] = "",
            department: Optional[str] = "",
        ) -> Tuple[List[dict], int, int]:

        conditions = []

        sv = (search_value or "").strip()
        if sv:
            conditions.append(
                or_(
                    User.name.ilike(f"%{sv}%"),
                    User.email.ilike(f"%{sv}%"),
                )
            )
        if department:
            dept_id = int(department)

            conditions.append(
                or_(
                    User.department_id == dept_id,
                    User.department.has(
                        Department.parent_id == dept_id
                    ),
                    User.department.has(
                        Department.parent.has(
                            Department.parent_id == dept_id
                        )
                    )
                )
            )
        if status:
            conditions.append(UserRequest.status == status)

        total_stmt = select(func.count()).select_from(UserRequest)
        total = (await self.db.execute(total_stmt)).scalar_one()

        waiting_stmt = select(func.count()).select_from(UserRequest).where(UserRequest.status == "waiting")
        waiting_total = (await self.db.execute(waiting_stmt)).scalar_one()

        count_stmt = select(func.count(UserRequest.id)).join(User)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        condition_total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(UserRequest)
            .join(User)
            .options(
                selectinload(UserRequest.user)
                .selectinload(User.department)
                .selectinload(Department.parent)
                .selectinload(Department.parent)
                .selectinload(Department.parent),
                selectinload(UserRequest.user)
                .selectinload(User.user_directories)
                .selectinload(UserDirectory.directory),
                selectinload(UserRequest.directories)
                .selectinload(UserRequestDirectory.directory)

            )
            .order_by(UserRequest.created_at.desc())
            .offset((page - 1) * row_count)
            .limit(row_count)
        )

        if conditions:
            stmt = stmt.where(*conditions)

        result = await self.db.execute(stmt)
        rows_raw = result.scalars().all()

        return rows_raw, int(total), int(condition_total), int(waiting_total)

