import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.core.database.base import Base, now_kst


class UserStatus(enum.Enum):
    WAITING = "waiting"    # 승인 대기
    APPROVED = "approved"  # 승인 완료
    REJECTED = "rejected"  # 반려
    DISABLED = "disabled"  # 비활성화

class UserDirectoryStatus(enum.Enum):
    WAITING = "waiting"    # 처리 대기 
    APPROVED = "approved"  # 처리 완료
    REJECTED = "rejected"  # 반려
    REVOKED = "revoked"    # 권한 회수


class User(Base):
    __tablename__ = "tb_users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True) 
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(20), nullable=False)
    profile_image = Column(String(200), nullable=True)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.WAITING)
    created_at = Column(DateTime, default=now_kst)
    last_login_at = Column(DateTime(timezone=True))

    department_id = Column(Integer, ForeignKey("tb_departments.id", ondelete="SET NULL"), nullable=True)
    department = relationship("Department", back_populates="users")

    user_directories = relationship("UserDirectory", back_populates="user", lazy="selectin")
    user_requests = relationship("UserRequest", back_populates="user", lazy="selectin")
    user_models = relationship("UserModel", back_populates="user", lazy="selectin")

    logs = relationship("Log", back_populates="user", lazy="selectin")
    setting = relationship("UserSetting", back_populates="user", uselist=False, lazy="noload")

# 유저가 요청했거나, 승인된 디렉토리
class UserDirectory(Base):
    __tablename__ = "tb_user_directories"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    status = Column(Enum(UserDirectoryStatus), nullable=False, default=UserDirectoryStatus.WAITING)
    checked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_kst)
    approved_at = Column(DateTime, nullable=True)

    user_id = Column(Integer, ForeignKey("tb_users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="user_directories")

    directory_id = Column(Integer, ForeignKey("tb_directories.id", ondelete="CASCADE"), nullable=False)
    directory = relationship("Directory", back_populates="users")

