# Inhouse Chatbot — 사내용 AI 챗봇 플랫폼

조직의 내부 문서를 학습한 **RAG 챗봇**과, 외부 LLM을 골라 쓰는 **멀티모델 챗봇**을 하나의 사용자 계정으로 제공하는 사내 플랫폼입니다.
관리자는 부서/사용자별로 접근 가능한 학습 디렉토리와 모델을 세밀하게 제어할 수 있고, 모든 대화 로그가 감사 목적으로 기록됩니다.

---

## 1. 프로젝트 개요

### 무엇을 해결하는가

- **일반 챗봇은 사내 정보를 모른다** — 내부 규정, 매뉴얼, 정책 문서를 학습시킨 RAG를 통해 사내 문의를 자동 응대
- **모델을 여러 개 쓰고 싶다** — GPT / Claude / Gemini를 한 화면에서 전환하며 사용
- **개인이 외부 유료 계정을 각자 결제하지 않도록** — 한 조직이 API 키를 관리하고, 사용량과 접근 권한을 통제
- **누가 무엇을 물어봤는지 알 수 있어야 한다** — 관리자용 감사 로그와 통계 화면 제공

### 두 개의 챗봇, 두 개의 사고 방식

| 구분 | 내부용 | 외부용 |
|------|--------|--------|
| **목적** | 사내 문서 기반 정확한 답변 | 범용 LLM 활용 (초안 작성, 리서치, 코드 등) |
| **모델** | OpenAI 고정 (부서별로 지정 가능) | 사용자가 선택 (OpenAI / Anthropic / Gemini) |
| **답변 원칙** | 학습 자료에만 근거, 모르면 "모른다" | 자유롭게 |
| **부가 기능** | 벡터 스토어 검색, 학습 텍스트 인젝션 | 웹 검색, 파일 업로드, 이미지 인식, 문서 생성 |

---

## 2. 핵심 기능

### 클라이언트 기능
- 내부 RAG 채팅 (디렉토리 단위로 문서 학습)
- 외부 LLM 채팅 (모델 실시간 전환, 확장 사고 모드 on/off)
- 이미지 생성 (DALL-E, Imagen)
- 파일 첨부 (이미지 인식, PDF 요약, docx/pptx 요약)
- 문서 생성 (Claude Skills로 docx/xlsx/pptx/pdf 파일 산출)
- 대화 히스토리 / 이미지 갤러리 조회
- 개인 설정 (기본 모델, 답변 톤, 답변 길이, 언어)

### 관리자 기능
- **학습 디렉토리 관리** — 문서 업로드, 시스템 프롬프트 편집, 벡터 스토어 동기화
- **사용자 관리** — 가입 승인/반려/비활성화, 부서 이동, 비밀번호 초기화
- **권한 관리** — 사용자별 접근 가능 디렉토리 및 모델 지정
- **요청 관리** — 신규 가입 요청과 디렉토리 접근 요청 처리
- **사용 로그** — 사용자별/부서별/기간별 필터, 대화 상세 조회, 정확도 리뷰
- **모델 카탈로그** — 조직에서 열어줄 LLM/이미지 모델 on/off

### 인증 흐름
- 회사 도메인 이메일로 가입 → 관리자 승인 → 로그인
- OAuth 로그인 지원 (Google, Kakao)
- 사용자와 관리자는 **완전히 분리된 인증 체계** (JWT 토큰의 prefix로 구분)
- 모든 토큰은 HttpOnly 쿠키에 저장, XSS로 탈취 불가. 서명된 쿠키만 신뢰하고 헤더 토큰 경로는 두지 않음
- **권한은 화면이 아니라 API 진입점에서 검증** — 채팅 요청마다 계정 승인 상태 → 디렉토리 접근 권한(내부) / 모델 사용 권한(외부)을 서버가 다시 확인. 화면 목록에 없는 디렉토리 ID를 직접 보내도 403

---

## 3. 기술 스택

