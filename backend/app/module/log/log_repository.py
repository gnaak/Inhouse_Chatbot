# app/module/log/log_repository.py

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import raiseload

from app.core.database.base import now_kst
from app.module.log.log import Log, LogDetail
from app.module.user.user import User


def _parse_date(d: Optional[str]):
    if not d:
        return None
    d = d.replace(".", "-")
    return datetime.strptime(d, "%Y-%m-%d")

class LogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_log_list(
            self,
            page: int,
            search_value: str,
            row_count: int,
            directory: str,
            start: int,
            end: int,
            llm: str = "",
        ):

        page = max(page or 1, 1)
        row_count = min(max(row_count or 12, 1), 100)
        conditions = []
        sv = (search_value or "").strip()
        if sv:
            conditions.append(
                or_(
                    User.name.ilike(f"%{sv}%"),
                    User.email.ilike(f"%{sv}%"),
                )
            )
        start_date = _parse_date(start)
        end_date = _parse_date(end)

        if start_date:
            conditions.append(Log.created_at >= start_date)
        if end_date:
            conditions.append(Log.created_at < (end_date + timedelta(days=1)))

        if directory:
            conditions.append(Log.name == directory)

        if llm == "internal":
            conditions.append(Log.log_type == "chat")
            conditions.append(Log.directory_id.isnot(None))
        elif llm == "external":
            conditions.append(Log.log_type == "chat")
            conditions.append(Log.directory_id.is_(None))
        elif llm == "image":
            conditions.append(Log.log_type == "image")

        count_stmt = (
            select(func.count())
            .select_from(Log)
            .join(User, Log.user_id == User.id)
        )

        if conditions:
            count_stmt = count_stmt.where(*conditions)
    
        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            select(
                Log.id,
                Log.name.label("directory_name"),
                Log.created_at,
                Log.version,
                Log.is_deleted,
                Log.deleted_at,
                User.name,
                User.email
            )
            .join(User, Log.user_id == User.id)
            .order_by(Log.created_at.desc())
            .offset((page - 1) * row_count)
            .limit(row_count)
        )

        if conditions:
            stmt = stmt.where(*conditions)
        
        result = await self.db.execute(stmt)
        rows_raw = result.all()

        return rows_raw, int(total)
    
    async def get_log_detail(self, log_id):
        result = await self.db.execute(
            select(LogDetail)
            .where(LogDetail.log_id == log_id)
        )

        log_details = result.scalars().all()
        return log_details

    # 채팅 파일의 소유권. 파일 테이블이 따로 없어서 로그로 역추적한다 —
    # 첨부는 image_key 에, 생성 산출물은 답변 본문의 다운로드 링크에 키가 남는다.
    async def user_owns_chat_file(self, user_id: int, needle: str) -> bool:
        pattern = f"%{needle}%"
        result = await self.db.execute(
            select(LogDetail.id)
            .join(Log, Log.id == LogDetail.log_id)
            .where(
                Log.user_id == user_id,
                or_(LogDetail.image_key.like(pattern), LogDetail.answer.like(pattern)),
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_log_by_id_for_user(self, log_id: int, user_id: int):
        result = await self.db.execute(
            select(Log).where(Log.id == log_id, Log.user_id == user_id, Log.is_deleted == False)
        )
        return result.scalar_one_or_none()

    async def update_log_title(self, log_id: int, user_id: int, title: str) -> bool:
        result = await self.db.execute(
            select(Log).where(Log.id == log_id, Log.user_id == user_id, Log.is_deleted == False)
        )
        log = result.scalar_one_or_none()
        if not log:
            return False
        log.title = title
        self.db.add(log)
        return True

    async def delete_log(self, log_id: int, user_id: int) -> bool:
        result = await self.db.execute(
            select(Log).where(Log.id == log_id, Log.user_id == user_id, Log.is_deleted == False)
        )
        log = result.scalar_one_or_none()
        if not log:
            return False
        log.is_deleted = True
        log.deleted_at = now_kst()
        return True

    async def get_log_by_session_for_user(self, session: str, user_id: int):
        result = await self.db.execute(
            select(Log)
            .where(Log.session == session, Log.user_id == user_id, Log.is_deleted == False)
            .order_by(Log.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_log_details_ordered(self, log_id: int):
        result = await self.db.execute(
            select(LogDetail)
            .where(LogDetail.log_id == log_id)
            .order_by(LogDetail.created_at.asc(), LogDetail.id.asc())
        )
        return result.scalars().all()

    async def search_user_logs(self, user_id: int, query: str, limit: int = 30):
        first_detail_subq = (
            select(
                LogDetail.log_id,
                func.min(LogDetail.id).label("first_id"),
            )
            .group_by(LogDetail.log_id)
            .subquery()
        )

        like = f"%{query}%"
        match_subq = (
            select(LogDetail.log_id)
            .where(or_(LogDetail.question.ilike(like), LogDetail.answer.ilike(like)))
            .distinct()
            .subquery()
        )

        result = await self.db.execute(
            select(
                Log.id,
                Log.session,
                Log.name,
                Log.title,
                Log.directory_id,
                Log.log_type,
                Log.updated_at,
                Log.created_at,
                LogDetail.question.label("first_question"),
            )
            .join(first_detail_subq, first_detail_subq.c.log_id == Log.id)
            .join(LogDetail, LogDetail.id == first_detail_subq.c.first_id)
            .join(match_subq, match_subq.c.log_id == Log.id)
            .where(Log.user_id == user_id, Log.is_deleted == False)
            .order_by(func.coalesce(Log.updated_at, Log.created_at).desc())
            .limit(limit)
        )
        return result.all()

    async def get_user_image_details(
        self, user_id: int, limit: int = 50, offset: int = 0
    ):
        """이미지 갤러리용 — log_type='image' 인 LogDetail 들을 최신순으로."""
        result = await self.db.execute(
            select(
                LogDetail.id,
                LogDetail.question,
                LogDetail.answer,
                LogDetail.created_at,
                LogDetail.version,
                Log.session,
                Log.id.label("log_id"),
            )
            .join(Log, LogDetail.log_id == Log.id)
            .where(Log.user_id == user_id, Log.log_type == "image", Log.is_deleted == False)
            .order_by(LogDetail.created_at.desc(), LogDetail.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return result.all()

    async def count_user_image_details(self, user_id: int) -> int:
        result = await self.db.execute(
            select(func.count(LogDetail.id))
            .join(Log, LogDetail.log_id == Log.id)
            .where(Log.user_id == user_id, Log.log_type == "image", Log.is_deleted == False)
        )
        return int(result.scalar_one())

    async def get_user_recent_logs(self, user_id: int, limit: int = 20, start_date=None, end_date=None):
        from datetime import datetime, timedelta

        first_detail_subq = (
            select(
                LogDetail.log_id,
                func.min(LogDetail.id).label("first_id"),
            )
            .group_by(LogDetail.log_id)
            .subquery()
        )

        date_col = func.coalesce(Log.updated_at, Log.created_at)
        filters = [Log.user_id == user_id, Log.is_deleted == False]
        if start_date:
            filters.append(date_col >= datetime.strptime(start_date, "%Y-%m-%d"))
        if end_date:
            filters.append(date_col < datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1))

        result = await self.db.execute(
            select(
                Log.id,
                Log.session,
                Log.name,
                Log.title,
                Log.directory_id,
                Log.log_type,
                Log.updated_at,
                Log.created_at,
                LogDetail.question.label("first_question"),
            )
            .join(first_detail_subq, first_detail_subq.c.log_id == Log.id)
            .join(LogDetail, LogDetail.id == first_detail_subq.c.first_id)
            .where(*filters)
            .order_by(date_col.desc())
            .limit(limit)
        )
        return result.all()

    async def get_recent_logs(self, user_id: int, directory_id: int, directory_version: int):
        result = await self.db.execute(
            select(LogDetail)
            .join(Log)
            .where(
                Log.user_id == user_id,
                Log.directory_id == directory_id,
                Log.directory_version == directory_version,
                Log.is_deleted == False
            )
            .order_by(LogDetail.created_at.desc())
            .limit(20)
        )
        return list(reversed(result.scalars().all()))

    async def get_or_create_log(self, name: str, version: str, session: str, user_id: int, directory_id: int, directory_version: int, log_type: str = 'chat') -> int:
        conditions = [
            Log.session == session,
            Log.user_id == user_id,
            Log.is_deleted == False,
        ]
        if directory_id is None:
            conditions.append(Log.directory_id.is_(None))
        else:
            conditions.append(Log.directory_id == directory_id)
        if directory_version is None:
            conditions.append(Log.directory_version.is_(None))
        else:
            conditions.append(Log.directory_version == directory_version)

        result = await self.db.execute(
            select(Log).options(raiseload(Log.log_details)).where(*conditions)
        )

        log = result.scalar_one_or_none()
        if log:
            log.version = version
            log.updated_at = now_kst()
            self.db.add(log)
            return log.id

        else:
            log = Log(
                name = name,
                version = version,
                session = session,
                log_type = log_type,
                created_at = now_kst(),
                updated_at = now_kst(),
                user_id = user_id,
                directory_id = directory_id,
                directory_version = directory_version
            )

            self.db.add(log)
            await self.db.flush()

            return log.id
        
    async def create_log_detail(self, question: str, answer: str, log_id: int, version: str | None = None, image_base64: str | None = None, image_media_type: str | None = None, question_created_at=None, image_key: str | None = None) -> None:
        log_detail = LogDetail(
            question=question,
            answer=answer,
            log_id=log_id,
            version=version,
            image_base64=image_base64,
            image_media_type=image_media_type,
            question_created_at=question_created_at,
            image_key=image_key,
        )

        self.db.add(log_detail)
        await self.db.flush()