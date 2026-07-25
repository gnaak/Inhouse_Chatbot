# app/core/config/settings.py
import os
import socket
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class RawEnv(BaseSettings):
    # MySQL 설정
    mysql_port: int = 3306

    # LOCAL
    local_mysql_user: str
    local_mysql_password: str
    local_mysql_host: str
    local_mysql_db: str

    # PROD
    prod_mysql_user: str
    prod_mysql_password: str
    prod_mysql_host: str
    prod_mysql_db: str

    jwt_secret: str
    hash_key: str

    # API keys
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None

    # AWS S3
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket: Optional[str] = None
    aws_s3_region: str = "ap-northeast-2"

    # 배포 도메인 / CORS
    prod_cookie_domain: Optional[str] = None
    prod_frontend_origin: Optional[str] = None

    jwt_secret: str
    hash_key: str

    model_config = SettingsConfigDict(env_file=os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"), env_file_encoding="utf-8")

class Settings:
    def __init__(self):
        self.raw = RawEnv()
        self.env = self._detect_env()
        self.BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
        self.APP_DIR = self.BASE_DIR / "app"
        self.MEDIA_ROOT = self.BASE_DIR / "media"                       
        
    def _detect_env(self) -> str:
        hostname = socket.gethostname()
        return "prod" if hostname.startswith("ip-") or hostname.startswith("ec2-") else "local"

    # MySQL 설정
    @property
    def mysql_user(self) -> str:
        return getattr(self.raw, f"{self.env}_mysql_user")

    @property
    def mysql_password(self) -> str:
        return getattr(self.raw, f"{self.env}_mysql_password")

    @property
    def mysql_host(self) -> str:
        return getattr(self.raw, f"{self.env}_mysql_host")

    @property
    def mysql_db(self) -> str:
        return getattr(self.raw, f"{self.env}_mysql_db")

    @property
    def mysql_port(self) -> int:
        return self.raw.mysql_port

    # SQLAlchemy용 비동기 DB URL
    @property
    def database_url(self) -> str:
        user = quote_plus(self.mysql_user)
        password = quote_plus(self.mysql_password)
        host = self.mysql_host
        return (
            f"mysql+aiomysql://{user}:{password}"
            f"@{host}:{self.mysql_port}/{self.mysql_db}"
        )
    
    @property
    def jwt_secret(self) -> str:
        return self.raw.jwt_secret

    @property
    def hash_key(self) -> str:
        return self.raw.hash_key

    # API Keys
    @property
    def openai_api_key(self) -> Optional[str]:
        return self.raw.openai_api_key

    @property
    def gemini_api_key(self) -> Optional[str]:
        return self.raw.gemini_api_key

    @property
    def anthropic_api_key(self) -> Optional[str]:
        return self.raw.anthropic_api_key

    # S3
    @property
    def aws_access_key_id(self) -> Optional[str]:
        return self.raw.aws_access_key_id

    @property
    def aws_secret_access_key(self) -> Optional[str]:
        return self.raw.aws_secret_access_key

    @property
    def aws_s3_bucket(self) -> Optional[str]:
        return self.raw.aws_s3_bucket

    @property
    def aws_s3_region(self) -> str:
        return self.raw.aws_s3_region

    # 배포 도메인 / CORS
    @property
    def prod_cookie_domain(self) -> Optional[str]:
        return self.raw.prod_cookie_domain

    @property
    def prod_frontend_origin(self) -> Optional[str]:
        return self.raw.prod_frontend_origin

# 전역 인스턴스
settings = Settings()
DATABASE_URL = settings.database_url
