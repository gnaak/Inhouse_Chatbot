import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database.base import Base, now_kst


class UserRequestType(enum.Enum):
    DIRECTORY = "directory"  # 추가 디렉토리
    SIGNIN = "signin"        # 계정 생성
    PASSWORD = "password"    # 비밀번호 초기화

class UserRequestStatus(enum.Enum):
    WAITING = "waiting"    # 처리 대기 
    APPROVED = "approved"  # 처리 완료
    REJECTED = "rejected"  # 처리 반려 
    PARTIAL = "partial"    # 일부 승인 


# 유저가 보낸 요청
class UserRequest(Base):
    __tablename__ = "tb_user_requests"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    type = Column(Enum(UserRequestType), nullable=False)
    status = Column(Enum(UserRequestStatus), nullable=False, default=UserRequestStatus.WAITING)
    created_at = Column(DateTime, default=now_kst)
    approved_at = Column(DateTime, nullable=True)

    directories = relationship("UserRequestDirectory", back_populates="request", lazy="selectin")
    user_id = Column(Integer, ForeignKey("tb_users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="user_requests")

class UserRequestDirectory(Base):
    __tablename__ = "tb_user_request_directories"

    id = Column(Integer, primary_key=True)
    
    request_id = Column(Integer, ForeignKey("tb_user_requests.id", ondelete="CASCADE"))
    request = relationship("UserRequest", back_populates="directories")
    
    directory_id = Column(Integer, ForeignKey("tb_directories.id", ondelete="CASCADE"))
    directory = relationship("Directory")
    
    directory_name_snapshot = Column(String(100), nullable=False)