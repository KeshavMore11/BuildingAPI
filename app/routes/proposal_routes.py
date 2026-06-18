from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from app.models.proposal_models import ProposalResponse, ProposalStatusUpdate
from app.dependencies.auth_dependency import get_current_user
from app.dependencies.role_dependency import RoleChecker
from app.services.proposal_service import ProposalService
from typing import Optional, List

router = APIRouter(prefix="/proposals", tags=["Proposals"])

@router.post(
    "",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new proposal or request (with optional image upload)"
)
async def create_proposal(
    title: str = Form(..., description="Title of the proposal, e.g. Installation of EV charging points"),
    description: str = Form(..., description="Detailed proposal explanation/proposal specs"),
    poll_enabled: bool = Form(False, description="Set to true if a vote/poll should be automatically launched"),
    image: Optional[UploadFile] = File(None, description="Optional image/concept plan file"),
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a proposal. If poll_enabled is true, a public poll is automatically generated for society members to vote on.
    """
    image_content = None
    image_name = None
    content_type = None
    
    if image:
        image_content = await image.read()
        image_name = image.filename
        content_type = image.content_type
        
    return ProposalService.create_proposal(
        user_id=current_user["id"],
        title=title,
        description=description,
        poll_enabled=poll_enabled,
        image_content=image_content,
        image_name=image_name,
        content_type=content_type
    )

@router.get(
    "",
    response_model=List[ProposalResponse],
    summary="Get all proposals"
)
def get_all_proposals(current_user: dict = Depends(get_current_user)):
    """
    Returns a list of all society requests and improvement proposals. Available to both members and admins.
    """
    return ProposalService.get_all_proposals()

@router.get(
    "/{id}",
    response_model=ProposalResponse,
    summary="Get proposal details"
)
def get_proposal_details(id: str, current_user: dict = Depends(get_current_user)):
    """
    Fetches detailed metadata of a specific proposal.
    """
    return ProposalService.get_proposal_by_id(proposal_id=id)

@router.put(
    "/{id}/status",
    response_model=ProposalResponse,
    summary="Approve or reject a proposal (Admin only)"
)
def update_proposal_status(
    id: str,
    payload: ProposalStatusUpdate,
    current_user: dict = Depends(RoleChecker(["admin"]))
):
    """
    Updates the approval status of a proposal (Pending, Approved, Rejected). Restricted to Admin/Secretary.
    """
    return ProposalService.update_proposal_status(proposal_id=id, new_status=payload.status)
