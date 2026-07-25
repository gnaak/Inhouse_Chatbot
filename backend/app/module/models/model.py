import enum

from sqlalchemy import (Boolean, Column, DateTime, Enum, Float, ForeignKey,
                        Integer, String)
from sqlalchemy.orm import relationship

from app.core.database.base import Base, now_kst


class ModelType(enum.Enum):
    CHAT = "chat"
    IMAGE = "image"


class Model(Base):
    __tablename__ = "tb_models"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    type = Column(Enum(ModelType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    value = Column(String(100), nullable=False)
    label = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)

    provider = Column(String(20), nullable=True)
    pricing_input = Column(Float, nullable=True)
    pricing_output = Column(Float, nullable=True)
    pricing_per_image = Column(Float, nullable=True)
    discovered_at = Column(DateTime, nullable=True, default=now_kst)

    user_models = relationship("UserModel", back_populates="model")


class UserModel(Base):
    __tablename__ = "tb_user_models"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("tb_users.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(Integer, ForeignKey("tb_models.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="user_models")
    model = relationship("Model", back_populates="user_models", lazy="selectin")
