# app/module/user/user_repository.py

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database.base import now_kst
from app.core.utils.response import fail
from app.module.directory.directory import Directory
from app.module.request.request import (UserRequest, UserRequestDirectory,
                                        UserRequestStatus, UserRequestType)
from app.module.user.user import (User, UserDirectory, UserDirectoryStatus,
                                  UserStatus)

from app.module.department.department import Department

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id)
            .options(
                selectinload(User.department)
                .selectinload(Department.parent)
                .selectinload(Department.parent)
                .selectinload(Department.parent)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def update_user_login(self, user_id: int):
        result = await self.db.execute(
            select(User)
            .where(User.id == user_id)
        )
        
        user = result.scalar_one_or_none()
        if user:
            user.last_login_at = now_kst()
        
        await self.db.commit()

    # NOT USED
    async def withdraw(self, user_id: int):
        await self.db.execute(delete(User).where(User.id==user_id))
        await self.db.commit()


    # =============================================================# 
    #                      사용자 -> 관리자                          # 
    # =============================================================# 

    # 회원 가입
    async def register_user(self, email: str, password: str, name: str, department_id: int):
        user = User(
            email = email,
            password = password,
            name = name,
            department_id = department_id,
            status = "waiting"
        )

        self.db.add(user)
        await self.db.flush()
        return user

    # 반려 혹은 탈퇴 처리된 사용자 재가입 신청
    async def re_register_user(self, email: str, password: str, name: str, department_id:int):
        result = await self.db.execute(
            select(User)
            .where(User.email == email)
        )

        user = result.scalar_one_or_none()
        if user:
            user.password = password
            user.name = name
            user.department_id = department_id
        
        return user
    
    # 반려 혹은 탈퇴 처리된 사용자 재가입 신청 시, 기존 DATA 삭제
    async def deleted_existing_request(self, user_id: int):
        await self.db.execute(
            delete(UserDirectory)
            .where(UserDirectory.user_id == user_id)
        )

        await self.db.execute(
            delete(UserRequest)
            .where(UserRequest.user_id == user_id)
        )

    # USER DIRECTORY 테이블 추가 
    async def register_user_directory(self, user_id: int, directory_ids: List[int]):
        user_directory = [
            UserDirectory(
                user_id=user_id,
                directory_id=directory_id,
                status="waiting"
            )
            for directory_id in directory_ids
        ]

        self.db.add_all(user_directory)
        await self.db.flush()

    # 디렉토리 권한 요청 -> USER DIRECTORY / USER REQUEST DIRECTORY는 위 함수들 사용 
    async def register_user_directory_request(self, user_id: int):
        user_request = UserRequest(
                user_id=user_id,
                status=UserRequestStatus.WAITING,
                type=UserRequestType.DIRECTORY
            )

        self.db.add(user_request)
        await self.db.flush()
        return user_request

    # 비밀번호 초기화 요청 
    async def register_user_reset_password(self, user: User):
        result = await self.db.execute(
            select(UserRequest)
            .where(
                UserRequest.user_id == user.id,
                UserRequest.type == "password",
                UserRequest.status == "waiting"
            )
        )

        user_request = result.scalar_one_or_none()
        if user_request:
            return fail(message="비밀번호 초기화 요청이 존재합니다.", status_code=409)
    
        user_reset_password_request = UserRequest(
            user_id = user.id,
            status = "waiting",
            type = "password"
        )
        self.db.add(user_reset_password_request)
        await self.db.commit()


    # =============================================================# 
    #                      사용자 -> 사용자                          # 
    # =============================================================# 

    # 사용자 접근 가능 디렉토리 조회
    # 이 사용자가 이 디렉토리를 볼 수 있는가 — 승인(APPROVED)된 매핑이 있을 때만.
    # 대기·반려·회수는 전부 "없음"으로 친다. 채팅 진입 전에 이걸로 막는다.
    async def has_directory_access(self, user_id: int, directory_id: int) -> bool:
        result = await self.db.execute(
            select(UserDirectory.id)
            .where(
                UserDirectory.user_id == user_id,
                UserDirectory.directory_id == directory_id,
                UserDirectory.status == UserDirectoryStatus.APPROVED,
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_user_directory_list(self, user_id: int):
        result = await self.db.execute(
            select(UserDirectory.directory_id, Directory.name, UserDirectory.status, UserDirectory.checked)
            .join(Directory, UserDirectory.directory_id == Directory.id )
            .where(
                UserDirectory.user_id == user_id,
            )   
            .order_by(
                UserDirectory.approved_at.desc(),
                Directory.name.desc()
            )
        )

        rows = result.all()
        return [
            {"id": directory_id, "name": name, "status": status, "checked": checked}
            for directory_id, name, status, checked in rows
        ]
    

    # =============================================================# 
    #                      사용자 -> 서버                            # 
    # =============================================================# 

    # 유저 디렉토리 변경 사항 전체 확인 처리
    async def check_user_alert(self, user_id):
        result = await self.db.execute(
            select(UserDirectory)
            .where(
                UserDirectory.user_id == user_id,
                UserDirectory.checked == False
            )
        )

        user_directories = result.scalars().all()
        for directory in user_directories:
            directory.checked = True
        
        await self.db.commit()

    # =============================================================# 
    #                      관리자 -> 사용자                          # 
    # =============================================================# 

    # 사용자 계정 상태 변경 
    async def update_user_status(self, user_id, status):
        result = await self.db.execute(
            select(User)
            .where(User.id == user_id)
        )

        user = result.scalar_one_or_none()
        if user:
            user.status = status
        
        await self.db.flush()

    # 계정 생성 및 디렉토리 추가 요청 처리 

    # USER DIRECTORY 상태 변경
    async def update_user_directory(self, user_id, selected_ids):
        selected_set = set(selected_ids)

        result = await self.db.execute(
            select(UserDirectory)
            .where(
                UserDirectory.user_id == user_id,
            )
        )

        user_directories = result.scalars().all()
        current_map = {user_directory.directory_id: user_directory for user_directory in user_directories}
        current_ids = set(current_map.keys())

        to_create = selected_set - current_ids
        for directory_id in to_create:
            self.db.add(
                UserDirectory(
                    user_id=user_id,
                    directory_id=directory_id,
                    status=UserDirectoryStatus.APPROVED,
                    approved_at=now_kst(),
                )
            )

    
        for directory_id, ud in current_map.items():
            if directory_id == 1 :
                continue 

            # 선택된 경우 → APPROVED
            if directory_id in selected_set:
                if ud.status != UserDirectoryStatus.APPROVED:
                    ud.status = UserDirectoryStatus.APPROVED
                    ud.approved_at = now_kst()

            # 선택 안 된 경우 → REJECTED
            else:
                if ud.status == UserDirectoryStatus.APPROVED:
                    ud.status = UserDirectoryStatus.REVOKED
                    ud.checked = False
                else:
                    ud.status = UserDirectoryStatus.REJECTED
                    ud.checked = False


        await self.db.flush()


    # 디렉토리 요청 처리 시 USER REQUEST 상태 변경
    async def update_user_directory_request(self, request_id, selected_ids, requested_ids):
        result = await self.db.execute(
            select(UserRequest)
            .where(UserRequest.id == request_id)
        )

        request = result.scalar_one_or_none()
        if not request:
            return None

        requested_set = set(requested_ids)
        selected_set = set(selected_ids)

        intersection = requested_set & selected_set

        if not intersection:
            request.status = UserRequestStatus.REJECTED

        elif requested_set.issubset(selected_set):
            request.status = UserRequestStatus.APPROVED
            request.approved_at = now_kst()

        else:
            request.status = UserRequestStatus.PARTIAL
            request.approved_at = now_kst()

        await self.db.commit()
        return request

    # 비밀번호 초기화 요청 처리
    async def reset_user_password(self, user_id: int, hashed_new_password: str):
        result = await self.db.execute(
            select(User)
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.password = hashed_new_password
        await self.db.commit()

    # 비밀번호 초기화 후 USER REQUEST 상태 변경
    async def update_user_reset_password_request(self, user_id: int):
        result = await self.db.execute(
            select(UserRequest)
            .where(
                UserRequest.user_id == user_id,
                UserRequest.type == UserRequestType.PASSWORD,
                UserRequest.status == UserRequestStatus.WAITING
            )
        )

        request = result.scalar_one_or_none()
        request.status = UserRequestStatus.APPROVED
        request.approved_at = now_kst()

        await self.db.commit()


    # 유저 상세 페이지 --> 계정 승인은 따로 처리하자~
    async def update_user_directory_with_sign_in(self, user_id, selected_ids):
        selected_set = set(selected_ids)

        result = await self.db.execute(
            select(UserDirectory)
            .where(
                UserDirectory.user_id == user_id,
            )
        )

        user_directories = result.scalars().all()
        current_map = {user_directory.directory_id: user_directory for user_directory in user_directories}

        for directory_id, ud in current_map.items():
            if directory_id == 1 :
                continue 
            
            # 선택된 경우 → APPROVED
            if directory_id in selected_set:
                if ud.status != UserDirectoryStatus.APPROVED:
                    ud.status = UserDirectoryStatus.APPROVED
                    ud.approved_at = now_kst()

            # 선택 안 된 경우 → REJECTED
            else:
                ud.status = UserDirectoryStatus.REJECTED
                ud.checked = False

        await self.db.flush()

    # =============================================================# 
    #                      관리자 -> 테이블                          # 
    # =============================================================# 

    # 사용자 관리 테이블
    async def get_user_list(
        self,
        page: int = 1,
        search_value: Optional[str] = "",
        row_count: Optional[int] = 12,
        status: Optional[str] = "",
        department: Optional[str] = "",
    ) -> Tuple[List[dict], int]:

        conditions = []

        sv = (search_value or "").strip()
        if sv:
            conditions.append(
                or_(
                    User.name.ilike(f"%{sv}%"),
                    User.email.ilike(f"%{sv}%"),
                )
            )

        if status: 
            conditions.append(User.status == status)

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

        count_stmt = select(func.count()).select_from(User)
        if conditions:
            count_stmt = count_stmt.where(*conditions)

        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(User)
            .options(
                selectinload(User.department)
                .selectinload(Department.parent)
                .selectinload(Department.parent)
                .selectinload(Department.parent),
                selectinload(User.user_requests)
                .selectinload(UserRequest.directories),
                selectinload(User.user_directories)
                .selectinload(UserDirectory.directory)
            )
            .order_by(User.created_at.desc())
            .offset((page - 1) * row_count)
            .limit(row_count)
        )

        if conditions:
            stmt = stmt.where(*conditions)

        result = await self.db.execute(stmt)
        rows_raw = result.scalars().all()

        return rows_raw, int(total)
    
    