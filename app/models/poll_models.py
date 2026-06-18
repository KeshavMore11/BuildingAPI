from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

class VoteCreate(BaseModel):
    vote: str = Field(..., pattern="^(Favor|Against)$", description="Vote must be Favor or Against")

class VoteResponse(BaseModel):
    id: UUID
    poll_id: UUID
    user_id: UUID
    vote: str
    created_at: datetime

    class Config:
        from_attributes = True

class PollResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PollResults(BaseModel):
    favor: int = Field(default=0, description="Number of votes in favor")
    against: int = Field(default=0, description="Number of votes against")
    total_votes: int = Field(default=0, description="Total number of cast votes")

    class Config:
        json_schema_extra = {
            "example": {
                "favor": 25,
                "against": 7,
                "total_votes": 32
            }
        }
