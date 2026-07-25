import asyncio
import base64
import re
import uuid
from datetime import datetime

from fastapi import Request

from app.core.database.base import SessionLocal
from app.core.utils.logger import get_logger
from app.core.utils.s3_utils import upload_file_to_s3
from app.module.infra.anthropic.chat_service import AnthropicChatService, BUILD_ON, BUILD_OFF
from app.module.infra.gemini.chat_service import GeminiChatService
from app.module.infra.openai.chat_service import OpenAIChatService
from app.module.infra.redis.redis_repository import RedisRepository
from app.module.chat.summarizer import summarize_messages
from app.module.log.log_repository import LogRepository
from app.module.user.user_setting_repository import UserSettingRepository

SUMMARY_THRESHOLD = 30
KEEP_RECENT = 10

TONE_GUIDE = {
    "neutral": "중립적이고 평이한 어조로 답하라.",
    "friendly": "친근하고 다정한 어조로 답하라.",
    "formal": "정중하고 격식 있는 어조로 답하라.",
    "casual": "편안하고 캐주얼한 어조로 답하라.",
}

LENGTH_GUIDE = {
    "short": "답변은 짧고 간결하게 핵심만 전달하라.",
    "normal": "답변은 적당한 분량으로 균형있게 작성하라.",
    "long": "필요하다면 자세하고 구체적으로 설명하라.",
}

LANGUAGE_GUIDE = {
    "ko": "한국어로 답하라.",
    "en": "Answer in English.",
    "ja": "日本語で答えてください。",
    "zh": "请用中文回答。",
}

logger = get_logger(__name__)

_MIME_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


import json as _json


async def _upload_all_attachments(
    images: list[dict],
    pdfs: list[dict],
    file_meta: list[dict] | None = None,
) -> tuple[str | None, str | None]:
    """모든 이미지 + PDF를 S3에 동시 업로드하고, 이미 업로드된 doc 파일 메타도 합쳐서 (keys_json, media_types_json) 반환."""
    keys_list: list[str] = []
    media_types_list: list[str] = []
    tasks = []

    for img in images:
        mt = img.get("media_type", "image/jpeg")
        ext = _MIME_EXT.get(mt, ".bin")
        key = f"chat-uploads/{uuid.uuid4().hex}{ext}"
        keys_list.append(key)
        media_types_list.append(mt)
        tasks.append(upload_file_to_s3(base64.b64decode(img["data"]), key, mt))

    for pdf in pdfs:
        pdf_data = pdf.get("data")
        if not pdf_data:
            continue
        key = f"chat-uploads/{uuid.uuid4().hex}.pdf"
        keys_list.append(key)
        media_types_list.append("application/pdf")
        tasks.append(upload_file_to_s3(base64.b64decode(pdf_data), key, "application/pdf"))

    if tasks:
        await asyncio.gather(*tasks)

    for entry in (file_meta or []):
        s3_key = entry.get("s3_key")
        ct = entry.get("content_type", "application/octet-stream")
        if s3_key:
            keys_list.append(s3_key)
            media_types_list.append(ct)

    if not keys_list:
        return None, None

    return _json.dumps(keys_list), _json.dumps(media_types_list)

WEB_SEARCH_INSTRUCTIONS = (
    "최신 정보(주가, 환율, 뉴스, 스포츠 결과, 오늘/방금 일어난 사건 등)에 대한 질문은 "
    "반드시 웹 검색을 사용하라. 검색 결과의 가격·수치·날짜에는 항상 출처와 시점("
    "예: '2026-04-30 11:32 KST 기준')을 함께 표시하고, 결과가 장 초반 또는 지연 데이터일 수 있다면 "
    "그 사실을 명시하라. 본인의 학습 데이터로 추측하지 말고, 검색 결과가 부족하면 모른다고 답하라."
)

COMMON_CONTENT_RULES = """## 콘텐츠 원칙 (모든 포맷 공통)
- AI 모델/제품/버전/가격/뉴스 등 빠르게 바뀌는 주제는 **반드시 web_search 먼저 실행** 후 작성
- 학습 데이터에 박힌 옛 버전(예: Claude 3.5, Gemini 2.0)을 그대로 사용 금지
- 수치에는 기준 날짜 명시 (예: 2026년 5월 기준)
- 출처는 문서 말미에 정리
- 한국어로 작성 (별도 지시 없을 시)
- **요청된 포맷을 직접 생성**할 것. 이전 대화의 다른 포맷(docx 등) 파일을 참조/변환하는 우회 금지
- 한 번의 code_execution 호출로 최종 파일을 완성할 것 (중간 산출물을 남기지 말 것)
"""

