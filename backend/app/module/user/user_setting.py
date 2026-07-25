from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database.base import Base


class UserSetting(Base):
    __tablename__ = "tb_user_settings"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("tb_users.id", ondelete="CASCADE"), nullable=False, unique=True)

    chat_instructions = Column(String(2000), nullable=True)
    chat_model = Column(String(100), nullable=False, default="gpt-5.5")
    chat_tone = Column(String(10), nullable=False, default="neutral")
    chat_length = Column(String(10), nullable=False, default="normal")
    chat_language = Column(String(5), nullable=False, default="ko")

    image_instructions = Column(String(2000), nullable=True)
    image_model = Column(String(100), nullable=False, default="gpt-image")

    updated_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="setting")
