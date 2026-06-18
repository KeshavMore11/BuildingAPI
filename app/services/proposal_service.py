from typing import List, Optional
from fastapi import HTTPException, status
from app.config.supabase_client import supabase
from app.utils.image_upload import upload_image_to_supabase

class ProposalService:
    @staticmethod
    def create_proposal(
        user_id: str,
        title: str,
        description: str,
        poll_enabled: bool,
        image_content: Optional[bytes] = None,
        image_name: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> dict:
        """
        Creates a new proposal. If poll_enabled is true, automatically creates a poll in the polls table.
        """
        image_url = None
        
        if image_content and image_name:
            try:
                # Upload proposal illustration
                image_url = upload_image_to_supabase(
                    file_content=image_content,
                    file_name=image_name,
                    content_type=content_type or "image/jpeg"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload proposal image: {str(e)}"
                )

        proposal_data = {
            "user_id": user_id,
            "title": title,
            "description": description,
            "image_url": image_url,
            "poll_enabled": poll_enabled,
            "status": "Pending"
        }

        try:
            # 1. Insert proposal
            response = supabase.table("proposals").insert(proposal_data).execute()
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create proposal record"
                )
            proposal = response.data[0]
            proposal_id = proposal["id"]

            # 2. If poll_enabled is True, automatically initialize a poll
            if poll_enabled:
                poll_response = supabase.table("polls").insert({"proposal_id": proposal_id}).execute()
                if not poll_response.data or len(poll_response.data) == 0:
                    # Roll back proposal if poll creation fails (by deleting the proposal)
                    supabase.table("proposals").delete().eq("id", proposal_id).execute()
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to create corresponding poll for proposal"
                    )
            
            return proposal
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during proposal creation: {str(e)}"
            )

    @staticmethod
    def get_all_proposals() -> List[dict]:
        """
        Retrieves all proposals.
        """
        try:
            response = supabase.table("proposals").select("*").order("created_at", desc=True).execute()
            return response.data or []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error fetching proposals: {str(e)}"
            )

    @staticmethod
    def get_proposal_by_id(proposal_id: str) -> dict:
        """
        Retrieves a proposal by its ID.
        """
        try:
            response = supabase.table("proposals").select("*").eq("id", proposal_id).execute()
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proposal not found"
                )
            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error fetching proposal detail: {str(e)}"
            )

    @staticmethod
    def update_proposal_status(proposal_id: str, new_status: str) -> dict:
        """
        Updates the status of a proposal (Approved/Rejected/Pending) - admin only.
        """
        try:
            # Check if proposal exists
            proposal_check = supabase.table("proposals").select("id").eq("id", proposal_id).execute()
            if not proposal_check.data or len(proposal_check.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Proposal not found"
                )

            response = supabase.table("proposals").update({"status": new_status}).eq("id", proposal_id).execute()
            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during proposal status update: {str(e)}"
            )
