import uuid
from typing import AsyncIterator

from anthropic import AsyncAnthropic

from app.core.config.settings import settings
from app.core.utils.logger import get_logger
from app.core.utils.s3_utils import upload_file_to_s3

client = AsyncAnthropic(api_key=settings.anthropic_api_key)
logger = get_logger(__name__)

BUILD_ON = "<!--JT_BUILD_ON-->"
BUILD_OFF = "<!--JT_BUILD_OFF-->"
THINK_ON = "<!--JT_THINK_ON-->"
THINK_OFF = "<!--JT_THINK_OFF-->"

SKILL_EXT = {"docx": "docx", "xlsx": "xlsx", "pptx": "pptx", "pdf": "pdf"}
SKILL_MIME = {
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "pdf": "application/pdf",
}


class AnthropicChatService:
    """Anthropic Messages API 스트리밍 래퍼."""

    async def generate_stream(
        self,
        messages: list[dict],
        model: str,
        instructions: str | None = None,
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
        extended_thinking: bool = False,
        budget_tokens: int = 10000,
        use_files_api: bool = False,
    ) -> AsyncIterator[str]:
        system_param = (
            [{"type": "text", "text": instructions, "cache_control": {"type": "ephemeral"}}]
            if instructions
            else ""
        )

        if extended_thinking:
            effective_max = 64000
            stream_tools = tools or []
            stream_client = client.beta.messages if use_files_api else client.messages
            stream_kwargs = {
                "model": model,
                "max_tokens": effective_max,
                "messages": messages,
                "system": system_param,
                "thinking": {"type": "enabled", "budget_tokens": budget_tokens},
                "tools": stream_tools,
            }
            if use_files_api:
                stream_kwargs["betas"] = ["files-api-2025-04-14"]
            async with stream_client.stream(**stream_kwargs) as stream:
                in_thinking = False
                in_tool = False
                async for event in stream:
                    etype = getattr(event, "type", "")
                    if etype == "content_block_start":
                        block = getattr(event, "content_block", None)
                        btype = getattr(block, "type", "")
                        if btype == "thinking":
                            in_thinking = True
                            yield THINK_ON
                        elif btype == "tool_use" and not in_tool:
                            in_tool = True
                            yield BUILD_ON
                    elif etype == "content_block_delta":
                        delta = getattr(event, "delta", None)
                        dtype = getattr(delta, "type", "")
                        if dtype == "thinking_delta":
                            yield getattr(delta, "thinking", "")
                        elif dtype == "text_delta":
                            yield getattr(delta, "text", "")
                    elif etype == "content_block_stop":
                        if in_thinking:
                            in_thinking = False
                            yield THINK_OFF
                        elif in_tool:
                            in_tool = False
                            yield BUILD_OFF

                if in_thinking:
                    yield THINK_OFF
                if in_tool:
                    yield BUILD_OFF

                final = await stream.get_final_message()
                usage = getattr(final, "usage", None)
                if usage:
                    logger.info(
                        "Chat usage (thinking) model=%s input=%d output=%d",
                        model,
                        getattr(usage, "input_tokens", 0) or 0,
                        getattr(usage, "output_tokens", 0) or 0,
                    )
        else:
            stream_client = client.beta.messages if use_files_api else client.messages
            stream_kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "messages": messages,
                "system": system_param,
                "tools": tools or [],
            }
            if use_files_api:
                stream_kwargs["betas"] = ["files-api-2025-04-14"]
            async with stream_client.stream(**stream_kwargs) as stream:
                async for text in stream.text_stream:
                    yield text

                final = await stream.get_final_message()
                usage = getattr(final, "usage", None)
                if usage:
                    logger.info(
                        "Chat usage model=%s input=%d output=%d cache_read=%d cache_create=%d",
                        model,
                        getattr(usage, "input_tokens", 0) or 0,
                        getattr(usage, "output_tokens", 0) or 0,
                        getattr(usage, "cache_read_input_tokens", 0) or 0,
                        getattr(usage, "cache_creation_input_tokens", 0) or 0,
                    )

    async def generate_docs(
        self,
        messages: list[dict],
        model: str,
        instructions: str | None = None,
        skill_id: str = "docx",
        use_files_api: bool = False,
    ) -> AsyncIterator[str]:
        system_param = (
            [{"type": "text", "text": instructions, "cache_control": {"type": "ephemeral"}}]
            if instructions
            else ""
        )
        betas = ["code-execution-2025-08-25", "skills-2025-10-02"]
        if use_files_api:
            betas.append("files-api-2025-04-14")
        async with client.beta.messages.stream(
            model=model,
            max_tokens=32000,
            betas=betas,
            container={
                "skills": [
                    {
                        "type": "anthropic",
                        "skill_id": skill_id,
                        "version": "latest",
                    }
                ]
            },
            messages=messages,
            system=system_param,
            tools=[
                {"type": "web_search_20250305", "name": "web_search", "max_uses": 3},
                {"type": "code_execution_20250825", "name": "code_execution"},
            ],
        ) as stream:
            any_text = False
            in_tool = False
            async for event in stream:
                etype = getattr(event, "type", "")
                if etype == "content_block_start":
                    block = getattr(event, "content_block", None)
                    btype = getattr(block, "type", "")
                    if btype and btype != "text" and not in_tool:
                        in_tool = True
                        yield BUILD_ON
                elif etype == "content_block_delta":
                    delta = getattr(event, "delta", None)
                    if getattr(delta, "type", "") == "text_delta":
                        if in_tool:
                            in_tool = False
                            yield BUILD_OFF
                            if any_text:
                                yield "\n\n"
                        text = getattr(delta, "text", "")
                        if text:
                            any_text = True
                            yield text

            if in_tool:
                yield BUILD_OFF
                in_tool = False

            final = await stream.get_final_message()

        file_ids: list[str] = []
        seen_ids: set[str] = set()

        def _extract_file_ids(obj, depth: int = 0):
            if depth > 15 or obj is None:
                return
            if isinstance(obj, dict):
                fid = obj.get("file_id")
                if isinstance(fid, str) and fid not in seen_ids:
                    seen_ids.add(fid)
                    file_ids.append(fid)
                    logger.info("Skills found file_id=%s skill=%s", fid, skill_id)
                for v in obj.values():
                    _extract_file_ids(v, depth + 1)
            elif isinstance(obj, list):
                for item in obj:
                    _extract_file_ids(item, depth + 1)
            elif hasattr(obj, "model_dump"):
                _extract_file_ids(obj.model_dump(), depth + 1)
            elif hasattr(obj, "__dict__"):
                _extract_file_ids(vars(obj), depth + 1)

        for block in final.content:
            if getattr(block, "type", "") != "text":
                _extract_file_ids(block)

        # 모델이 중간 산출물을 여러 번 만든 경우 → 최종본만 사용
        if len(file_ids) > 1:
            logger.info("Skills produced %d files, using last: %s", len(file_ids), file_ids[-1])
            file_ids = [file_ids[-1]]

        if not any_text:
            yield "파일을 생성했습니다."

        if file_ids:
            ext = SKILL_EXT.get(skill_id, "docx")
            content_type = SKILL_MIME.get(skill_id, "application/octet-stream")
            tail = ""
            for fid in file_ids:
                try:
                    file_bytes = await self.download_file(fid)
                    s3_key = f"chat-generated/{uuid.uuid4().hex}.{ext}"
                    await upload_file_to_s3(file_bytes, s3_key, content_type)
                    href = f"__BACKEND__/api/chat/file?key={s3_key}"
                    logger.info("Skills file persisted to S3 fid=%s key=%s", fid, s3_key)
                except Exception:
                    logger.exception("Failed to persist skills file to S3 fid=%s", fid)
                    # S3 실패 시 기존 file_id 경로로 폴백 (30일 한정)
                    href = f"__BACKEND__/api/chat/files/{fid}/{ext}"
                tail += (
                    f'\n\n<a href="{href}" '
                    f'class="download-btn inline-flex items-center gap-2 mt-2 px-4 py-2 '
                    f'bg-textMain text-white rounded-lg text-sm font-medium no-underline '
                    f'hover:opacity-80 transition" '
                    f'download>'
                    f'{ext.upper()} 다운로드</a>'
                )
            yield tail
        else:
            logger.warning("Skills response contained no file IDs stop_reason=%s", final.stop_reason)
            yield "\n\n(파일 ID를 찾지 못했습니다. 서버 로그를 확인해주세요.)"

        usage = getattr(final, "usage", None)
        if usage:
            in_tok = getattr(usage, "input_tokens", 0) or 0
            out_tok = getattr(usage, "output_tokens", 0) or 0
            cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
            cache_create = getattr(usage, "cache_creation_input_tokens", 0) or 0
            logger.info(
                "Skills usage skill=%s input=%d output=%d cache_read=%d cache_create=%d",
                skill_id, in_tok, out_tok, cache_read, cache_create,
            )
            yield (
                f'\n\n<div class="usage-info text-xs text-neutral-400 mt-3 pt-2 '
                f'border-t border-neutral-100">'
                f'사용 토큰 · 입력 {in_tok:,} · 출력 {out_tok:,}'
                f'</div>'
            )

    async def download_file(self, file_id: str) -> bytes:
        file_content = await client.beta.files.download(file_id=file_id)
        return await file_content.read()

    async def get_file_metadata(self, file_id: str):
        return await client.beta.files.retrieve_metadata(file_id=file_id)

    async def upload_file(self, filename: str, data: bytes, content_type: str) -> str:
        file_obj = await client.beta.files.upload(
            file=(filename, data, content_type),
        )
        logger.info("Files API upload filename=%s size=%d file_id=%s", filename, len(data), file_obj.id)
        return file_obj.id
