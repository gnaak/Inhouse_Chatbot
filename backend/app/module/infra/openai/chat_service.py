import asyncio
from typing import AsyncIterator

from openai import AsyncOpenAI

from app.core.config.settings import settings
from app.core.utils.logger import get_logger

client = AsyncOpenAI(api_key=settings.openai_api_key)
logger = get_logger(__name__)


class OpenAIChatService:
    """OpenAI Responses API 스트리밍 래퍼. 캐시/도메인 로직 없음."""

    async def generate_stream(
        self,
        messages: list[dict],
        model: str,
        instructions: str | None = None,
        tools: list[dict] | None = None,
        use_files_api: bool = False,
    ) -> AsyncIterator[str]:
        vector_store_ids = []
        if tools:
            for t in tools:
                if t.get("type") == "file_search":
                    vector_store_ids.extend(t.get("vector_store_ids") or [])
        logger.info(
            "OpenAI request model=%s messages=%d instructions_len=%d file_search=%s vector_stores=%s",
            model,
            len(messages),
            len(instructions or ""),
            bool(vector_store_ids),
            vector_store_ids or "none",
        )

        response = None
        try:
            response = await client.responses.create(
                model=model,
                input=messages,
                stream=True,
                tools=tools or None,
                instructions=instructions,
            )
            async for event in response:
                etype = getattr(event, "type", "")
                if etype == "response.output_text.delta":
                    yield event.delta
                elif etype == "response.output_item.done":
                    item = getattr(event, "item", None)
                    if item and getattr(item, "type", "") == "file_search_call":
                        queries = getattr(item, "queries", []) or []
                        results = getattr(item, "results", []) or []
                        top_scores = [
                            round(float(getattr(r, "score", 0)), 3)
                            for r in results[:3]
                        ]
                        logger.info(
                            "OpenAI file_search call queries=%s results=%d top_scores=%s",
                            queries, len(results), top_scores,
                        )
                elif etype == "response.completed":
                    final = getattr(event, "response", None)
                    usage = getattr(final, "usage", None) if final else None
                    if usage:
                        logger.info(
                            "OpenAI usage model=%s input=%d output=%d total=%d",
                            model,
                            getattr(usage, "input_tokens", 0) or 0,
                            getattr(usage, "output_tokens", 0) or 0,
                            getattr(usage, "total_tokens", 0) or 0,
                        )
                    break
        except asyncio.CancelledError:
            if response:
                await response.close()
            raise