| 계층 | 사용 기술 |
|------|-----------|
| **Frontend** | React 19 + TypeScript + Vite + TanStack Query v5 + Tailwind CSS v3 + React Router |
| **Backend** | FastAPI + SQLAlchemy 2.0 (async) + MySQL 8 + Redis + Alembic |
| **LLM Providers** | OpenAI (Responses API, Vector Store, Files API) / Anthropic (Messages API, Files API, Skills) / Google Gemini (generate_content) |
| **스토리지** | AWS S3 (첨부/생성 파일), OpenAI Vector Store (내부 RAG 파일) |
| **인증** | JWT + HttpOnly Cookie + OAuth 2.0 (Google, Kakao) |

---

## 4. 프로젝트 전체 구조

```
inhouse-chatbot/
├── backend/                # FastAPI 애플리케이션
│   └── app/
│       ├── core/           # 공통 인프라 (설정, DB, 미들웨어, DI provider)
│       ├── module/         # 도메인 모듈 (Model + Repository + Service + Router)
│       └── main.py
├── frontend/               # React 애플리케이션
│   └── src/
│       ├── container/      # 페이지 컴포넌트
│       ├── component/      # 재사용 컴포넌트
│       ├── hooks/          # API 훅, 인증 훅
│       ├── context/        # 전역 상태
│       └── App.tsx
└── README.md
```

---

## 5. 백엔드 상세

### 5.1 모듈별 책임

| 모듈 | 하는 일 |
|------|---------|
| **auth** | 로그인/회원가입, 토큰 발급/갱신, OAuth 연동, 이메일 유효성 검증 |
| **user** | 내 정보, 내 디렉토리, 개인 설정, 접근 요청 |
| **admin** | 관리자 전용 API 진입점 |
| **directory** | RAG 학습 디렉토리 CRUD, 벡터 스토어 동기화, 학습 파일 업로드/삭제 |
| **chat** | 내부용/외부용 채팅 스트리밍, 파일 업로드 대행 |
| **image** | 이미지 생성, 갤러리 조회 |
| **log** | 사용 기록 조회/저장, 관리자 감사 로그 |
| **request** | 가입 요청, 디렉토리 접근 요청 승인/반려 |
| **models** | 조직 전체 LLM 카탈로그, 사용자별 사용 가능 모델 지정 |
| **department** | 부서 계층 조회 |
| **infra** | LLM 프로바이더별 래퍼 (OpenAI/Anthropic/Gemini), Redis 저장소, S3 유틸 |

### 5.2 아키텍처 패턴

**도메인 모듈화**
- 각 도메인이 `xxx.py`(모델) → `xxx_repository.py`(DB 접근) → `xxx_service.py`(비즈니스 로직) → `xxx_router.py`(HTTP) 4단 레이어로 구성
- 도메인 간 결합은 서비스 레이어에서만 이루어짐

**ServiceProvider (Lazy DI)**
- 요청마다 하나의 `ServiceProvider`가 생성되고, 필요한 리포지토리/서비스는 실제 참조되는 순간에만 인스턴스화 (lazy property)
- 라우터는 `@with_provider` 데코레이터 한 줄로 provider를 주입받음
- 순환 의존성이 자연스럽게 해소되고 테스트 시 provider만 mocking하면 됨

**인증 데코레이터**
- `@with_login()` — 로그인한 일반 사용자만
- `@with_login("admin")` — 관리자만
- 토큰 검증 실패 시 자동 401, 만료 시 refresh 유도

### 5.3 채팅 시스템 — 두 개의 서비스, 하나의 인터페이스

#### 내부용 RAG (`InternalChatService`)

0. **권한 확인** (라우터) — 요청한 디렉토리에 승인된 매핑이 없으면 여기서 403. 대기·반려·회수는 전부 "없음"으로 취급하고, 벡터 검색은 시작되지 않음
1. **디렉토리 로딩** — 사용자가 선택한 디렉토리 + 공용 디렉토리(id=1)를 함께 로드
2. **시스템 프롬프트 조립** (Redis 캐시)
   - "학습 데이터, 벡터 스토어 검색 결과, 대화 기록에만 근거하라"는 강제 지침
   - 디렉토리별 커스텀 지침 + 공용 지침
   - 텍스트 학습 데이터 인라인 삽입 (짧은 정책이나 FAQ)
   - `INSTRUCTION_VERSION` bump로 캐시 일괄 무효화
3. **메시지 히스토리 + 요약** (Redis 캐시)
   - 15턴 초과 시 오래된 대화를 요약(gpt-4o-mini)으로 압축, 최근 5턴만 원문 유지
   - 요약도 캐시되어 다음 대화에 이어짐
