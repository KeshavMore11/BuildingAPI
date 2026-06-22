from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from app.models.complaint_models import ComplaintResponse, ComplaintAssign, ComplaintStatusUpdate
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.role_dependency import RoleChecker
from app.services.complaint_service import ComplaintService
from typing import Optional, List

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.post(
    "",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new complaint (with optional image upload)"
)
async def create_complaint(
    title: str = Form(..., description="Title of the complaint, e.g. Water leak in lobby"),
    description: str = Form(..., description="Detailed explanation of the issue"),
    image: UploadFile = File(..., description="Required image/photo evidence"),
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a new complaint. If an image file is attached, it is automatically
    uploaded to Supabase Storage and the link is saved in the record.
    """
    image_content = await image.read()
    image_name = image.filename
    content_type = image.content_type
        
    return ComplaintService.create_complaint(
        user_id=current_user["id"],
        title=title,
        description=description,
        image_content=image_content,
        image_name=image_name,
        content_type=content_type
    )

@router.get(
    "/my",
    response_model=List[ComplaintResponse],
    summary="Get logged-in user's complaints"
)
def get_my_complaints(current_user: dict = Depends(get_current_user)):
    """
    Retrieves a list of all complaints filed by the currently logged-in member.
    """
    return ComplaintService.get_my_complaints(user_id=current_user["id"])

@router.get(
    "",
    response_model=List[ComplaintResponse],
    summary="View all complaints (All authenticated users)"
)
def get_all_complaints(current_user: dict = Depends(get_current_user)):
    """
    Retrieves all complaints in the society.
    Accessible to all logged-in members (read-only). Write operations remain admin-only.
    """
    return ComplaintService.get_all_complaints()

@router.put(
    "/{id}/assign",
    response_model=ComplaintResponse,
    summary="Assign a technician to a complaint (Admin only)"
)
def assign_technician(
    id: str,
    payload: ComplaintAssign,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    """
    Assigns a technician to look into the complaint. If assigned and the status was 'Pending',
    the system automatically shifts the complaint status to 'In Progress'.
    """
    tech_id = str(payload.assigned_technician) if payload.assigned_technician else None
    return ComplaintService.assign_technician(complaint_id=id, technician_id=tech_id)

@router.put(
    "/{id}/status",
    response_model=ComplaintResponse,
    summary="Update complaint resolution status (Admin only)"
)
def update_status(
    id: str,
    payload: ComplaintStatusUpdate,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    """
    Updates the complaint's current status (Pending, In Progress, Completed, Rejected).
    """
    return ComplaintService.update_status(complaint_id=id, new_status=payload.status)

@router.delete(
    "/{id}",
    summary="Delete a complaint (Owner only)"
)
def delete_complaint(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Deletes a complaint. Only accessible to the user who registered the complaint.
    """
    return ComplaintService.delete_complaint(complaint_id=id, user_id=current_user["id"])
