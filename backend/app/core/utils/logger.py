import logging
import logging.handlers
import os
from contextvars import ContextVar
from pathlib import Path

from app.core.config.settings import settings

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """request_id를 LogRecord에 주입한다."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def _resolve_log_dir() -> Path:
    if settings.env == "prod":
        candidate = Path("/var/log/inhouse-chatbot")
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            return candidate
        except (PermissionError, OSError):
            pass
    fallback = settings.BASE_DIR / "logs"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _make_file_handler(
    log_dir: Path,
    filename: str,
    formatter: logging.Formatter,
    request_filter: logging.Filter,
    level: int | None = None,
) -> logging.handlers.RotatingFileHandler:
    handler = logging.handlers.RotatingFileHandler(
        log_dir / filename,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    handler.setFormatter(formatter)
    handler.addFilter(request_filter)
    if level is not None:
        handler.setLevel(level)
    return handler


def setup_logging() -> None:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_dir = _resolve_log_dir()

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(request_id)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    request_filter = RequestIdFilter()

    # ---------- Root: console + app.log (전체) + error.log (ERROR 이상) ----------
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(log_level)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.addFilter(request_filter)
    root.addHandler(console_handler)

    root.addHandler(_make_file_handler(log_dir, "app.log", formatter, request_filter))
    root.addHandler(
        _make_file_handler(log_dir, "error.log", formatter, request_filter, level=logging.ERROR)
    )

    # ---------- Provider별 전용 로그 파일 (root에도 propagate 됨) ----------
    for provider in ("openai", "anthropic", "gemini"):
        plog = logging.getLogger(f"app.module.infra.{provider}")
        plog.handlers.clear()
        plog.addHandler(
            _make_file_handler(log_dir, f"{provider}.log", formatter, request_filter)
        )
        plog.propagate = True  # app.log에도 들어가게

    # ---------- Access 전용 (propagate 끔) ----------
    access_logger = logging.getLogger("access")
    access_logger.handlers.clear()
    access_logger.setLevel(logging.INFO)
    access_logger.addHandler(
        _make_file_handler(log_dir, "access.log", formatter, request_filter)
    )
    access_logger.propagate = False  # app.log에 안 들어감

    # uvicorn/gunicorn 핸들러를 root로 위임
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "gunicorn.error", "gunicorn.access"):
        lib_logger = logging.getLogger(name)
        lib_logger.handlers.clear()
        lib_logger.propagate = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
