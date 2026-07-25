"""
각 프로바이더(OpenAI/Anthropic/Gemini)에서 최신 모델 목록을 가져오고
가격 정보와 함께 정리해서 반환한다.
"""

import asyncio
import re

from anthropic import AsyncAnthropic
from google import genai as google_genai
from openai import AsyncOpenAI

from app.core.config.settings import settings


# USD per 1M tokens (input / output) - 공식 가격 기반 추정
CHAT_PRICING: dict[str, dict[str, float]] = {
    # OpenAI
    "gpt-5.5":       {"input": 5.0,  "output": 15.0},
    "gpt-5.4":       {"input": 5.0,  "output": 15.0},
    "gpt-5.4-mini":  {"input": 0.25, "output": 2.0},
    "gpt-5.4-nano":  {"input": 0.05, "output": 0.40},
    "gpt-5.3":       {"input": 5.0,  "output": 15.0},
    "gpt-5.2":       {"input": 5.0,  "output": 15.0},
    "gpt-5.1":       {"input": 5.0,  "output": 15.0},
    "gpt-5":         {"input": 5.0,  "output": 15.0},
    "gpt-5-mini":    {"input": 0.25, "output": 2.0},
    "gpt-5-nano":    {"input": 0.05, "output": 0.40},
    "gpt-5-pro":     {"input": 15.0, "output": 60.0},
    "gpt-4.1":       {"input": 2.0,  "output": 8.0},
    "gpt-4.1-mini":  {"input": 0.40, "output": 1.60},
    "gpt-4.1-nano":  {"input": 0.10, "output": 0.40},
    "gpt-4o":        {"input": 2.50, "output": 10.0},
    "gpt-4o-mini":   {"input": 0.15, "output": 0.60},

    # Anthropic
    "claude-opus-4-7":    {"input": 15.0, "output": 75.0},
    "claude-opus-4-6":    {"input": 15.0, "output": 75.0},
    "claude-opus-4-5":    {"input": 15.0, "output": 75.0},
    "claude-opus-4-1":    {"input": 15.0, "output": 75.0},
    "claude-opus-4":      {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-6":  {"input": 3.0,  "output": 15.0},
    "claude-sonnet-4-5":  {"input": 3.0,  "output": 15.0},
    "claude-sonnet-4":    {"input": 3.0,  "output": 15.0},
    "claude-haiku-4-5":   {"input": 1.0,  "output": 5.0},

    # Gemini
    "gemini-2.5-pro":                  {"input": 1.25, "output": 10.0},
    "gemini-2.5-flash":                {"input": 0.30, "output": 2.50},
    "gemini-2.5-flash-lite":           {"input": 0.10, "output": 0.40},
    "gemini-3-pro-preview":            {"input": 1.25, "output": 10.0},
    "gemini-3-flash-preview":          {"input": 0.30, "output": 2.50},
    "gemini-3.1-pro-preview":          {"input": 1.25, "output": 10.0},
    "gemini-3.1-flash-lite-preview":   {"input": 0.10, "output": 0.40},
}


# USD per image (standard 1024x1024)
IMAGE_PRICING: dict[str, dict[str, float]] = {
    "gpt-image-2":                    {"per_image": 0.04},
    "gpt-image-1.5":                  {"per_image": 0.04},
    "gpt-image-1":                    {"per_image": 0.04},
    "gpt-image-1-mini":               {"per_image": 0.011},
    "dall-e-3":                       {"per_image": 0.04},
    "dall-e-2":                       {"per_image": 0.02},
    "gemini-2.5-flash-image":         {"per_image": 0.039},
    "gemini-3-pro-image-preview":     {"per_image": 0.04},
    "gemini-3.1-flash-image-preview": {"per_image": 0.039},
}


def _strip_date_suffix(model_id: str) -> str:
    """gpt-5.5-2026-04-23 → gpt-5.5"""
    return re.sub(r"-\d{4}-\d{2}-\d{2}$", "", model_id)


def _chat_pricing(model_id: str) -> dict | None:
    if model_id in CHAT_PRICING:
        return CHAT_PRICING[model_id]
    base = _strip_date_suffix(model_id)
    return CHAT_PRICING.get(base)


def _image_pricing(model_id: str) -> dict | None:
    if model_id in IMAGE_PRICING:
        return IMAGE_PRICING[model_id]
    base = _strip_date_suffix(model_id)
    return IMAGE_PRICING.get(base)


# ── OpenAI ────────────────────────────────────────────────────────────────────

OPENAI_EXCLUDE_KEYWORDS = (
    "audio", "realtime", "transcribe", "tts", "embedding", "moderation",
    "search-preview", "search-api", "codex", "chat-latest", "image", "dall-e",
    "whisper", "sora", "babbage", "davinci", "instruct",
)


def _openai_is_chat(model_id: str) -> bool:
    if not (model_id.startswith("gpt-") or model_id.startswith("o")):
        return False
    if any(kw in model_id for kw in OPENAI_EXCLUDE_KEYWORDS):
        return False
    # 날짜 변형(gpt-5.5-2026-04-23) 제외 — 베이스 ID만 사용
    if re.search(r"-\d{4}-\d{2}-\d{2}$", model_id):
        return False
    return True


OPENAI_IMAGE_EXCLUDE = (
    "gpt-image-1-mini",       # API 미공개 (모델 목록엔 있으나 호출 시 404)
    "chatgpt-image-latest",   # 소비자(ChatGPT) 전용
)


def _openai_is_image(model_id: str) -> bool:
    if model_id in OPENAI_IMAGE_EXCLUDE:
        return False
    if "image" in model_id or model_id.startswith("dall-e"):
        if re.search(r"-\d{4}-\d{2}-\d{2}$", model_id):
            return False
        return True
    return False


async def _discover_openai() -> dict:
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        page = await client.models.list()
        items = list(page.data)
    except Exception as e:
        return {"chat": [], "image": [], "error": str(e)}

    items.sort(key=lambda m: getattr(m, "created", 0) or 0, reverse=True)

    chat = []
    seen_chat = set()
    for m in items:
        if not _openai_is_chat(m.id) or m.id in seen_chat:
            continue
        seen_chat.add(m.id)
        chat.append({
            "value": m.id,
            "label": m.id,
            "pricing": _chat_pricing(m.id),
        })
        if len(chat) >= 5:
            break

    image = []
    seen_image = set()
    for m in items:
        if not _openai_is_image(m.id) or m.id in seen_image:
            continue
        seen_image.add(m.id)
        image.append({
            "value": m.id,
            "label": m.id,
            "pricing": _image_pricing(m.id),
        })
        if len(image) >= 5:
            break

    return {"chat": chat, "image": image}


# ── Anthropic ─────────────────────────────────────────────────────────────────

async def _discover_anthropic() -> dict:
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    try:
        page = await client.models.list(limit=20)
        items = list(page.data)
    except Exception as e:
        return {"chat": [], "image": [], "error": str(e)}

    chat = []
    for m in items[:5]:
        chat.append({
            "value": m.id,
            "label": getattr(m, "display_name", None) or m.id,
            "pricing": _chat_pricing(m.id),
        })
    return {"chat": chat, "image": []}


# ── Gemini ────────────────────────────────────────────────────────────────────

GEMINI_EXCLUDE_KEYWORDS = (
    "embedding", "tts", "audio", "robotics", "deep-research",
    "live", "computer-use", "imagen", "veo", "lyria", "aqa", "gemma",
)


def _gemini_clean_name(name: str) -> str:
    return name.split("/", 1)[-1] if name.startswith("models/") else name


def _gemini_is_chat(name: str, methods: list[str]) -> bool:
    if "generateContent" not in methods:
        return False
    short = _gemini_clean_name(name)
    if not short.startswith("gemini-"):
        return False
    if "image" in short:
        return False
    if any(kw in short for kw in GEMINI_EXCLUDE_KEYWORDS):
        return False
    return True


def _gemini_is_image(name: str) -> bool:
    short = _gemini_clean_name(name)
    return "image" in short and short.startswith("gemini-")


def _gemini_version_score(name: str) -> tuple:
    """버전 숫자 추출하여 정렬용 키 반환. 큰 게 최신."""
    short = _gemini_clean_name(name)
    m = re.search(r"gemini-(\d+(?:\.\d+)?)", short)
    return (float(m.group(1)) if m else 0.0, short)


def _discover_gemini() -> dict:
    try:
        client = google_genai.Client(api_key=settings.gemini_api_key)
        items = list(client.models.list())
    except Exception as e:
        return {"chat": [], "image": [], "error": str(e)}

    chat_candidates = []
    image_candidates = []
    for m in items:
        methods = (
            getattr(m, "supported_actions", None)
            or getattr(m, "supported_generation_methods", None)
            or []
        )
        if _gemini_is_chat(m.name, methods):
            chat_candidates.append(m)
        elif _gemini_is_image(m.name):
            image_candidates.append(m)

    chat_candidates.sort(key=lambda m: _gemini_version_score(m.name), reverse=True)
    image_candidates.sort(key=lambda m: _gemini_version_score(m.name), reverse=True)

    def _build(m):
        short = _gemini_clean_name(m.name)
        return {
            "value": short,
            "label": getattr(m, "display_name", None) or short,
            "pricing": _chat_pricing(short) or _image_pricing(short),
        }

    return {
        "chat": [_build(m) for m in chat_candidates[:5]],
        "image": [_build(m) for m in image_candidates[:5]],
    }


# ── 통합 ──────────────────────────────────────────────────────────────────────

async def discover_all() -> list[dict]:
    openai_task = asyncio.create_task(_discover_openai())
    anthropic_task = asyncio.create_task(_discover_anthropic())
    gemini_data = await asyncio.to_thread(_discover_gemini)
    openai_data, anthropic_data = await asyncio.gather(openai_task, anthropic_task)

    return [
        {"provider": "openai",    "label": "OpenAI",    **openai_data},
        {"provider": "anthropic", "label": "Anthropic", **anthropic_data},
        {"provider": "gemini",    "label": "Google Gemini", **gemini_data},
    ]
