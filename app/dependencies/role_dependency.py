from fastapi import Depends, HTTPException, status
from typing import List
from app.dependencies.auth_dependency import get_current_user

class RoleChecker:
    """
    Dependency to restrict endpoint access based on the user's role.
    Usage: Depends(RoleChecker(["admin"]))
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{user_role}' does not have permission for this resource"
            )
        return current_user
