import asyncio
import base64
import json
import uuid
from urllib.parse import quote

from fastapi import APIRouter
from fastapi.responses import FileResponse, Response, StreamingResponse

from app.core.config.settings import settings
from app.core.database.base import SessionLocal
from app.core.utils.logger import get_logger
from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import fail
from app.core.utils.s3_utils import get_s3_object, upload_image_to_s3
from app.module.log.log_repository import LogRepository
from app.module.user.user_setting_repository import UserSettingRepository

logger = get_logger(__name__)

router = APIRouter()


def _extract_s3_key(url: str) -> str | None:
    """S3 URL에서 오브젝트 키를 추출한다."""
    prefix = f"https://{settings.aws_s3_bucket}.s3.{settings.aws_s3_region}.amazonaws.com/"
    if url.startswith(prefix):
        return url[len(prefix):]
    return None


@router.get("/download")
@with_provider
@with_login()
async def download_image(p: ServiceProvider):
    path = (p.request.query_params.get("path") or "").lstrip("/")
    filename = (p.request.query_params.get("filename") or "image.png").strip()

    # S3 URL → 백엔드 프록시 (CORS 우회)
    if path.startswith("https://"):
        key = _extract_s3_key(path)
        if not key:
            return fail(message="잘못된 경로입니다.", status_code=400)
        data, content_type = await get_s3_object(key)
        return Response(
            content=data,
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{quote(filename)}"'},
        )

    # 로컬 파일 (하위 호환)
    if not path.startswith("media/images/"):
        return fail(message="잘못된 경로입니다.", status_code=400)
    file_path = settings.BASE_DIR / path
    if not file_path.exists() or not file_path.is_file():
        return fail(message="파일을 찾을 수 없습니다.", status_code=404)

    return FileResponse(
        path=str(file_path),
        media_type="image/png",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{quote(filename)}"'},
    )


async def _save_image_log(session: str, user_id: int, prompt: str, image_b64: str, model: str):
    image_bytes = base64.b64decode(image_b64)
    key = f"images/{uuid.uuid4().hex}.png"
    image_url = await upload_image_to_s3(image_bytes, key)

    async with SessionLocal() as db_session:
        repo = LogRepository(db_session)
        log_id = await repo.get_or_create_log(
            name="이미지",
            version=model,
            session=session,
            user_id=user_id,
            directory_id=None,
            directory_version=None,
            log_type="image",
        )
        await repo.create_log_detail(prompt, image_url, log_id, version=model)
        await db_session.commit()


@router.post("/generate")
@with_provider
@with_login()
async def generate_image(p: ServiceProvider):
    body = await p.request.json()
    prompt = body.get("prompt", "").strip()
    session = body.get("session", "")
    model = body.get("model", "gpt-image-1")
    user_id = p.request.user_id

    if not prompt:
        return fail(message="프롬프트를 입력해주세요.", status_code=400)

    original_prompt = prompt

    async with SessionLocal() as db_session:
        setting = await UserSettingRepository(db_session).get_by_user_id(user_id)
        image_instructions = (setting.image_instructions or "").strip() if setting else ""

    full_prompt = f"{image_instructions}\n\n{prompt}" if image_instructions else prompt

    service = (
        p.gemini_image_service
        if model.startswith(("imagen-", "gemini-"))
        else p.gpt_image_service
    )

    last_b64: str | None = None

    async def stream_wrapper():
        nonlocal last_b64
        try:
            async for chunk in service.generate_stream(full_prompt, model):
                try:
                    event = json.loads(chunk.rstrip("\n"))
                    if event.get("data"):
                        last_b64 = event["data"]
                except Exception:
                    pass
                yield chunk
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

        if last_b64 and session:
            try:
                await _save_image_log(session, user_id, original_prompt, last_b64, model)
                yield json.dumps({"saved": True}) + "\n"
            except Exception:
                logger.exception("Image log save failed")

    return StreamingResponse(stream_wrapper(), media_type="text/plain")


@router.post("/edit")
@with_provider
@with_login()
async def edit_image(p: ServiceProvider):
    body = await p.request.json()
    image_url = body.get("image_url", "")
    prompt = body.get("prompt", "").strip()
    session = body.get("session", "")
    model = body.get("model", "gpt-image-1")
    user_id = p.request.user_id

    if not prompt:
        return fail(message="프롬프트를 입력해주세요.", status_code=400)

    # 이미지 바이트 로드
    if image_url.startswith("https://"):
        key = _extract_s3_key(image_url)
        if not key:
            return fail(message="잘못된 이미지 경로입니다.", status_code=400)
        image_bytes, _ = await get_s3_object(key)
    else:
        import asyncio as aio
        local_path = settings.BASE_DIR / image_url.lstrip("/")
        if not local_path.exists():
            return fail(message="이미지를 찾을 수 없습니다.", status_code=404)
        image_bytes = await aio.to_thread(lambda: open(local_path, "rb").read())

    edit_service = (
        p.gemini_image_service
        if model.startswith(("imagen-", "gemini-"))
        else p.gpt_image_service
    )

    last_b64: str | None = None

    async def stream_wrapper():
        nonlocal last_b64
        try:
            async for chunk in edit_service.edit_stream(image_bytes, prompt, model):
                try:
                    event = json.loads(chunk.rstrip("\n"))
                    if event.get("data"):
                        last_b64 = event["data"]
                except Exception:
                    pass
                yield chunk
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

        if last_b64 and session:
            try:
                await _save_image_log(session, user_id, prompt, last_b64, model)
                yield json.dumps({"saved": True}) + "\n"
            except Exception:
                logger.exception("Image edit log save failed")

    return StreamingResponse(stream_wrapper(), media_type="text/plain")