COMMON_THEME = """## 색상 테마 (4종 포맷 통일)
- 진한 파랑 #1F4E79 — 제목/강조
- 중간 파랑 #2E75B6 — 서브 제목/표 헤더/슬라이드 헤더
- 연한 파랑 #EBF3FB — 표 강조행/슬라이드 배경 보조
- 회색 #F5F5F5 — 교차 음영
"""

DOCX_INSTRUCTIONS = f"""당신은 전문 Word 문서 디자이너입니다. 사용자의 요청을 바탕으로 시각적으로 아름답고 전문적인 docx를 만드세요.

## 폰트
- 기본: 맑은 고딕 (Malgun Gothic). 제목 Bold, 본문 Regular
- 영어·숫자 혼용 구간도 동일하게 적용

{COMMON_THEME}

## 디자인 원칙
- 제목 계층: H1(대제목) → H2(챕터) → H3(소제목) → 본문 순서 유지
- 표: 헤더 행 #2E75B6 배경 + 흰색 Bold, 짝수 행 #F5F5F5 교차 음영
- 페이지: 헤더에 문서 제목(우측 정렬), 푸터에 페이지 번호(중앙)
- 여백: 상하좌우 1인치(1440 DXA), 셀 내부 패딩 충분히

## 보고서 구조 (분석·비교 문서일 경우)
1. 표지: 제목 + 부제목(날짜/기준) + 한 줄 개요
2. 목차 (섹션 4개 이상일 때)
3. 본문: 번호 섹션 + 각 섹션마다 표/목록으로 핵심 시각화
4. 선택 가이드 또는 결론
5. 출처 및 참고자료

{COMMON_CONTENT_RULES}
"""

PDF_INSTRUCTIONS = f"""당신은 전문 PDF 문서 디자이너입니다. 인쇄·배포에 적합한 pdf를 만드세요.

## 작업 원칙 (가장 중요)
- **반드시 PDF를 직접 생성**할 것. docx/word 파일을 먼저 만들고 PDF로 변환하는 우회 경로 사용 금지
- 이전 대화에 docx 등 다른 포맷이 있더라도 그것을 참조/재사용하지 말고, 사용자 요청 내용을 바탕으로 PDF를 처음부터 새로 생성
- 한 번의 code_execution 호출로 최종 PDF를 만들 것

## 한글 폰트 처리 (반드시 준수 — 안 하면 글씨 깨짐)
- **시작 전 폰트 확인**: `subprocess.run(["fc-list", ":lang=ko"], capture_output=True, text=True)` 로 사용 가능한 한글 폰트 찾기
- 한글 폰트가 없으면 즉시 다운로드:
  ```python
  import urllib.request, os
  font_url = "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf"
  font_path = "/tmp/NotoSansKR.otf"
  if not os.path.exists(font_path):
      urllib.request.urlretrieve(font_url, font_path)
  ```
- **reportlab** 사용 시: `pdfmetrics.registerFont(TTFont('NotoSansKR', font_path))` 로 등록 후 모든 스타일에 `fontName='NotoSansKR'` 명시
- **weasyprint** 사용 시: CSS에 `@font-face`로 폰트 등록
- **fpdf2** 사용 시: `pdf.add_font('NotoSansKR', '', font_path, uni=True)` 호출 후 `pdf.set_font('NotoSansKR', size=12)`
- 어느 라이브러리든 모든 텍스트 출력 시 한글 폰트 사용 — Helvetica/Times 같은 기본 라틴 폰트는 한글을 ▯로 렌더링함

{COMMON_THEME}

## 디자인 원칙
- 제목 계층: H1 → H2 → H3 → 본문 순서 유지
- 표: 헤더 행 #2E75B6 + 흰색 Bold, 짝수 행 #F5F5F5
- 페이지: 푸터에 페이지 번호(중앙) + 문서 제목(좌측 또는 우측)
- A4 세로, 여백 20mm
- 링크는 클릭 가능한 하이퍼링크로 삽입

## 구조 (분석·비교 문서)
1. 표지: 제목 + 부제목 + 작성일자
2. 목차 (섹션 4개 이상)
3. 본문: 번호 섹션 + 표/목록 시각화
4. 결론 또는 선택 가이드
5. 출처/참고자료

{COMMON_CONTENT_RULES}
"""

