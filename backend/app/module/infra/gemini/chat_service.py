from typing import AsyncIterator

from google import genai as google_genai
from google.genai import types as genai_types

from app.core.config.settings import settings

client = google_genai.Client(api_key=settings.gemini_api_key)


class GeminiChatService:
    """Gemini generate_content_stream 래퍼."""

    async def generate_stream(
        self,
        messages: list[dict],
        model: str,
        instructions: str | None = None,
        tools: list[dict] | None = None,
        use_files_api: bool = False,
    ) -> AsyncIterator[str]:
        contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        config = genai_types.GenerateContentConfig(
            system_instruction=instructions or None,
            tools=tools or None,
        )

        stream = await client.aio.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        )
        async for chunk in stream:
            candidates = getattr(chunk, "candidates", None) or []
            for cand in candidates:
                content = getattr(cand, "content", None)
                if not content:
                    continue
                for part in getattr(content, "parts", None) or []:
                    text = getattr(part, "text", None)
                    if text:
                        yield text
