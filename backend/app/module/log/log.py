from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer, String,
                        Text)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship

from app.core.database.base import Base, now_kst


# 로그
class Log(Base):
    __tablename__ = "tb_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(20), nullable=False)
    title = Column(String(200), nullable=True)
    version = Column(String(100), nullable=False)
    session = Column(String(255), nullable=False)
    log_type = Column(String(10), nullable=False, server_default='chat')
    created_at = Column(DateTime, default=now_kst)
    updated_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False, server_default="0")
    deleted_at = Column(DateTime, nullable=True)
    directory_id = Column(Integer, nullable=True, index=True)
    directory_version = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("tb_users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="logs")

    log_details = relationship("LogDetail", back_populates="log", lazy="selectin", passive_deletes="all")

# 로그 상세 기록
class LogDetail(Base):
    __tablename__ = "tb_log_details"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    version = Column(String(100), nullable=True)
    question_created_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_kst)
    image_base64 = Column(LONGTEXT, nullable=True)
    image_media_type = Column(Text, nullable=True)
    image_key = Column(Text, nullable=True)

    log_id = Column(Integer, ForeignKey("tb_logs.id", ondelete="CASCADE"), nullable=False)
    log = relationship("Log", back_populates="log_details")