XLSX_INSTRUCTIONS = f"""당신은 전문 Excel 디자이너입니다. 데이터 분석에 적합한 xlsx를 만드세요.

## 시트 구성
- **요약(Summary) 시트**: 핵심 수치/결론 한눈에. 가능하면 첫 시트
- **데이터(Data) 시트**: 원본 표. 헤더 행은 1행에 고정(freeze panes)
- **차트(Charts) 시트**: 비교/추이 차트 분리 (데이터 시트의 범위 참조)
- 시트가 1개로 충분하면 분리하지 말 것

{COMMON_THEME}

## 디자인 원칙
- 헤더 행: #2E75B6 배경 + 흰색 Bold + 가운데 정렬
- 짝수 행: #F5F5F5 교차 음영
- 숫자 셀: 우측 정렬, 천 단위 콤마, 통화는 ₩/$ 포맷, 퍼센트는 % 포맷
- 날짜 셀: yyyy-mm-dd 포맷 통일
- 열 너비: 콘텐츠에 맞춰 auto-fit (한국어 14pt 기준 여유)
- 강조 셀(최댓/최솟값 등): 조건부 서식 또는 #EBF3FB 배경
- 첫 행 freeze, 필요시 첫 열도 freeze

## 콘텐츠 원칙 (Excel 특화)
- 가능한 한 raw 데이터 + 계산식(SUM, AVERAGE, IF 등) 사용. 결과만 박지 말 것
- 비교표는 동일 측정 단위/기준일 사용
- 차트는 막대(비교), 선(추이), 파이(비중) 중 적합한 것 선택

{COMMON_CONTENT_RULES}
"""

PPTX_INSTRUCTIONS = f"""당신은 전문 PowerPoint 디자이너입니다. 발표용 pptx를 만드세요.

## 작업 원칙 (가장 중요)
- **한 번의 code_execution 호출로 최종 pptx 완성**할 것. 중간 파일을 여러 번 저장하지 말 것
- python-pptx 사용 권장. 마지막에 `prs.save("output.pptx")` 한 번만 호출
- 파일을 저장한 직후 동일 세션에서 추가 수정·재저장 금지 — 깨진 파일 원인이 됨
- 슬라이드 마스터/레이아웃을 명시적으로 선택 (`prs.slide_layouts[0]` 등)
- 색상 지정 시 `RGBColor(r, g, b)` 사용 (hex 문자열 직접 입력 금지)
- 폰트 미설치 환경 고려: 폰트 이름은 지정하되, 시스템에 없어도 PPT 자체는 유효해야 함

## 슬라이드 규격
- 16:9 와이드스크린 (`prs.slide_width = Inches(13.333)`, `prs.slide_height = Inches(7.5)`)
- 폰트: 맑은 고딕. 제목 32~40pt Bold, 본문 18~24pt
- 한 슬라이드 = 한 메시지. bullet은 3~5개 이하

{COMMON_THEME}

## 슬라이드 구조
1. **표지**: 제목(큼직) + 부제목 + 발표자/날짜
2. **목차**: 섹션 3~5개 미리보기
3. **본문 슬라이드들**: 섹션마다 1~3장. 핵심은 표/차트/다이어그램으로 시각화
4. **요약/결론**: 핵심 메시지 3개 이내
5. **출처/참고자료**: 마지막 슬라이드

## 디자인 원칙
- 슬라이드 헤더 영역에 색상 바(#1F4E79) 또는 좌측 강조 라인
- 본문 영역 여백 충분히, 텍스트 빽빽하게 채우지 말 것
- 표: 헤더 행 #2E75B6 + 흰색 Bold, 행 높이 넉넉히
- 강조 키워드: #1F4E79 굵게, 또는 #EBF3FB 박스로 감싸기
- 페이지 번호: 우측 하단 (표지/목차 제외)

## 콘텐츠 원칙 (PPT 특화)
- 글머리표 한 줄 = 한 호흡 분량. 문장 전체를 박지 말 것
- 비교는 좌우 2열 또는 표로 시각화
- 데이터는 차트 우선, 표는 보조

{COMMON_CONTENT_RULES}
"""

