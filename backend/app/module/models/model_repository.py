from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database.base import now_kst
from app.module.models.model import Model, ModelType, UserModel


class ModelRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_type(self, model_type: ModelType) -> list[Model]:
        result = await self.db.execute(
            select(Model)
            .where(Model.type == model_type, Model.is_active == True)
            .order_by(Model.sort_order)
        )
        return result.scalars().all()

    async def get_by_type_for_user(self, model_type: ModelType, user_id: int) -> list[Model]:
        result = await self.db.execute(
            select(Model)
            .join(UserModel, UserModel.model_id == Model.id)
            .where(
                UserModel.user_id == user_id,
                Model.type == model_type,
                Model.is_active == True
            )
            .order_by(Model.sort_order)
        )
        return result.scalars().all()

    # 이 사용자가 이 모델(value 기준)을 쓸 수 있는가 — 매핑이 있고 카탈로그에서 켜져 있을 때만.
    async def is_model_allowed(self, user_id: int, value: str) -> bool:
        result = await self.db.execute(
            select(UserModel.id)
            .join(Model, Model.id == UserModel.model_id)
            .where(
                UserModel.user_id == user_id,
                Model.value == value,
                Model.is_active == True,
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_user_model_ids(self, user_id: int) -> list[int]:
        result = await self.db.execute(
            select(UserModel.model_id)
            .where(UserModel.user_id == user_id)
        )
        return result.scalars().all()

    async def update_user_models(self, user_id: int, model_ids: list[int]) -> None:
        await self.db.execute(
            UserModel.__table__.delete().where(UserModel.user_id == user_id)
        )

        if model_ids:
            for model_id in model_ids:
                user_model = UserModel(user_id=user_id, model_id=model_id)
                self.db.add(user_model)

    # ── 카탈로그 (admin AI 모델 관리) ───────────────────────────────────────

    async def get_all(self) -> list[Model]:
        result = await self.db.execute(
            select(Model).order_by(Model.provider, Model.type, Model.sort_order)
        )
        return result.scalars().all()

    async def get_by_value(self, value: str) -> Model | None:
        result = await self.db.execute(
            select(Model).where(Model.value == value)
        )
        return result.scalar_one_or_none()

    async def upsert_catalog(
        self,
        provider: str,
        model_type: ModelType,
        value: str,
        label: str,
        pricing_input: float | None,
        pricing_output: float | None,
        pricing_per_image: float | None,
    ) -> Model:
        """SDK 조회 결과를 DB로 머지. 새 모델은 INSERT, 기존 행은 메타만 갱신.
        is_active는 절대 건드리지 않음 (관리자가 토글한 상태 유지)."""
        existing = await self.get_by_value(value)
        if existing:
            existing.provider = provider
            existing.type = model_type
            existing.label = label
            existing.pricing_input = pricing_input
            existing.pricing_output = pricing_output
            existing.pricing_per_image = pricing_per_image
            existing.discovered_at = now_kst()
            self.db.add(existing)
            return existing

        max_sort = await self.db.execute(
            select(func.coalesce(func.max(Model.sort_order), 0)).where(
                Model.type == model_type
            )
        )
        next_sort = (max_sort.scalar_one() or 0) + 10

        model = Model(
            type=model_type,
            value=value,
            label=label,
            is_active=False,
            sort_order=next_sort,
            provider=provider,
            pricing_input=pricing_input,
            pricing_output=pricing_output,
            pricing_per_image=pricing_per_image,
            discovered_at=now_kst(),
        )
        self.db.add(model)
        await self.db.flush()
        return model

    async def set_active(self, value: str, active: bool) -> Model | None:
        existing = await self.get_by_value(value)
        if not existing:
            return None
        existing.is_active = active
        self.db.add(existing)
        return existing
