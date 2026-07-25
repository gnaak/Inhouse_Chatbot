# app/module/chat/chat_router.py

import asyncio
import uuid
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider
from app.core.utils.response import fail, success
from app.core.utils.s3_utils import get_s3_object, upload_file_to_s3
from app.module.auth.auth_token import AuthToken
from app.module.chat.internal_chat_service import COMMON_DIRECTORY_ID
from app.module.infra.anthropic.chat_service import SKILL_MIME

router = APIRouter()

_ALLOWED_FILE_PREFIXES = ("chat-uploads/", "chat-generated/")


async def _resolve_viewer(p: ServiceProvider) -> tuple[int, str]:
    """파일 조회는 사용자와 관리자가 같은 엔드포인트를 쓴다 (관리자 로그 화면).
    사용자 토큰을 먼저 보고, 없으면 관리자 토큰. 둘 다 없으면 401."""
    token_util = AuthToken()
    try:
        return await token_util.get_token_info(p.request, "user")
    except HTTPException as user_error:
        try:
            return await token_util.get_token_info(p.request, "admin")
        except HTTPException:
            raise user_error  # 만료·누락 사유는 사용자 쪽 것을 그대로 돌려준다


async def _assert_file_visible(p: ServiceProvider, needle: str):
    """관리자는 전부, 사용자는 자기 대화에 남은 파일만."""
    user_id, auth_type = await _resolve_viewer(p)
    if auth_type == "admin":
        return
    if not await p.log_repo.user_owns_chat_file(user_id, needle):
        raise HTTPException(status_code=404, detail="파일이 없습니다.")


@router.post("/stream")
@with_provider
@with_login()
async def get_streaming(p: ServiceProvider):
    body = await p.request.json()
    status = await p.auth_service.check_status(p.request)
    if status != "approved":
        return fail(status_code=403, message="사용 가능한 계정이 아닙니다.")

    directory_id = body.get("directoryId")
    # 권한은 여기서 끊는다 — 모델 호출에 들어가기 전에.
    # 내부: 승인된 디렉토리 매핑이 있어야 한다 (공용 디렉토리는 전원 열람).
    # 외부: 관리자가 열어준 모델이어야 한다. 화면의 목록과 같은 기준을 서버에서 한 번 더 본다.
    if directory_id:
        if directory_id != COMMON_DIRECTORY_ID and not await p.user_repo.has_directory_access(
            p.request.user_id, directory_id
        ):
            return fail(status_code=403, message="접근 권한이 없는 디렉토리입니다.")
    else:
        model = body.get("model")
        if not model or not await p.model_repo.is_model_allowed(p.request.user_id, model):
            return fail(status_code=403, message="사용할 수 없는 모델입니다.")

    service = p.internal_chat_service if directory_id else p.external_chat_service

    async def stream_wrapper():
        try:
            async for chunk in service.get_streaming(body, p.request):
                yield chunk
        except asyncio.CancelledError:
            raise

    return StreamingResponse(stream_wrapper(), media_type="text/plain")


@router.get("/file")
@with_provider
async def get_chat_file(p: ServiceProvider):
    """S3에 저장된 채팅 첨부/생성 파일을 백엔드 프록시로 내려준다.
    로그인 + 허용 prefix + 소유권(관리자 제외) 세 가지를 다 통과해야 한다."""
    key = (p.request.query_params.get("key") or "").lstrip("/")
    if not key or not key.startswith(_ALLOWED_FILE_PREFIXES):
        return fail(status_code=400, message="잘못된 파일 경로입니다.")

    await _assert_file_visible(p, key)
    data, content_type = await get_s3_object(key)

    headers = {}
    # 이미지(png/jpg/gif/webp)는 inline 표시, 그 외는 첨부 다운로드
    if not content_type.startswith("image/"):
        filename = key.split("/")[-1]
        encoded = quote(filename)
        ascii_fallback = filename.encode("ascii", "ignore").decode("ascii") or "file"
        headers["Content-Disposition"] = (
            f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded}'
        )

    return Response(content=data, media_type=content_type, headers=headers)


@router.get("/files/{file_id}/{ext}")
@with_provider
async def download_doc_file(p: ServiceProvider):
    """S3 저장에 실패했을 때의 폴백 — Anthropic Files API 에서 직접 내려준다.
    file_id 는 답변 본문의 링크에만 남으므로 그것으로 소유권을 본다."""
    file_id = p.request.path_params["file_id"]
    ext = p.request.path_params["ext"]
    await _assert_file_visible(p, file_id)

    from app.module.infra.anthropic.chat_service import AnthropicChatService
    service = AnthropicChatService()
    content, meta = await asyncio.gather(
        service.download_file(file_id),
        service.get_file_metadata(file_id),
    )
    filename = getattr(meta, "filename", None) or f"document.{ext}"
    if "." not in filename:
        filename = f"{filename}.{ext}"

    mime = SKILL_MIME.get(ext, "application/octet-stream")
    ascii_fallback = filename.encode("ascii", "ignore").decode("ascii") or f"document.{ext}"
    encoded = quote(filename)
    return Response(
        content=content,
        media_type=mime,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded}'
            ),
        },
    )


@router.post("/upload-file")
@with_provider
@with_login()
async def upload_chat_file(p: ServiceProvider):
    from app.module.infra.anthropic.chat_service import AnthropicChatService
    form = await p.request.form()
    upload = form.get("file")
    if not upload:
        return fail(status_code=400, message="파일이 없습니다.")
    data = await upload.read()
    content_type = upload.content_type or "application/octet-stream"
    filename = upload.filename or "file"
    s3_key = f"chat-uploads/{uuid.uuid4().hex}/{filename}"
    service = AnthropicChatService()
    file_id, _ = await asyncio.gather(
        service.upload_file(filename, data, content_type),
        upload_file_to_s3(data, s3_key, content_type),
    )
    return success(data={"file_id": file_id, "s3_key": s3_key, "filename": filename, "content_type": content_type})