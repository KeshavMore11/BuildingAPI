from fastapi import HTTPException, status
from app.config.supabase_client import supabase

class PollService:
    @staticmethod
    def get_poll_by_proposal(proposal_id: str) -> dict:
        """
        Helper method to retrieve the poll record for a given proposal.
        """
        import time
        max_retries = 3
        delay = 0.1
        for attempt in range(max_retries):
            try:
                response = supabase.table("polls").select("*").eq("proposal_id", proposal_id).execute()
                if not response.data or len(response.data) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No active poll exists for this proposal"
                    )
                return response.data[0]
            except HTTPException:
                raise
            except Exception as e:
                if "Resource temporarily unavailable" in str(e) or "Errno 11" in str(e):
                    if attempt < max_retries - 1:
                        time.sleep(delay * (2 ** attempt))
                        continue
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error fetching poll details: {str(e)}"
                )

    @classmethod
    def vote(cls, proposal_id: str, user_id: str, vote_value: str) -> dict:
        """
        Allows a user to cast a single vote on a proposal's poll.
        """
        poll = cls.get_poll_by_proposal(proposal_id)
        poll_id = poll["id"]

        try:
            vote_check = supabase.table("votes").select("id").eq("poll_id", poll_id).eq("user_id", user_id).execute()
            if vote_check.data and len(vote_check.data) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You have already cast a vote on this proposal"
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during vote verification: {str(e)}"
            )

        vote_data = {
            "poll_id": poll_id,
            "user_id": user_id,
            "vote": vote_value
        }

        try:
            insert_response = supabase.table("votes").insert(vote_data).execute()
            if not insert_response.data or len(insert_response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to record your vote"
                )
            return insert_response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error casting vote: {str(e)}"
            )

    @classmethod
    def get_results(cls, proposal_id: str) -> dict:
        """
        Returns the aggregate results (Favor, Against, Total) of the poll.
        """
        import time
        max_retries = 3
        delay = 0.1
        for attempt in range(max_retries):
            try:
                # Optimized single query joining votes in one database request
                poll_res = supabase.table("polls").select("id, votes(vote)").eq("proposal_id", proposal_id).execute()
                if not poll_res.data or len(poll_res.data) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No active poll exists for this proposal"
                    )
                
                poll_data = poll_res.data[0]
                votes = poll_data.get("votes") or []
                
                favor = sum(1 for v in votes if v["vote"] == "Favor")
                against = sum(1 for v in votes if v["vote"] == "Against")
                
                return {
                    "favor": favor,
                    "against": against,
                    "total_votes": len(votes)
                }
            except HTTPException:
                raise
            except Exception as e:
                if "Resource temporarily unavailable" in str(e) or "Errno 11" in str(e):
                    if attempt < max_retries - 1:
                        time.sleep(delay * (2 ** attempt))
                        continue
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error calculating poll results: {str(e)}"
                )