SKILL_INSTRUCTIONS = {
    "docx": DOCX_INSTRUCTIONS,
    "pdf": PDF_INSTRUCTIONS,
    "xlsx": XLSX_INSTRUCTIONS,
    "pptx": PPTX_INSTRUCTIONS,
}

OPENAI_TOOLS = [{"type": "web_search_preview", "search_context_size": "high"}]
ANTHROPIC_TOOLS = [
    {
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 5,
    },
    {
      "type": "code_execution_20250825",
      "name": "code_execution"
    }
]


class ExternalChatService:
    def __init__(
        self,
        redis_repo: RedisRepository,
        log_repo: LogRepository,
        openai_chat: OpenAIChatService,
        anthropic_chat: AnthropicChatService,
        gemini_chat: GeminiChatService,
    ):
        self.redis_repo = redis_repo
        self.log_repo = log_repo
        self.openai_chat = openai_chat
        self.anthropic_chat = anthropic_chat
        self.gemini_chat = gemini_chat

    def _pick_provider(self, model: str):
        if model.startswith("claude-"):
            return self.anthropic_chat, ANTHROPIC_TOOLS
        if model.startswith("gemini-"):
            from google.genai import types as genai_types
            tools = [genai_types.Tool(google_search=genai_types.GoogleSearch())]
            return self.gemini_chat, tools
        return self.openai_chat, OPENAI_TOOLS

    def _detect_docs_skill(self, message: str, model: str) -> str | None:
        if not model.startswith("claude-"):
            return None
        msg = message.lower()
        if any(kw in msg for kw in ["ppt", "pptx", "프레젠테이션", "발표자료", "슬라이드"]):
            return "pptx"
        if any(kw in msg for kw in ["excel", "xlsx", "엑셀", "스프레드시트"]):
            return "xlsx"
        if "pdf" in msg:
            return "pdf"
        if any(kw in msg for kw in ["word", "docx", "워드", "문서로"]):
            return "docx"
        return None

    async def get_streaming(self, body: dict, request: Request):
        request_time = datetime.now()
        user_id = request.user_id
        message = body.get("message")
        session = body.get("session")
        model = body.get("model") or "gpt-5.5"

        # 사용자 설정 (chat_instructions / tone / length / language) 주입
        async with SessionLocal() as db_session:
            setting = await UserSettingRepository(db_session).get_by_user_id(user_id)

        instruction_blocks = [WEB_SEARCH_INSTRUCTIONS]
        if setting:
            tone_line = TONE_GUIDE.get(setting.chat_tone)
            length_line = LENGTH_GUIDE.get(setting.chat_length)
            language_line = LANGUAGE_GUIDE.get(setting.chat_language)
            user_instr = (setting.chat_instructions or "").strip()
            if tone_line:
                instruction_blocks.append(tone_line)
            if length_line:
                instruction_blocks.append(length_line)
            if language_line:
                instruction_blocks.append(language_line)
            if user_instr:
                instruction_blocks.append(
                    "[사용자 지침 — 반드시 준수]\n" + user_instr
                )

        redis_key = f"external:{user_id}:{session}"
        cached = await self.redis_repo.get(redis_key)
        if cached:
            messages = cached.get("messages") or []
            prev_summary = cached.get("summary") or ""
            logger.info(
                "External chat cache HIT key=%s prev_messages=%d summary_len=%d model=%s",
                redis_key, len(messages), len(prev_summary), model,
            )
        else:
            messages = []
            prev_summary = ""
            logger.info(
                "External chat cache MISS key=%s model=%s",
                redis_key, model,
            )

        if prev_summary:
            instruction_blocks.append(f"[이전 대화 요약]\n{prev_summary}")
        full_instructions = "\n\n".join(instruction_blocks)

        images: list[dict] = body.get("images") or []
        # 단일 이미지 backward compat
        if not images:
            _ib = body.get("image_base64")
            _im = body.get("image_media_type")
            if _ib and _im:
                images = [{"data": _ib, "media_type": _im}]

        pdfs: list[dict] = body.get("pdfs") or []
        # 단일 PDF backward compat
        if not pdfs:
            _pb = body.get("pdf_base64")
            if _pb:
                pdfs = [{"data": _pb}]

        file_ids: list[str] = body.get("file_ids") or []
        file_meta: list[dict] = body.get("file_meta") or []
        extended_thinking = body.get("extended_thinking", False)

        if (images or pdfs) and (not message or not message.strip()):
            if images and pdfs:
                message = "이 파일들을 분석해주세요."
            elif images:
                message = "이 이미지를 분석해주세요."
            else:
                message = "이 PDF를 분석해주세요."

        # 모든 이미지 + PDF + doc 파일 → S3 로그용 저장
        image_key, stored_media_type = await _upload_all_attachments(images, pdfs, file_meta)

        if images or pdfs:
            user_content = [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": img["media_type"], "data": img["data"]},
                }
                for img in images
            ]
            for pdf in pdfs:
                user_content.append({
                    "type": "document",
                    "source": {"type": "base64", "media_type": "application/pdf", "data": pdf["data"]},
                })
            user_content.append({"type": "text", "text": message})
        else:
            user_content = message

        if file_ids:
            if isinstance(user_content, str):
                user_content = [{"type": "text", "text": user_content}]
            container_blocks = [{"type": "container_upload", "file_id": fid} for fid in file_ids]
            user_content = container_blocks + user_content

        messages.append({"role": "user", "content": user_content})

        provider, tools = self._pick_provider(model)
        docs_skill = self._detect_docs_skill(message, model) if not pdfs else None
        use_files_api = bool(file_ids)

        if docs_skill:
            logger.info(
                "External chat docs skill=%s model=%s total_messages=%d",
                docs_skill, model, len(messages),
            )
        else:
            logger.info(
                "External chat dispatch provider=%s model=%s total_messages=%d",
                type(provider).__name__, model, len(messages),
            )

        full_response = ""
        try:
            if docs_skill:
                async for chunk in self.anthropic_chat.generate_docs(
                    messages=messages,
                    model=model,
                    instructions=SKILL_INSTRUCTIONS[docs_skill],
                    skill_id=docs_skill,
                    use_files_api=use_files_api,
                ):
                    full_response += chunk.replace(BUILD_ON, "").replace(BUILD_OFF, "")
                    yield chunk
            elif extended_thinking:
                web_search_tool = [{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}]
                async for chunk in self.anthropic_chat.generate_stream(
                    messages=messages,
                    model=model,
                    instructions=full_instructions,
                    tools=web_search_tool,
                    extended_thinking=True,
                    use_files_api=use_files_api,
                ):
                    full_response += chunk.replace(BUILD_ON, "").replace(BUILD_OFF, "")
                    yield chunk
            else:
                async for chunk in provider.generate_stream(
                    messages=messages,
                    model=model,
                    instructions=full_instructions,
                    tools=tools,
                    use_files_api=use_files_api,
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
                                "External chat summarized %d messages → kept=%d summary_len=%d",
                                len(to_summarize), len(kept), len(new_summary or ""),
                            )

                        await self.redis_repo.set(
                            redis_key,
                            {"summary": new_summary or "", "messages": kept},
                        )
                        logger.info(
                            "External chat cache SAVE key=%s stored_messages=%d summary_len=%d",
                            redis_key, len(kept), len(new_summary or ""),
                        )
                        await self._save_log(
                            model, session, user_id, message, full_response,
                            image_media_type=stored_media_type,
                            image_key=image_key,
                            question_created_at=request_time,
                        )
                    except Exception:
                        logger.exception("External chat log save failed")

                asyncio.create_task(_finalize())

    async def _save_log(self, model, session, user_id, message, full_response, image_media_type=None, image_key=None, question_created_at=None):
        async with SessionLocal() as new_session:
            repo = LogRepository(new_session)
            log_id = await repo.get_or_create_log(
                name="외부",
                version=model,
                session=session,
                user_id=user_id,
                directory_id=None,
                directory_version=None,
            )
            await repo.create_log_detail(message, full_response, log_id, version=model, image_media_type=image_media_type, image_key=image_key, question_created_at=question_created_at)
            await new_session.commit()
