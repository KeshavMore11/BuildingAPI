from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from app.config.supabase_client import supabase
from app.utils.image_upload import upload_image_to_supabase

class ComplaintService:
    @staticmethod
    def create_complaint(
        user_id: str,
        title: str,
        description: str,
        image_content: Optional[bytes] = None,
        image_name: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> dict:
        """
        Creates a new complaint. If an image is provided, uploads it to Supabase Storage.
        """
        image_url = None
        
        if image_content and image_name:
            try:
                image_url = upload_image_to_supabase(
                    file_content=image_content,
                    file_name=image_name,
                    content_type=content_type or "image/jpeg"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload complaint evidence image: {str(e)}"
                )

        complaint_data = {
            "user_id": user_id,
            "title": title,
            "description": description,
            "image_url": image_url,
            "status": "Pending"
        }

        try:
            response = supabase.table("complaints").insert(complaint_data).execute()
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create complaint record"
                )
            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during complaint insertion: {str(e)}"
            )

    @staticmethod
    def get_my_complaints(user_id: str) -> List[dict]:
        """
        Fetches complaints submitted by the logged-in user.
        """
        try:
            response = supabase.table("complaints").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return response.data or []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error fetching user complaints: {str(e)}"
            )

    @staticmethod
    def get_all_complaints() -> List[dict]:
        """
        Fetches all complaints (admin-only).
        """
        try:
            response = supabase.table("complaints").select("*").order("created_at", desc=True).execute()
            return response.data or []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error fetching all complaints: {str(e)}"
            )

    @staticmethod
    def assign_technician(complaint_id: str, technician_id: Optional[str]) -> dict:
        """
        Assigns a technician to a complaint.
        """
        if technician_id:
            try:
                tech_check = supabase.table("technicians").select("id").eq("id", technician_id).execute()
                if not tech_check.data or len(tech_check.data) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Assigned technician not found"
                    )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error checking technician: {str(e)}"
                )

        try:
            complaint_check = supabase.table("complaints").select("id").eq("id", complaint_id).execute()
            if not complaint_check.data or len(complaint_check.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Complaint not found"
                )
            
            update_data = {"assigned_technician": technician_id}
            
            curr_complaint = supabase.table("complaints").select("status").eq("id", complaint_id).execute().data[0]
            if curr_complaint["status"] == "Pending" and technician_id is not None:
                update_data["status"] = "In Progress"
                
            response = supabase.table("complaints").update(update_data).eq("id", complaint_id).execute()
            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during technician assignment: {str(e)}"
            )

    @staticmethod
    def update_status(complaint_id: str, new_status: str) -> dict:
        """
        Updates the status of a complaint.
        """
        try:
            complaint_check = supabase.table("complaints").select("id").eq("id", complaint_id).execute()
            if not complaint_check.data or len(complaint_check.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Complaint not found"
                )

            response = supabase.table("complaints").update({"status": new_status}).eq("id", complaint_id).execute()
            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during complaint status update: {str(e)}"
            )