4. **벡터 스토어 검색**
   - OpenAI `file_search` 도구를 호출해 관련 청크를 자동으로 가져옴
   - `max_num_results`를 넉넉히 잡아 정확도 우선
   - `temperature=0.1`로 창의성보다 문서 충실도를 우선
5. **스트리밍 응답**
   - 응답 완료 시점에 백그라운드 태스크로 로그 저장 + 요약 갱신
   - 사용자가 중단(abort)해도 지금까지 받은 답변은 저장됨

#### 외부용 (`ExternalChatService`)

- 사용자가 선택한 모델의 prefix로 프로바이더 자동 라우팅 (`claude-*` → Anthropic, `gemini-*` → Gemini, 나머지 → OpenAI)
- 프로바이더별 도구 자동 첨부
  - OpenAI: `web_search_preview` (context size high)
  - Anthropic: `web_search` + `code_execution`
  - Gemini: Google Search 툴
- **확장 사고 모드** (Claude 전용) — thinking 블록을 별도 마커로 감싸 UI에서 접혀 있다가 펼쳐 볼 수 있게 함
- **파일 첨부**
  - 이미지/PDF는 base64로 인라인, 문서(docx/pptx 등)는 Files API 업로드
  - 대용량 파일이나 반복 참조 시 Files API 사용으로 토큰 절감
- **문서 생성** (Claude Skills)
  - 사용자 발화에서 "PPT 만들어줘" 같은 의도를 감지하면 pptx/docx/xlsx/pdf Skill로 라우팅
  - 코드 실행 결과 나온 파일을 S3에 저장 후 다운로드 링크 반환
- **웹 검색** — 최신 정보(뉴스, 시세, 스포츠 결과)는 반드시 검색부터 하도록 프롬프트로 강제

### 5.4 캐싱 전략 (Redis)

| 키 패턴 | 저장 내용 | 무효화 시점 |
|---------|-----------|-------------|
| `directory:{id}:{version}` | 디렉토리 시스템 프롬프트 | 디렉토리 편집, 지침 버전 bump |
| `chat:{user_id}:{dir_id}:{version}` | 메시지 히스토리 + 요약 | 디렉토리 버전 변경 |
| `session:{session_id}` | 외부 채팅 세션 히스토리 | 세션 종료/만료 |

캐시 무효화는 도메인 이벤트(디렉토리 저장 등) 발생 시 `delete_pattern`으로 관련 키를 일괄 삭제합니다.

### 5.5 로깅과 관측

- **AccessLog 미들웨어** — 모든 HTTP 요청/응답을 표준 형식으로 기록
- **request_id ContextVar** — 요청마다 UUID를 발급, 로그 라인마다 자동 포함 → 한 요청의 전체 흐름 추적 가능
- **도메인 로그** — LLM 토큰 사용량, file_search 호출 수와 top score, Redis hit/miss, 파일 업로드 성공/실패

### 5.6 데이터 모델 (요약)

- `tb_users` — 사용자 (승인 상태 4단계로 접근 제어)
- `tb_departments` — 부서 계층 (parent_id 자기참조)
- `tb_directories` — RAG 디렉토리 (벡터 스토어 ID와 1:1)
- `tb_learning_texts` / `tb_learning_files` — 디렉토리 학습 데이터
- `tb_user_directories` — 사용자 ↔ 디렉토리 접근 권한 (승인 상태 포함)
- `tb_user_models` — 사용자 ↔ 모델 접근 권한
- `tb_logs` / `tb_log_details` — 대화 세션과 개별 Q&A 저장
- `tb_requests` — 가입/권한 요청 이력
- `tb_admins` — 관리자 계정 (사용자와 완전 분리)

---

## 6. 프론트엔드 상세

### 6.1 라우팅 구조

**클라이언트 영역** (`/`)
- `/` — 홈: 모드 선택(내부/외부), 초기 메시지 입력창
- `/internal/:directoryId` — 내부 RAG 채팅
- `/chatbot` — 외부 멀티모델 채팅
- `/c/:sessionId` — 이전 대화 이어가기
- `/image` — 이미지 생성
- `/gallery` — 생성 이미지 갤러리
- `/history` — 채팅 히스토리
- `/profile`, `/settings` — 프로필 및 개인 설정

