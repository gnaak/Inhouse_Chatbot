import json

from openai import APIStatusError, NotFoundError

from app.core.utils.logger import get_logger
from app.module.infra.openai.chat_service import client

logger = get_logger(__name__)


def _friendly(model: str, exc: Exception) -> str:
    if isinstance(exc, NotFoundError):
        return f"'{model}' 모델은 현재 이미지 생성에 사용할 수 없습니다. 관리자에게 문의해주세요."
    if isinstance(exc, APIStatusError):
        return f"이미지 생성 요청이 거부됐어요 ({exc.status_code}). 다른 모델로 다시 시도해주세요."
    return "이미지 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."


GPT_IMAGE_1_MODELS = {"gpt-image-1"}


class OpenAIImageService:
    async def generate_stream(self, prompt: str, model: str = "gpt-image-1"):
        try:
            if model in GPT_IMAGE_1_MODELS:
                stream = await client.images.generate(
                    prompt=prompt,
                    model=model,
                    stream=True,
                    partial_images=2,
                )
                async for event in stream:
                    b64 = getattr(event, "b64_json", None)
                    if b64:
                        yield json.dumps({"data": b64}) + "\n"
            else:
                # DALL-E 등 streaming 미지원 모델
                response = await client.images.generate(
                    prompt=prompt,
                    model=model,
                    response_format="b64_json",
                )
                b64 = response.data[0].b64_json if response.data else None
                if b64:
                    yield json.dumps({"data": b64}) + "\n"
        except Exception as e:
            logger.exception("OpenAI image generation failed (model=%s)", model)
            yield json.dumps({"error": _friendly(model, e)}) + "\n"

    async def edit_stream(self, image_bytes: bytes, prompt: str, model: str = "gpt-image-1"):
        import io
        try:
            image_file = io.BytesIO(image_bytes)
            image_file.name = "image.png"
            if model in GPT_IMAGE_1_MODELS:
                stream = await client.images.edit(
                    image=image_file,
                    prompt=prompt,
                    model=model,
                    stream=True,
                    partial_images=2,
                )
                async for event in stream:
                    b64 = getattr(event, "b64_json", None)
                    if b64:
                        yield json.dumps({"data": b64}) + "\n"
            else:
                response = await client.images.edit(
                    image=image_file,
                    prompt=prompt,
                    model=model,
                    response_format="b64_json",
                )
                b64 = response.data[0].b64_json if response.data else None
                if b64:
                    yield json.dumps({"data": b64}) + "\n"
        except Exception as e:
            logger.exception("OpenAI image edit failed (model=%s)", model)
            yield json.dumps({"error": _friendly(model, e)}) + "\n"
