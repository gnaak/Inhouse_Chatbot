import base64
import io
import json

from google.genai import types as genai_types

from app.core.utils.logger import get_logger
from app.module.infra.gemini.chat_service import client

logger = get_logger(__name__)


def _friendly(model: str, exc: Exception) -> str:
    msg = str(exc)
    if "not found" in msg.lower() or "does not exist" in msg.lower():
        return f"'{model}' 모델은 현재 이미지 생성에 사용할 수 없습니다. 관리자에게 문의해주세요."
    return "이미지 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."


class GeminiImageService:
    async def generate_stream(self, prompt: str, model: str = "imagen-3.0-generate-002"):
        try:
            if model.startswith("imagen-"):
                async for chunk in self._imagen(prompt, model):
                    yield chunk
            else:
                async for chunk in self._gemini_native(prompt, model):
                    yield chunk
        except Exception as e:
            logger.exception("Gemini image generation failed (model=%s)", model)
            yield json.dumps({"error": _friendly(model, e)}) + "\n"

    async def _imagen(self, prompt: str, model: str):
        response = await client.aio.models.generate_images(
            model=model,
            prompt=prompt,
            config=genai_types.GenerateImagesConfig(number_of_images=1),
        )
        if response.generated_images:
            image_bytes = response.generated_images[0].image.image_bytes
            b64 = base64.b64encode(image_bytes).decode()
            yield json.dumps({"index": 0, "data": b64}) + "\n"

    async def edit_stream(self, image_bytes: bytes, prompt: str, model: str):
        try:
            image_part = genai_types.Part.from_bytes(data=image_bytes, mime_type="image/png")
            contents = [image_part, prompt]
            config = genai_types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            )
            response = await client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
            for cand in getattr(response, "candidates", None) or []:
                content = getattr(cand, "content", None)
                if not content:
                    continue
                for part in getattr(content, "parts", None) or []:
                    inline = getattr(part, "inline_data", None)
                    if inline and getattr(inline, "data", None):
                        raw = inline.data
                        b64 = raw if isinstance(raw, str) else base64.b64encode(raw).decode()
                        yield json.dumps({"index": 0, "data": b64}) + "\n"
        except Exception as e:
            logger.exception("Gemini image edit failed (model=%s)", model)
            yield json.dumps({"error": _friendly(model, e)}) + "\n"

    async def _gemini_native(self, prompt: str, model: str):
        config = genai_types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        )
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        for cand in getattr(response, "candidates", None) or []:
            content = getattr(cand, "content", None)
            if not content:
                continue
            for part in getattr(content, "parts", None) or []:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    raw = inline.data
                    b64 = (
                        raw
                        if isinstance(raw, str)
                        else base64.b64encode(raw).decode()
                    )
                    yield json.dumps({"index": 0, "data": b64}) + "\n"
