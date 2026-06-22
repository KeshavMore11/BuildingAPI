from fastapi import HTTPException, status
from app.config.supabase_client import supabase
from app.models.complaint_models import TechnicianCreate

class AdminService:
    @staticmethod
    def get_dashboard_stats() -> dict:
        """
        Retrieves aggregate statistics for complaints and proposals.
        """
        try:
            complaints_res = supabase.table("complaints").select("status").execute()
            proposals_res = supabase.table("proposals").select("status").execute()
            
            complaints = complaints_res.data or []
            proposals = proposals_res.data or []
            
            total_complaints = len(complaints)
            pending_complaints = sum(1 for c in complaints if c["status"] == "Pending")
            in_progress = sum(1 for c in complaints if c["status"] == "In Progress")
            completed = sum(1 for c in complaints if c["status"] == "Completed")
            
            total_proposals = len(proposals)
            approved_proposals = sum(1 for p in proposals if p["status"] == "Approved")
            
            return {
                "total_complaints": total_complaints,
                "pending_complaints": pending_complaints,
                "in_progress": in_progress,
                "completed": completed,
                "total_proposals": total_proposals,
                "approved_proposals": approved_proposals
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error aggregating dashboard statistics: {str(e)}"
            )

    @staticmethod
    def create_technician(tech_in: TechnicianCreate) -> dict:
        """
        Registers a new technician under a designated craft (admin-only).
        """
        tech_data = {
            "name": tech_in.name,
            "craft": tech_in.craft,
            "phone": tech_in.phone
        }
        
        try:
            response = supabase.table("technicians").insert(tech_data).execute()
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to register technician record"
                )
            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during technician registration: {str(e)}"
            )
            
    @staticmethod
    def get_all_technicians() -> list:
        """
        Retrieves all registered technicians.
        """
        try:
            response = supabase.table("technicians").select("*").execute()
            return response.data or []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error fetching technicians: {str(e)}"
            )
