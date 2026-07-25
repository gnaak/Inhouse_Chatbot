import asyncio
from datetime import datetime

from fastapi import Request

from app.core.database.base import SessionLocal
from app.core.utils.logger import get_logger
from app.module.chat.summarizer import summarize_messages
from app.module.directory.directory_repository import DirectoryRepository
from app.module.infra.openai.chat_service import OpenAIChatService
from app.module.infra.redis.redis_repository import RedisRepository
from app.module.log.log_repository import LogRepository

logger = get_logger(__name__)

LEARNING_TTL = 864000  # 10일
COMMON_DIRECTORY_ID = 1
INSTRUCTION_VERSION = "v3"  # _build_instruction 변경 시 bump → 기존 캐시 자동 무효화
SUMMARY_THRESHOLD = 15
KEEP_RECENT = 5


async def invalidate_directory_cache(redis_repo, directory_id: int):
    """디렉토리 변경 시 외부에서 호출하는 캐시 무효화 헬퍼."""
    await redis_repo.delete_pattern(f"directory:{directory_id}:*")
    await redis_repo.delete_pattern(f"chat:*:{directory_id}:*")


async def invalidate_all_directory_caches(redis_repo, directory_id_list: list[int]):
    await asyncio.gather(
        *(invalidate_directory_cache(redis_repo, d_id) for d_id in directory_id_list)
    )


