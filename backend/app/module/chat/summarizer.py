from openai import AsyncOpenAI

from app.core.config.settings import settings
from app.core.utils.logger import get_logger

logger = get_logger(__name__)
_client = AsyncOpenAI(api_key=settings.openai_api_key)

SUMMARY_MODEL = "gpt-4o-mini"
MAX_SUMMARY_CHARS = 1500


async def summarize_messages(
    prev_summary: str | None,
    messages_to_summarize: list[dict],
) -> str | None:
    """이전 요약 + 신규 메시지를 합쳐 새 요약을 생성. 실패 시 이전 요약 반환."""
    if not messages_to_summarize:
        return prev_summary

    try:
        dialogue = "\n".join(
            f"[{m.get('role', 'user')}] {m.get('content', '')}"
            for m in messages_to_summarize
        )
        prompt_parts = [
            "당신은 챗봇 대화 요약 전문가다.",
            f"아래 대화를 핵심 사실·사용자 요구사항·미해결 이슈 위주로 {MAX_SUMMARY_CHARS}자 이내 한국어 평문으로 요약하라.",
            '메타 설명("요약은 다음과 같습니다" 등)은 쓰지 말고 본문만 반환하라.',
        ]
        if prev_summary:
            prompt_parts.append(f"\n[기존 요약]\n{prev_summary}")
        prompt_parts.append(f"\n[추가 대화]\n{dialogue}")

        response = await _client.responses.create(
            model=SUMMARY_MODEL,
            input=[{"role": "user", "content": "\n".join(prompt_parts)}],
        )
        new_summary = (response.output_text or "").strip()
        if not new_summary:
            return prev_summary
        logger.info(
            "Summary generated old_len=%d new_len=%d source_msgs=%d",
            len(prev_summary or ""),
            len(new_summary),
            len(messages_to_summarize),
        )
        return new_summary
    except Exception:
        logger.exception("Summarization failed")
        return prev_summary
