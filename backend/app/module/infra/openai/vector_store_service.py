import os
import uuid as uuid_lib
from typing import List, Optional, Tuple

from starlette.datastructures import UploadFile

from app.core.utils.logger import get_logger
from app.core.utils.s3_utils import upload_file_to_s3
from app.module.infra.openai.chat_service import client

logger = get_logger(__name__)


class VectorStoreService:
    """OpenAI 벡터 스토어 CRUD. 채팅 로직과 무관한 인프라 헬퍼."""

    async def create_vector_store(self, directory_name: str) -> str:
        vector_store = await client.vector_stores.create(name=directory_name)
        return vector_store.id

    async def upload_file_to_vector_store(
        self, vector_store_id: str, files: List[UploadFile]
    ) -> Tuple[List[str], List[str], List[int], List[Optional[str]]]:
        file_names, file_ids, file_sizes, s3_keys = [], [], [], []
        for file in files:
            name = file.filename
            data = await file.read()
            uploaded = await client.files.create(file=(name, data), purpose="assistants")

            # S3 동시 업로드 (실패해도 OpenAI 업로드는 유지)
            s3_key = None
            try:
                ext = os.path.splitext(name or "")[1] or ""
                s3_key = f"directory-uploads/{vector_store_id}/{uuid_lib.uuid4().hex}{ext}"
                content_type = file.content_type or "application/octet-stream"
                await upload_file_to_s3(data, s3_key, content_type)
            except Exception:
                logger.exception("Directory file S3 upload failed name=%s vector_store=%s", name, vector_store_id)
                s3_key = None

            file_names.append(name)
            file_ids.append(uploaded.id)
            file_sizes.append(file.size)
            s3_keys.append(s3_key)

        await client.vector_stores.file_batches.create_and_poll(
            vector_store_id=vector_store_id, file_ids=file_ids
        )
        return file_names, file_ids, file_sizes, s3_keys

    async def delete_vector_store_files(
        self, vector_store_id: str, file_ids: List[str]
    ) -> None:
        if not file_ids:
            return
        for file_id in file_ids:
            await client.vector_stores.files.delete(
                vector_store_id=vector_store_id, file_id=file_id
            )
            await client.files.delete(file_id=file_id)

    async def delete_vector_store(self, vector_store_id: str):
        if not vector_store_id:
            return
        await client.vector_stores.delete(vector_store_id=vector_store_id)