**관리자 영역** (`/admin`)
- 디렉토리 / 사용자 / 요청 / 로그 / 모델 관리 화면

### 6.2 상태 관리 방침

- **서버 상태는 TanStack Query v5** — 캐시, 페이지네이션 유지, refetch 정책까지 훅에 위임
- **인증 상태는 Context** — 쿠키에서 JWT payload를 파싱해 유저 정보 전역 노출
- **로컬 UI 상태는 useState** — 폼 입력, 모달 open/close 등 컴포넌트 단위로 관리
- Redux나 Zustand 같은 별도 클라이언트 상태 라이브러리는 사용하지 않음 — 서버 상태가 대부분이라 필요성이 낮음

### 6.3 API 훅 (`useAPI.ts`)

- `useGet` — GET 요청 표준화, 401 응답 시 자동 refresh + 재시도
- `usePost` — mutation 계열, 성공/실패 콜백 지원
- `useChatStream` — SSE가 아닌 fetch + ReadableStream 방식의 스트리밍 채팅 훅
  - 청크가 올 때마다 콜백 호출
  - abort 컨트롤러로 중단 가능
  - 재접속 없이 마커 기반 UI 상태 전환 지원

### 6.4 채팅 UI 흐름

**메시지 렌더링**
- 백엔드에서 오는 스트림을 그대로 마크다운으로 렌더링 (`react-markdown` + `remark-gfm`)
- 코드 블록, 표, 이미지, 링크 모두 지원
- 확장 사고 모드와 도구 호출 결과는 `<details>` 태그로 접이식 처리

**입력창**
- 답변 진행 중에는 입력 비활성화, 정지(■) 버튼만 노출
- 파일 첨부는 클릭 또는 드래그앤드롭
- Claude 모델 선택 시에만 확장 사고 토글과 파일 첨부 활성화

**파일 업로드**
- 이미지, PDF, docx, pptx, txt, csv 등 지원
- 지원하지 않는 확장자는 별도 모달로 안내 (지원 형식을 접이식으로 표시)
- 다중 파일 업로드 지원 (파일별로 칩 형태로 표시)

### 6.5 관리자 화면 특징

**디렉토리 편집**
- 학습 타입 선택 (텍스트 직접 입력 vs 파일 업로드)
- 파일 여러 개 한 번에 추가 가능
- 저장 시 벡터 스토어와 자동 동기화 (기존 파일 유지, 추가/삭제분만 반영)

**사용자 & 요청**
- 승인 대기 배지, 상태별 필터, 부서별 필터, 검색어 조합
- 필터 변경 시 페이지 자동 리셋
- 데이터가 없으면 페이지네이션 숨김

**로그 상세**
- "대화 로그 보기" 클릭 시 상세 데이터가 도착한 후에만 모달을 열어 어색한 로딩 화면 제거
- 검색 필터로 특정 사용자의 특정 시점 질문을 즉시 조회

### 6.6 인증/에러 처리

- 401 응답 → refresh_token 자동 호출 → 원 요청 재시도
- refresh도 실패하면 로그인 페이지로 리다이렉트
- 관리자 API는 별도 refresh 엔드포인트로 분리 (사용자 세션과 완전 격리)
- 네트워크 에러, 서버 5xx는 토스트로 사용자에게 알림

---

## 7. 인프라 및 운영

### 7.1 데이터베이스

- **MySQL 8** — 트랜잭션이 필요한 도메인 데이터 저장
- **Alembic** — 마이그레이션 관리, 새 컬럼/타입 변경 시 revision 파일 추가

### 7.2 캐시 & 세션

- **Redis** — 시스템 프롬프트, 메시지 히스토리, 요약, 세션 등 만료 가능한 데이터 전담
- TTL을 아이템별로 다르게 설정 (프롬프트는 10일, 세션은 짧게)

### 7.3 파일 스토리지

```
S3 bucket/
├── chat-uploads/         # 클라이언트가 채팅 중 업로드한 파일
├── chat-generated/       # Claude Skills 등으로 생성된 산출물
├── directory-uploads/    # 관리자가 올린 RAG 학습 파일 (벡터 스토어와 병행 저장)
└── images/               # 이미지 생성 결과
```

