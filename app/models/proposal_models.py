from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class ProposalCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    poll_enabled: bool = Field(default=False, description="Enable public voting on this proposal")

class ProposalStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Pending|Approved|Rejected)$", description="New proposal status")

class UserProfileResponse(BaseModel):
    name: str
    email: str

class ProposalResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str
    image_url: Optional[str] = None
    poll_enabled: bool
    status: str
    created_at: datetime
    users: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "fa9c4453-bc2a-4340-9a2c-f6b90ad3123b",
                "user_id": "e305e54c-12fa-45b3-8c43-bc8e16ea861b",
                "title": "CCTV Camera Installation",
                "description": "Request to install 4 new CCTV cameras in Wing C lobby and parking.",
                "image_url": "https://supabase-project.supabase.co/storage/v1/object/public/society-media/uuid.jpg",
                "poll_enabled": True,
                "status": "Pending",
                "created_at": "2026-06-18T14:48:33Z"
            }
        }
