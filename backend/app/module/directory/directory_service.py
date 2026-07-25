# app/module/directory/directory_service.py

from fastapi import Request

from app.core.database.base import now_kst
from app.core.utils.logger import get_logger
from app.core.utils.response import fail
from app.core.utils.s3_utils import delete_s3_object
from app.module.chat.internal_chat_service import (
    invalidate_all_directory_caches,
    invalidate_directory_cache,
)
from app.module.directory.directory_repository import DirectoryRepository
from app.module.infra.openai.vector_store_service import VectorStoreService
from app.module.infra.redis.redis_repository import RedisRepository

logger = get_logger(__name__)


class DirectoryService:
    def __init__(
        self,
        directory_repo: DirectoryRepository,
        vector_store_service: VectorStoreService,
        redis_repo: RedisRepository,
    ):
        self.directory_repo = directory_repo
        self.vector_store_service = vector_store_service
        self.redis_repo = redis_repo

    # 디렉토리 생성 혹은 업데이트
    async def create_or_update_directory(self, request: Request) -> None:
        form = await request.form()
        directory_id = int(form.get("id"))
        name = form.get("name")
        gpt_version = form.get("gpt_version")
        instructions = form.get("instructions")
        greeting_message = form.get("greeting_message")
        fallback_message = form.get("fallback_message")
        learning_type = form.get("learning_type")
        learning_text = form.get("learning_text")
        deleted_files = form.getlist("deleted_files") or []
        new_files = form.getlist("new_files") or []
        order_idx = form.get("order")
        directory = await self.directory_repo.get_directory_by_name(name)

        if directory and directory.id != directory_id:
            return fail(status_code=409, message="동일한 이름의 디렉토리가 존재합니다.")

        # 새로운 디렉토리 생성
        if directory_id == 0:
            new_directory_id = await self.directory_repo.create_directory(
                name, gpt_version, learning_type, instructions, greeting_message, fallback_message, order_idx
            )
            await self.directory_repo.create_directory_learning_text(new_directory_id, learning_text)

            vector_store_id = await self.vector_store_service.create_vector_store(name)
            await self.directory_repo.create_vector_store(new_directory_id, vector_store_id)

            if new_files:
                vector_file_names, vector_file_ids, vector_file_sizes, s3_keys = await self.vector_store_service.upload_file_to_vector_store(
                    vector_store_id, new_files
                )
                await self.directory_repo.create_learning_files(
                    new_directory_id, vector_file_names, vector_file_ids, vector_file_sizes, s3_keys
                )

        else:
            if directory_id == 1:
                directory_id_list = await self.directory_repo.get_all_directory_id_list()
                await invalidate_all_directory_caches(self.redis_repo, directory_id_list)
            else:
                await invalidate_directory_cache(self.redis_repo, directory_id)

            original_directory = await self.directory_repo.get_directory_by_id(directory_id)
            if not original_directory:
                return fail(message="directory does not exists", status_code=404)

            if new_files:
                vector_file_names, vector_file_ids, vector_file_sizes, s3_keys = await self.vector_store_service.upload_file_to_vector_store(
                    original_directory.vector_store_id, new_files
                )
                await self.directory_repo.create_learning_files(
                    directory_id, vector_file_names, vector_file_ids, vector_file_sizes, s3_keys
                )

            if deleted_files:
                s3_keys = await self.directory_repo.get_s3_keys_by_file_ids(deleted_files)
                await self.vector_store_service.delete_vector_store_files(
                    original_directory.vector_store_id, deleted_files
                )
                for key in s3_keys:
                    try:
                        await delete_s3_object(key)
                    except Exception:
                        logger.exception("Directory file S3 delete failed key=%s", key)
                await self.directory_repo.delete_learning_files(deleted_files)

            await self.directory_repo.update_directory(
                directory_id, name, gpt_version, learning_type, instructions, greeting_message, fallback_message
            )
            await self.directory_repo.update_directory_learning_text(directory_id, learning_text)

        await self.directory_repo.db.commit()

    async def get_directory_list(self):
        directory_list = await self.directory_repo.get_directory_list()
        directories = []
        if directory_list:
            for directory in directory_list:
                directory_dict = {
                    "id": directory.id,
                    "name": directory.name,
                    "order": directory.order,
                }
                directories.append(directory_dict)
        return directories

    async def get_directory_detail(self, request: Request):
        query_params = request.query_params
        directory_id = int(query_params.get("id"))
        if directory_id == 0:
            return
        directory = await self.directory_repo.get_directory_by_id(directory_id)
        if not directory:
            return fail(message="directory does not exists", status_code=404)

        learning_files = []
        for learning_file in directory.learning_files:
            learning_file_dict = {
                "id": learning_file.id,
                "file_name": learning_file.file_name,
                "file_id": learning_file.file_id,
                "file_size": learning_file.file_size,
                "s3_key": learning_file.s3_key,
            }
            learning_files.append(learning_file_dict)

        return {
            "id": directory.id,
            "name": directory.name,
            "gpt_version": directory.gpt_version,
            "learning_type": directory.learning_type,
            "learning_text": directory.learning_text.text,
            "learning_files": learning_files,
            "greeting_message": directory.greeting_message,
            "instructions": directory.instructions,
            "fallback_message": directory.fallback_message,
        }

    async def delete_directory(self, request: Request) -> None:
        body = await request.json()
        directory_id = body.get("id")
        directory = await self.directory_repo.get_directory_by_id(directory_id)
        existing_files = directory.learning_files
        file_ids = [f.file_id for f in existing_files]
        s3_keys = [f.s3_key for f in existing_files if f.s3_key]
        if file_ids:
            await self.vector_store_service.delete_vector_store_files(
                directory.vector_store_id, file_ids
            )
        for key in s3_keys:
            try:
                await delete_s3_object(key)
            except Exception:
                logger.exception("Directory file S3 delete failed key=%s", key)
        await self.vector_store_service.delete_vector_store(directory.vector_store_id)
        await self.directory_repo.delete_directory(directory_id)

    async def get_greetings_data(self, request: Request):
        query_params = request.query_params
        directory_id = query_params.get("directory_id")
        directory = await self.directory_repo.get_directory_by_id(directory_id)
        created_at = now_kst()
        return {"type": "bot", "message": directory.greeting_message, "created_at": created_at}

    async def reorder_directory(self, request: Request):
        body = await request.json()
        reordered = body.get("reordered")
        await self.directory_repo.reorder_directory(reordered)