- 사용자가 직접 S3 URL을 알 수 없도록, 파일 조회는 백엔드 프록시 엔드포인트를 경유
- 파일 다운로드는 로그인 → 허용 경로(prefix) → 소유권 순으로 확인. 파일 테이블을 따로 두지 않아 소유권은 대화 로그로 역추적 (첨부는 `image_key`, 생성 산출물은 답변 본문의 링크). 관리자는 감사 목적으로 전체 열람

### 7.4 배포/환경 분리

- `settings.py`에서 `MODE` 값으로 LOCAL / PROD 분기
- 시크릿(API 키, DB URL, S3 자격증명)은 환경변수로 주입
- CORS, SecureHeader, 쿠키 도메인 등 보안 설정을 환경별로 다르게 적용

---

## 8. 대표 데이터 흐름

### 8.1 내부 RAG 채팅 (한 턴)

```
사용자 입력
   ↓
POST /api/chat/stream (directoryId 포함)
   ↓
InternalChatService
   ├─ 디렉토리 로드 (본인 디렉토리 + 공용)
   ├─ Redis: 시스템 프롬프트 조회 (miss 시 조립 후 캐시)
   ├─ Redis: 메시지 히스토리 조회 (없으면 최근 로그로 초기화)
   └─ OpenAI Responses API (streaming + file_search)
        ↓
   벡터 스토어 검색 → 관련 청크 확보
        ↓
   응답 스트리밍 (chunk 단위)
        ↓
   프론트엔드 마크다운 렌더링
        ↓
[스트림 종료 후 백그라운드]
   ├─ 요약 필요 시 gpt-4o-mini로 요약
   ├─ Redis 히스토리 갱신
   └─ DB에 Q&A 저장 (tb_logs + tb_log_details)
```

### 8.2 외부 모델 채팅 + 문서 생성 (Claude Skills)

```
사용자: "이 자료로 PPT 만들어줘" + 파일 첨부
   ↓
POST /api/chat/upload-file → Anthropic Files API 업로드 → file_id
   ↓
POST /api/chat/stream (model=claude-*, file_ids=[...])
   ↓
ExternalChatService
   ├─ 발화에서 pptx 의도 감지 → Skills 라우팅
   ├─ Files API로 첨부 파일 전달
   └─ Anthropic Skills(pptx) 호출
        ↓
   Skill이 코드 실행 → 파일 산출
        ↓
   산출 파일을 S3에 저장 → 다운로드 URL 삽입
        ↓
   프론트엔드에 최종 메시지 + 다운로드 링크 표시
```

### 8.3 관리자가 디렉토리에 문서를 추가하는 흐름

```
관리자: 디렉토리 편집 → 파일 여러 개 선택 → 저장
   ↓
POST /api/directory (multipart)
   ↓
DirectoryService
   ├─ S3에 원본 백업 (directory-uploads/{vector_store_id}/)
   ├─ OpenAI Vector Store에 file_batch 추가 → poll로 완료 대기
   └─ tb_learning_files에 메타 저장
        ↓
Redis: 해당 디렉토리 관련 캐시 일괄 무효화
        ↓
   버전 bump → 다음 채팅부터 새로운 시스템 프롬프트 사용
```

---

## 9. 설계 원칙

- **도메인은 도메인만 안다** — 채팅 서비스가 S3를 직접 부르지 않고 infra 유틸에 위임
- **캐시는 항상 무효화 전략을 함께 설계** — 저장할 때 어떻게 지울지가 세트
- **관리자와 사용자는 완전히 다른 세계** — 토큰, 쿠키, 엔드포인트, 미들웨어 모두 분리
- **스트리밍 응답은 abort까지가 한 사이클** — 중단이든 완료든 반드시 로그가 남아야 함
- **불명확한 요구사항은 추측 대신 질문** — 프롬프트 인젝션이나 예외 흐름은 방어적으로 처리하되, 제품 결정은 사용자에게

---

## 10. 상태

사내 AI 챗봇 프로젝트에서 구현한 기능과 구조를 개인 포트폴리오용으로 정리한 저장소입니다. 회사 및 고객사 정보와 인증 정보 등 비공개 내용은 포함하지 않습니다.
