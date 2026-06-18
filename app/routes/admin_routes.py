from fastapi import APIRouter, Depends, status
from app.models.complaint_models import TechnicianCreate, TechnicianResponse
from app.dependencies.role_dependency import RoleChecker
from app.services.admin_service import AdminService
from typing import List

router = APIRouter(prefix="", tags=["Dashboard"])

@router.get(
    "/dashboard/stats",
    status_code=status.HTTP_200_OK,
    summary="Retrieve aggregate dashboard statistics (Admin only)"
)
def get_dashboard_stats(current_user: dict = Depends(RoleChecker(["admin"]))):
    """
    Returns counts of complaints (total, pending, in-progress, completed) and
    proposals (total, approved). Restricted to Secretary/Admin.
    """
    return AdminService.get_dashboard_stats()

@router.post(
    "/technicians",
    response_model=TechnicianResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new service technician (Admin only)"
)
def create_technician(
    payload: TechnicianCreate,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    """
    Registers a new service technician (Plumber, Electrician, Carpenter, etc.) in the database.
    """
    return AdminService.create_technician(payload)

@router.get(
    "/technicians",
    response_model=List[TechnicianResponse],
    summary="Get all service technicians (Admin only)"
)
def get_all_technicians(current_user: dict = Depends(RoleChecker(["admin"]))):
    """
    Lists all technicians registered to resolve complaints.
    """
    return AdminService.get_all_technicians()
