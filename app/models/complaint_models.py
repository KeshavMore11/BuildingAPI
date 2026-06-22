from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class TechnicianBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    craft: str = Field(..., description="Craft, e.g. Plumber, Electrician, Carpenter, Lift Technician, Mason, Labor")
    phone: str = Field(..., min_length=10, max_length=15, description="Technician phone number")

class TechnicianCreate(TechnicianBase):
    pass

class TechnicianResponse(TechnicianBase):
    id: UUID

    class Config:
        from_attributes = True

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10, max_length=1000)

class ComplaintAssign(BaseModel):
    assigned_technician: Optional[UUID] = Field(None, description="ID of the assigned technician (null to unassign)")

class ComplaintStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Pending|In Progress|Completed|Rejected)$", description="New status value")

class ComplaintResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str
    image_url: Optional[str] = None
    status: str
    assigned_technician: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "7c8e96bf-014f-488f-9a74-d421cf4b63e9",
                "user_id": "e305e54c-12fa-45b3-8c43-bc8e16ea861b",
                "title": "Water Pipe Leakage",
                "description": "The pipe under the main kitchen sink is leaking heavily.",
                "image_url": "https://supabase-project.supabase.co/storage/v1/object/public/society-media/uuid.jpg",
                "status": "Pending",
                "assigned_technician": None,
                "created_at": "2026-06-18T14:48:33Z"
            }
        }
