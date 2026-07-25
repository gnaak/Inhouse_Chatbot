import enum

from sqlalchemy import (Column, DateTime, Enum, ForeignKey, Integer, String,
                        Text)
from sqlalchemy.orm import relationship

from app.core.database.base import Base, now_kst


class GPTType(enum.Enum):
    FIVE_FOUR_NANO = "gpt-5.4-nano"
    FIVE_FOUR_MINI = "gpt-5.4-mini"
    FIVE_FOUR = "gpt-5.4"
    FIVE_FIVE = "gpt-5.5"

class LearningType(enum.Enum):
    TEXT = "text"  # 텍스트 데이터 
    FILE = "file"  # 파일 데이터

# 디렉토리 
class Directory(Base):
    __tablename__ = "tb_directories"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True) 
    name = Column(String(20), nullable=False)
    gpt_version = Column(Enum(GPTType), nullable=False)
    learning_type = Column(Enum(LearningType), nullable=False)
    greeting_message = Column(Text, nullable=False)
    instructions = Column(Text, nullable=True)
    fallback_message = Column(Text, nullable=True)
    vector_store_id = Column(String(255), nullable=True)
    version = Column(Integer, default=0, nullable=True)
    order = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=now_kst)

    learning_text = relationship("LearningText", uselist=False, back_populates="directory", lazy="joined")
    learning_files = relationship("LearningFile", back_populates="directory", lazy="selectin")
    users = relationship("UserDirectory", back_populates="directory", lazy="selectin")


# 텍스트 데이터
class LearningText(Base):
    __tablename__ = "tb_learning_texts"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    text = Column(Text, nullable=True)

    directory_id = Column(Integer, ForeignKey("tb_directories.id", ondelete="CASCADE"), nullable=False)
    directory = relationship("Directory", back_populates="learning_text")

# 파일 데이터
# TODO: 파일 크기도 넣어두면 좋을듯?
class LearningFile(Base):
    __tablename__ = "tb_learning_files"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_id = Column(String(255), nullable=False)
    file_size = Column(String(255), nullable=False)
    s3_key = Column(String(500), nullable=True)

    directory_id = Column(Integer, ForeignKey("tb_directories.id", ondelete="CASCADE"), nullable=False)
    directory = relationship("Directory", back_populates="learning_files")