class InternalChatService:
    def __init__(
        self,
        directory_repo: DirectoryRepository,
        log_repo: LogRepository,
        redis_repo: RedisRepository,
        openai_chat: OpenAIChatService,
    ):
        self.directory_repo = directory_repo
        self.log_repo = log_repo
        self.redis_repo = redis_repo
        self.openai_chat = openai_chat

    # ---------- 빌더 ----------

    def _build_instruction(self, directory, common_directory) -> str:
        blocks = [
            "\n".join([
                "너는 사내용 AI 챗봇이다.",
                "[행동 원칙]",
                "1. 너의 답변은 반드시 [학습 데이터], [공용 학습 데이터], 벡터 스토어 검색 결과, 대화 기록에만 근거해야 한다. 너 자신의 일반 지식·외부 정보·추론은 절대 사용하지 말라.",
                "2. 위 자료에서 답을 찾을 수 없으면 추측하지 말고, 모른다고 명확히 답하면서 \"이 질문은 외부용 챗봇에 문의해 주세요.\" 라는 안내를 함께 제공하라.",
                "3. 인사·간단한 호응 등 정보가 필요 없는 발화는 그대로 응답해도 된다. 단, 사실 정보가 포함되는 순간 위 1·2번 원칙이 적용된다.",
                "4. 답변은 핵심부터 설명하고, 필요시 항목별로 정리하라.",
                "5. 내부 문서 표현을 최대한 그대로 유지하라.",
                "6. 질문과 직접 관련 없는 정보는 포함하지 말라.",
            ])
        ]

        fallback = directory.get("fallback_message") or common_directory.get("fallback_message")
        if fallback:
            blocks.append(
                f'학습 자료에 답이 없을 때는 위 2번 원칙(외부 챗봇 안내)을 우선하되, 별도 fallback 문구가 필요한 경우에만 다음을 사용하라: "{fallback}"'
            )

        blocks.append(f"[현재 디렉토리]\n{directory['name']}")

        if directory.get("instructions"):
            blocks.append(
                "[디렉토리 지침 — 반드시 준수]\n"
                f"{directory['instructions']}"
            )

        if common_directory.get("instructions"):
            blocks.append(
                "[공용 지침]\n"
                f"{common_directory['instructions']}\n"
                "(디렉토리 지침과 공용 지침이 상충될 경우 디렉토리 지침을 우선한다.)"
            )

        if directory.get("text_data"):
            blocks.append(f"[학습 데이터]\n{directory['text_data']}")
        if common_directory.get("text_data"):
            blocks.append(f"[공용 학습 데이터]\n{common_directory['text_data']}")

        return "\n\n".join(blocks).strip()

    def _build_initial_messages(self, log_details) -> list[dict]:
        messages = []
        for log in log_details:
            messages.append({"role": "user", "content": log.question})
            messages.append({"role": "assistant", "content": log.answer})
        return messages

    def _extract_directory(self, directory) -> dict:
        learning_type = directory.learning_type.value
        text_data = directory.learning_text.text if learning_type == "text" else None
        return {
            "id": directory.id,
            "name": directory.name,
            "version": directory.version,
            "gpt_version": directory.gpt_version.value,
            "instructions": directory.instructions,
            "fallback_message": directory.fallback_message,
            "vector_store_id": directory.vector_store_id,
            "use_file_search": learning_type != "text",
            "text_data": text_data,
        }

    # ---------- 메인 ----------

    async def get_streaming(self, body: dict, request: Request):
        request_time = datetime.now()
        user_id = request.user_id
        directory_id = body.get("directoryId")
        message = body.get("message")
        session = body.get("session")

        directory_obj = await self.directory_repo.get_directory_by_id(directory_id)
        directory = self._extract_directory(directory_obj)

        if directory_id == COMMON_DIRECTORY_ID:
            common = {
                "name": None,
                "instructions": None,
                "fallback_message": None,
                "text_data": None,
                "use_file_search": False,
                "vector_store_id": None,
            }
        else:
            common_obj = await self.directory_repo.get_directory_by_id(COMMON_DIRECTORY_ID)
            common = self._extract_directory(common_obj)

        # system prompt 캐싱 (지시문 변경 시 INSTRUCTION_VERSION bump → 기존 캐시 무시)
        learning_key = f"directory:{directory_id}:{INSTRUCTION_VERSION}"
        cached_learning = await self.redis_repo.get(learning_key)
        if cached_learning:
            instructions = cached_learning["learning"]
        else:
            instructions = self._build_instruction(directory, common)
            await self.redis_repo.set(learning_key, {"learning": instructions}, LEARNING_TTL)

        # 메시지 히스토리 + 요약 캐싱
        message_key = f"chat:{user_id}:{directory_id}:{directory['version']}"
        cached_messages = await self.redis_repo.get(message_key)
        if cached_messages:
            messages = cached_messages.get("messages") or []
            prev_summary = cached_messages.get("summary") or ""
        else:
            log_details = await self.log_repo.get_recent_logs(
                user_id, directory_id, directory["version"]
            )
            messages = self._build_initial_messages(log_details)
            prev_summary = ""
            await self.redis_repo.set(message_key, {"messages": messages, "summary": ""})

        if prev_summary:
            instructions = f"{instructions}\n\n[이전 대화 요약]\n{prev_summary}"

        messages.append({"role": "user", "content": message})

        # file_search tool 구성
        tools = None
        vector_store_ids = []
        if directory["use_file_search"] and directory["vector_store_id"]:
            vector_store_ids.append(directory["vector_store_id"])
        if common.get("use_file_search") and common.get("vector_store_id"):
            vector_store_ids.append(common["vector_store_id"])
        if vector_store_ids:
            tools = [{"type": "file_search", "vector_store_ids": vector_store_ids}]

        full_response = ""
        try:
            async for chunk in self.openai_chat.generate_stream(
                messages=messages,
                model=directory["gpt_version"],
                instructions=instructions,
                tools=tools,
            ):
                full_response += chunk
                yield chunk
        except asyncio.CancelledError:
            raise
        finally:
            if full_response:
                messages.append({"role": "assistant", "content": full_response})
                snapshot = list(messages)
                snapshot_summary = prev_summary

                async def _finalize():
                    try:
                        kept = snapshot
                        new_summary = snapshot_summary

                        if len(snapshot) > SUMMARY_THRESHOLD:
                            to_summarize = snapshot[:-KEEP_RECENT]
                            kept = snapshot[-KEEP_RECENT:]
                            new_summary = await summarize_messages(
                                snapshot_summary, to_summarize
                            )
                            logger.info(
                                "Internal chat summarized %d messages → kept=%d summary_len=%d",
                                len(to_summarize), len(kept), len(new_summary or ""),
                            )

                        await self.redis_repo.set(
                            message_key,
                            {"summary": new_summary or "", "messages": kept},
                        )
                        await self._save_log(
                            directory["name"],
                            directory["gpt_version"],
                            session,
                            user_id,
                            directory_id,
                            directory["version"],
                            message,
                            full_response,
                            question_created_at=request_time,
                        )
                    except Exception:
                        logger.exception("Internal chat log save failed")

                asyncio.create_task(_finalize())

    async def _save_log(
        self,
        name,
        version,
        session,
        user_id,
        directory_id,
        directory_version,
        message,
        full_response,
        question_created_at=None,
    ):
        async with SessionLocal() as new_session:
            repo = LogRepository(new_session)
            log_id = await repo.get_or_create_log(
                name=name,
                version=version,
                session=session,
                user_id=user_id,
                directory_id=directory_id,
                directory_version=directory_version,
            )
            await repo.create_log_detail(message, full_response, log_id, version=version, question_created_at=question_created_at)
            await new_session.commit()
