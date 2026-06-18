from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr

class UserRegister(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    role: Optional[str] = Field("member", pattern="^(member|admin)$", description="Role must be either member or admin")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "e305e54c-12fa-45b3-8c43-bc8e16ea861b",
                "name": "Keshav Sharma",
                "email": "keshav@example.com",
                "role": "member",
                "created_at": "2026-06-18T14:48:33Z"
            }
        }
