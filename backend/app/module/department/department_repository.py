
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import noload

from app.module.department.department import Department, DepartmentType

class DepartmentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_department_list(self):
        result = await self.db.execute(
            select(Department)
            .options(noload(Department.users))
            .order_by(
                Department.id,
                Department.parent_id,
                Department.name
            )
        )

        department_list = result.scalars().all()

        return [
            {
                "id": department.id,
                "name": department.name,
                "type": department.type,
                "parent_id": department.parent_id,
            }
            for department in department_list
        ]