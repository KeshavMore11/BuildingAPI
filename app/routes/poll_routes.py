from fastapi import APIRouter, Depends, status
from app.models.poll_models import VoteCreate, VoteResponse, PollResults
from app.dependencies.auth_dependency import get_current_user
from app.services.poll_service import PollService

router = APIRouter(prefix="/polls", tags=["Polls"])

@router.post(
    "/{proposal_id}/vote",
    response_model=VoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vote on a proposal poll"
)
def vote_on_proposal(
    proposal_id: str,
    payload: VoteCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a vote (Favor or Against) on a proposal's poll.
    Constraint: Each user can only vote once per poll.
    """
    return PollService.vote(
        proposal_id=proposal_id,
        user_id=current_user["id"],
        vote_value=payload.vote
    )

@router.get(
    "/{proposal_id}/results",
    response_model=PollResults,
    status_code=status.HTTP_200_OK,
    summary="Get poll voting results"
)
def get_poll_results(proposal_id: str, current_user: dict = Depends(get_current_user)):
    """
    Returns the aggregated voting metrics for the proposal's poll (number of 'Favor' and 'Against' votes).
    """
    return PollService.get_results(proposal_id=proposal_id)
