from typing import List, Optional

from sqlalchemy import update, delete, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.utils.response import fail
from app.module.directory.directory import (Directory, GPTType, LearningFile,
                                            LearningText)

GPT_MAP = {
    "gpt-5.4-nano": GPTType.FIVE_FOUR_NANO,
    "gpt-5.4-mini": GPTType.FIVE_FOUR_MINI,
    "gpt-5.4": GPTType.FIVE_FOUR,
    "gpt-5.5": GPTType.FIVE_FIVE,
}

class DirectoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # 디렉토리명 중복 확인 
    async def get_directory_by_name(self, directory_name: str) -> Directory | None:
        result = await self.db.execute(
            select(Directory)
            .where(Directory.name == directory_name)
        )

        return result.unique().scalar_one_or_none()
    
    # 디렉토리 리스트 
    async def get_directory_list(self) -> List[Directory] | None:
        result = await self.db.execute(
            select(Directory)
            .order_by(Directory.order)
        )
        return result.unique().scalars().all()
    
    async def get_all_directory_id_list(self) -> list[int]:
        result = await self.db.execute(
            select(Directory.id)
            .order_by(Directory.order)
        )
        return result.scalars().all()

    # 디렉토리 상세 정보 
    async def get_directory_by_id(self, directory_id: int):
        result = await self.db.execute(
            select(Directory)
            .options(
                selectinload(Directory.learning_text),
                selectinload(Directory.learning_files),
            )
            .where(Directory.id == directory_id)
        )
        return result.scalar_one_or_none()
    
    # 디렉토리 생성 
    async def create_directory(
            self, 
            name: str, 
            gpt_version: str, 
            learning_type: str, 
            instructions: str, 
            greeting_message: str, 
            fallback_message: str | None,
            order_idx: str
        ) -> int:
        directory = Directory(
            name = name,
            gpt_version = GPT_MAP[gpt_version],
            learning_type = learning_type, 
            instructions = instructions, 
            greeting_message = greeting_message, 
            fallback_message = fallback_message,
            order=order_idx
        )
        self.db.add(directory)
        await self.db.flush()
        return directory.id
    
    # 텍스트 데이터 생성
    async def create_directory_learning_text(self, directory_id: int, learning_text: str):
        new_learning_text = LearningText(
            text = learning_text,
            directory_id = directory_id
        )
        self.db.add(new_learning_text)
        await self.db.flush()

    # 벡터 스토어 생성 (1회만 생성해두고 계속 사용)
    async def create_vector_store(self, directory_id: int, vector_store_id: str):
        directory = await self.get_directory_by_id(directory_id)
        directory.vector_store_id = vector_store_id
        self.db.add(directory)
        await self.db.flush()

    # 벡터 스토어에 파일 데이터 생성 후 추가
    async def create_learning_files(self, directory_id: str, vector_file_names: List[str], vector_file_ids: List[str], vector_file_sizes: List[int], s3_keys: List[Optional[str]]):
        for name, id, size, s3_key in zip(vector_file_names, vector_file_ids, vector_file_sizes, s3_keys):
            learning_file = LearningFile(
                file_name = name,
                file_id = id,
                file_size = size,
                directory_id = directory_id,
                s3_key = s3_key
            )
            self.db.add(learning_file)
        await self.db.flush()

    # 디렉토리 업데이트
    async def update_directory(
            self, 
            directory_id: int,
            name: str, 
            gpt_version: str, 
            learning_type: str, 
            instructions: str, 
            greeting_message: str, 
            fallback_message: str | None
        ) -> int:
    
        result = await self.db.execute(select(Directory).where(Directory.id == directory_id))
        directory = result.scalar_one_or_none()
        if not directory:
            return fail(message="directory does not exists", status_code=404)
        directory.name = name
        directory.gpt_version = GPT_MAP[gpt_version]
        directory.learning_type = learning_type
        directory.instructions = instructions
        directory.greeting_message = greeting_message
        directory.fallback_message = fallback_message
        directory.version += 1 

        await self.db.flush()

    # 텍스트 데이터 업데이트 
    async def update_directory_learning_text(self, directory_id: int, learning_text: str):
        result = await self.db.execute(
            select(LearningText)
            .where(LearningText.directory_id == directory_id)
        )
        original = result.scalar_one_or_none()
        original.text = learning_text

        self.db.add(original)
    
    # S3 정리용: 삭제할 파일들의 s3_key 조회
    async def get_s3_keys_by_file_ids(self, file_ids: List[str]) -> List[str]:
        """삭제 전 S3 정리를 위해 file_id 목록에 해당하는 s3_key 목록 조회."""
        if not file_ids:
            return []
        result = await self.db.execute(
            select(LearningFile.s3_key).where(LearningFile.file_id.in_(file_ids))
        )
        return [row[0] for row in result.all() if row[0]]

    # file_id로 LearningFile 조회 (다운로드용)
    async def get_learning_file_by_file_id(self, file_id: str) -> Optional[LearningFile]:
        result = await self.db.execute(
            select(LearningFile).where(LearningFile.file_id == file_id)
        )
        return result.scalar_one_or_none()

    # 벡터 스토어에 파일 데이터 삭제 후 제거 (생성 & 제거로 업데이트 끝)
    async def delete_learning_files(self, files_id: List[str]) -> None:
        await self.db.execute(delete(LearningFile).where(LearningFile.file_id.in_(files_id)))

    # 디렉토리 삭제
    async def delete_directory(self, directory_id: int) -> None:

        result = await self.db.execute(
            select(Directory).where(Directory.id == directory_id)
        )
        directory = result.scalar_one_or_none()

        if not directory:
            return

        deleted_order = directory.order

        await self.db.execute(
            delete(Directory).where(Directory.id == directory_id)
        )

        await self.db.execute(
            update(Directory)
            .where(Directory.order > deleted_order)
            .values(order=Directory.order - 1)
        )

        await self.db.commit()


    # ID 리스트로 이름 리스트 뽑아오기 -> REQUEST DIRECTORY에 DIRECTORY ID만 넣고, 이름은 이때 불러서 사용할라고 만들기는 했는데..
    async def get_directory_name_list_by_id_list(self, directory_id_list: List[int]):

        result = await self.db.execute(
            select(Directory)
            .where(Directory.id.in_(directory_id_list))
        )

        directories = result.scalars().all()
        directory_names = [d.name for d in directories]

        return directory_names
    

    # 디렉토리 순서 변경
    async def reorder_directory(self, reordered):

        case_stmt = case(
            {item["id"]: item["order"] for item in reordered},
            value=Directory.id
        )

        await self.db.execute(
            update(Directory)
            .where(Directory.id.in_([item["id"] for item in reordered]))
            .values(order=case_stmt)
        )

        await self.db.commit()