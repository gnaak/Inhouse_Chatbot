from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.provider.http.endpoint import with_provider
from app.core.provider.http.login import with_login
from app.core.provider.http.service import ServiceProvider

router = APIRouter()