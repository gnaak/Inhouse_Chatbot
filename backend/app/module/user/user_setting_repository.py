from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database.base import now_kst
from app.module.user.user_setting import UserSetting


class UserSettingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: int) -> UserSetting | None:
        result = await self.db.execute(
            select(UserSetting).where(UserSetting.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def upsert(self, user_id: int, **fields) -> UserSetting:
        result = await self.db.execute(
            select(UserSetting).where(UserSetting.user_id == user_id)
        )
        setting = result.scalar_one_or_none()

        if setting:
            for key, value in fields.items():
                setattr(setting, key, value)
            setting.updated_at = now_kst()
        else:
            setting = UserSetting(user_id=user_id, updated_at=now_kst(), **fields)
            self.db.add(setting)

        await self.db.commit()
        return setting
