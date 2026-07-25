from collections import defaultdict

from fastapi import HTTPException, Request

from app.module.models.model import Model, ModelType
from app.module.models.model_discovery import discover_all
from app.module.models.model_repository import ModelRepository


PROVIDER_LABELS = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "gemini": "Google Gemini",
}


def _serialize_model(m: Model) -> dict:
    if m.type == ModelType.IMAGE:
        pricing = (
            {"per_image": m.pricing_per_image}
            if m.pricing_per_image is not None
            else None
        )
    else:
        if m.pricing_input is not None and m.pricing_output is not None:
            pricing = {"input": m.pricing_input, "output": m.pricing_output}
        else:
            pricing = None

    return {
        "id": m.id,
        "value": m.value,
        "label": m.label,
        "pricing": pricing,
        "registered": bool(m.is_active),
    }


class ModelService:
    def __init__(self, model_repo: ModelRepository):
        self.model_repo = model_repo

    async def get_chat_models(self, user_id: int) -> list[dict]:
        models = await self.model_repo.get_by_type_for_user(ModelType.CHAT, user_id)
        return [{"value": m.value, "label": m.label} for m in models]

    async def get_image_models(self, user_id: int) -> list[dict]:
        models = await self.model_repo.get_by_type_for_user(ModelType.IMAGE, user_id)
        return [{"value": m.value, "label": m.label} for m in models]

    async def get_all_models(self) -> dict:
        chat = await self.model_repo.get_by_type(ModelType.CHAT)
        image = await self.model_repo.get_by_type(ModelType.IMAGE)
        return {
            "chat": [{"id": m.id, "value": m.value, "label": m.label} for m in chat],
            "image": [{"id": m.id, "value": m.value, "label": m.label} for m in image],
        }

    async def update_user_models(self, request: Request) -> None:
        body = await request.json()
        user_id = body.get("user_id")
        model_ids = body.get("model_ids", [])
        await self.model_repo.update_user_models(user_id, model_ids)
        await self.model_repo.db.commit()

    # ── 카탈로그 (admin AI 모델 관리) ────────────────────────────────────

    async def get_catalog(self) -> list[dict]:
        """DB에 저장된 카탈로그를 프로바이더 단위로 묶어 반환."""
        rows = await self.model_repo.get_all()

        grouped: dict[str, dict[str, list[dict]]] = defaultdict(
            lambda: {"chat": [], "image": []}
        )
        for m in rows:
            provider = m.provider or "unknown"
            kind = "chat" if m.type == ModelType.CHAT else "image"
            grouped[provider][kind].append(_serialize_model(m))

        order = ["openai", "anthropic", "gemini"]
        result = []
        for prov in order:
            if prov in grouped:
                result.append({
                    "provider": prov,
                    "label": PROVIDER_LABELS.get(prov, prov),
                    "chat": grouped[prov]["chat"],
                    "image": grouped[prov]["image"],
                })
        for prov, data in grouped.items():
            if prov not in order:
                result.append({
                    "provider": prov,
                    "label": PROVIDER_LABELS.get(prov, prov),
                    **data,
                })
        return result

    async def refresh_catalog(self) -> dict:
        """SDK에서 최신 모델 목록을 조회만 하고 반환. DB 저장 없음."""
        providers = await discover_all()

        existing_models = await self.model_repo.get_all()
        existing_map = {m.value: m for m in existing_models}

        added = 0
        updated = 0
        catalog = []

        order = ["openai", "anthropic", "gemini"]
        provider_map = {block["provider"]: block for block in providers}

        for prov in [*order, *[p for p in provider_map if p not in order]]:
            if prov not in provider_map:
                continue
            block = provider_map[prov]
            entry: dict = {
                "provider": prov,
                "label": PROVIDER_LABELS.get(prov, prov),
                "chat": [],
                "image": [],
            }
            if block.get("error"):
                entry["error"] = block["error"]
            for kind in ("chat", "image"):
                for item in block.get(kind, []):
                    db_m = existing_map.get(item["value"])
                    if db_m:
                        updated += 1
                        pricing = _serialize_model(db_m)["pricing"]
                        registered = bool(db_m.is_active)
                        model_id = db_m.id
                    else:
                        added += 1
                        raw = item.get("pricing") or {}
                        if kind == "image":
                            pricing = {"per_image": raw["per_image"]} if raw.get("per_image") is not None else None
                        else:
                            pricing = {"input": raw["input"], "output": raw["output"]} if raw.get("input") is not None else None
                        registered = False
                        model_id = 0
                    entry[kind].append({
                        "id": model_id,
                        "value": item["value"],
                        "label": item.get("label") or item["value"],
                        "pricing": pricing,
                        "registered": registered,
                    })
            catalog.append(entry)

        return {"added": added, "updated": updated, "catalog": catalog}

    async def set_active(self, request: Request) -> dict:
        body = await request.json()
        value = (body.get("value") or "").strip()
        active = bool(body.get("active"))
        if not value:
            raise HTTPException(status_code=400, detail="모델 value가 필요합니다.")
        model = await self.model_repo.set_active(value, active)
        if not model:
            raise HTTPException(status_code=404, detail="해당 모델을 찾을 수 없습니다.")
        await self.model_repo.db.commit()
        return {"value": model.value, "active": model.is_active}
