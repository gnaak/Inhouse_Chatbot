from fastapi import Request

from app.module.user.user_setting_repository import UserSettingRepository

DEFAULTS = {
    "chat_instructions": "",
    "chat_model": "gpt-5.5",
    "chat_tone": "neutral",
    "chat_length": "normal",
    "chat_language": "ko",
    "image_instructions": "",
    "image_model": "gpt-image",
}


class UserSettingService:
    def __init__(self, user_setting_repo: UserSettingRepository):
        self.user_setting_repo = user_setting_repo

    async def get_settings(self, request: Request) -> dict:
        user_id = request.user_id
        setting = await self.user_setting_repo.get_by_user_id(user_id)
        if not setting:
            return DEFAULTS

        return {
            "chat_instructions": setting.chat_instructions or "",
            "chat_model": setting.chat_model,
            "chat_tone": setting.chat_tone,
            "chat_length": setting.chat_length,
            "chat_language": setting.chat_language,
            "image_instructions": setting.image_instructions or "",
            "image_model": setting.image_model,
        }

    async def save_settings(self, request: Request):
        user_id = request.user_id
        body = await request.json()

        allowed = {k for k in DEFAULTS}
        fields = {k: v for k, v in body.items() if k in allowed}

        await self.user_setting_repo.upsert(user_id, **fields)
