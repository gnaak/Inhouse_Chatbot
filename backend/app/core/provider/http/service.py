from fastapi import Depends, Request

from app.core.database.base import get_session


class ServiceProvider:
    def __init__(self, request: Request, db):
        self.request = request
        self.db = db
        self.redis_repository = request.app.state.redis_repository
        self._user_repo = None
        self._admin_repo = None
        self._directory_repo = None
        self._department_repo = None
        self._request_repo = None
        self._log_repo = None
        self._user_service = None
        self._auth_service = None
        self._admin_service = None
        self._directory_service = None
        self._department_service = None
        self._request_service = None
        self._log_service = None
        self._internal_chat_service = None
        self._external_chat_service = None
        self._openai_chat_service = None
        self._anthropic_chat_service = None
        self._gemini_chat_service = None
        self._openai_image_service = None
        self._gemini_image_service = None
        self._vector_store_service = None
        self._user_setting_repo = None
        self._user_setting_service = None
        self._model_repo = None
        self._model_service = None

    @property
    def user_repo(self):
        if not self._user_repo:
            from app.module.user.user_repository import UserRepository
            self._user_repo = UserRepository(self.db)
        return self._user_repo

    @property
    def admin_repo(self):
        if not self._admin_repo:
            from app.module.admin.admin_repository import AdminRepository
            self._admin_repo = AdminRepository(self.db)
        return self._admin_repo

    @property
    def directory_repo(self):
        if not self._directory_repo:
            from app.module.directory.directory_repository import DirectoryRepository
            self._directory_repo = DirectoryRepository(self.db)
        return self._directory_repo

    @property
    def department_repo(self):
        if not self._department_repo:
            from app.module.department.department_repository import DepartmentRepository
            self._department_repo = DepartmentRepository(self.db)
        return self._department_repo

    @property
    def request_repo(self):
        if not self._request_repo:
            from app.module.request.request_repository import UserRequestRepository
            self._request_repo = UserRequestRepository(self.db)
        return self._request_repo

    @property
    def log_repo(self):
        if not self._log_repo:
            from app.module.log.log_repository import LogRepository
            self._log_repo = LogRepository(self.db)
        return self._log_repo

    @property
    def user_service(self):
        if not self._user_service:
            from app.module.user.user_service import UserService
            self._user_service = UserService(self.user_repo, self.request_repo, self.directory_repo)
        return self._user_service

    @property
    def admin_service(self):
        if not self._admin_service:
            from app.module.admin.admin_service import AdminService
            self._admin_service = AdminService(self.admin_repo)
        return self._admin_service

    @property
    def auth_service(self):
        if not self._auth_service:
            from app.module.auth.auth_service import AuthService
            self._auth_service = AuthService(self.user_repo, self.request_repo, self.admin_repo, self.directory_repo)
        return self._auth_service

    @property
    def directory_service(self):
        if not self._directory_service:
            from app.module.directory.directory_service import DirectoryService
            self._directory_service = DirectoryService(
                self.directory_repo, self.vector_store_service, self.redis_repository
            )
        return self._directory_service

    @property
    def department_service(self):
        if not self._department_service:
            from app.module.department.department_service import DepartmentService
            self._department_service = DepartmentService(self.department_repo)
        return self._department_service

    @property
    def request_service(self):
        if not self._request_service:
            from app.module.request.request_service import UserRequestService
            self._request_service = UserRequestService(self.request_repo)
        return self._request_service

    @property
    def log_service(self):
        if not self._log_service:
            from app.module.log.log_service import LogService
            self._log_service = LogService(self.log_repo, self.directory_repo)
        return self._log_service

    # ---------- LLM provider 인프라 ----------

    @property
    def openai_chat_service(self):
        if not self._openai_chat_service:
            from app.module.infra.openai.chat_service import OpenAIChatService
            self._openai_chat_service = OpenAIChatService()
        return self._openai_chat_service

    @property
    def anthropic_chat_service(self):
        if not self._anthropic_chat_service:
            from app.module.infra.anthropic.chat_service import AnthropicChatService
            self._anthropic_chat_service = AnthropicChatService()
        return self._anthropic_chat_service

    @property
    def gemini_chat_service(self):
        if not self._gemini_chat_service:
            from app.module.infra.gemini.chat_service import GeminiChatService
            self._gemini_chat_service = GeminiChatService()
        return self._gemini_chat_service

    @property
    def openai_image_service(self):
        if not self._openai_image_service:
            from app.module.infra.openai.image_service import OpenAIImageService
            self._openai_image_service = OpenAIImageService()
        return self._openai_image_service

    @property
    def gemini_image_service(self):
        if not self._gemini_image_service:
            from app.module.infra.gemini.image_service import GeminiImageService
            self._gemini_image_service = GeminiImageService()
        return self._gemini_image_service

    @property
    def vector_store_service(self):
        if not self._vector_store_service:
            from app.module.infra.openai.vector_store_service import VectorStoreService
            self._vector_store_service = VectorStoreService()
        return self._vector_store_service

    # 하위 호환: 기존 image_router에서 gpt_image_service 이름 사용 중
    @property
    def gpt_image_service(self):
        return self.openai_image_service

    # ---------- 채팅 도메인 ----------

    @property
    def internal_chat_service(self):
        if not self._internal_chat_service:
            from app.module.chat.internal_chat_service import InternalChatService
            self._internal_chat_service = InternalChatService(
                self.directory_repo,
                self.log_repo,
                self.redis_repository,
                self.openai_chat_service,
            )
        return self._internal_chat_service

    @property
    def external_chat_service(self):
        if not self._external_chat_service:
            from app.module.chat.external_chat_service import ExternalChatService
            self._external_chat_service = ExternalChatService(
                self.redis_repository,
                self.log_repo,
                self.openai_chat_service,
                self.anthropic_chat_service,
                self.gemini_chat_service,
            )
        return self._external_chat_service

    # ---------- 기타 ----------

    @property
    def user_setting_repo(self):
        if not self._user_setting_repo:
            from app.module.user.user_setting_repository import UserSettingRepository
            self._user_setting_repo = UserSettingRepository(self.db)
        return self._user_setting_repo

    @property
    def user_setting_service(self):
        if not self._user_setting_service:
            from app.module.user.user_setting_service import UserSettingService
            self._user_setting_service = UserSettingService(self.user_setting_repo)
        return self._user_setting_service

    @property
    def model_repo(self):
        if not self._model_repo:
            from app.module.models.model_repository import ModelRepository
            self._model_repo = ModelRepository(self.db)
        return self._model_repo

    @property
    def model_service(self):
        if not self._model_service:
            from app.module.models.model_service import ModelService
            self._model_service = ModelService(self.model_repo)
        return self._model_service


async def get_provider(
    request: Request,
    db=Depends(get_session),
):
    return ServiceProvider(request, db)
