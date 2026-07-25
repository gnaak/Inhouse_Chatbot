import enum

from sqlalchemy import Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database.base import Base

class DepartmentType(enum.Enum):
    GROUP = "group"  # 그룹 
    HQ = "hq"  # 본부 
    DIVISION = "division"  # 실
    TEAM = "team"  # 팀
    PART = "part"  # 파트

class Department(Base):
    __tablename__ = "tb_departments"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True) 
    name = Column(String(20), nullable=False)
    type = Column(Enum(DepartmentType), nullable=True)

    users = relationship("User", back_populates="department", lazy="selectin")
    
    parent_id = Column(Integer, ForeignKey("tb_departments.id", ondelete="SET NULL"), nullable=True)
    parent = parent = relationship("Department", remote_side=[id], backref="children")