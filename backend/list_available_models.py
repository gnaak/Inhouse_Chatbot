"""
각 프로바이더의 사용 가능 모델 목록을 출력합니다.

실행: python -m list_available_models  (backend 디렉토리에서)
"""

import asyncio

from anthropic import AsyncAnthropic
from google import genai as google_genai
from openai import AsyncOpenAI

from app.core.config.settings import settings


async def list_openai():
    print("=== OpenAI ===")
    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        models = await client.models.list()
        ids = sorted({m.id for m in models.data})
        for mid in ids:
            print(mid)
    except Exception as e:
        print(f"openai error: {e}")
    print()


async def list_anthropic():
    print("=== Anthropic ===")
    try:
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        models = await client.models.list(limit=100)
        for m in models.data:
            print(f"{m.id}\t{getattr(m, 'display_name', '')}")
    except Exception as e:
        print(f"anthropic error: {e}")
    print()


def list_gemini():
    print("=== Gemini ===")
    try:
        client = google_genai.Client(api_key=settings.gemini_api_key)
        for m in client.models.list():
            methods = getattr(m, "supported_actions", None) or getattr(
                m, "supported_generation_methods", []
            )
            print(f"{m.name}\t{methods}")
    except Exception as e:
        print(f"gemini error: {e}")
    print()


async def main():
    await list_openai()
    await list_anthropic()
    list_gemini()


if __name__ == "__main__":
    asyncio.run(main())
