from fastapi import HTTPException, status
from app.config.supabase_client import supabase
from app.models.user_models import UserRegister, UserLogin
from app.utils.jwt_handler import hash_password, verify_password, create_access_token

class AuthService:
    @staticmethod
    def register(user_in: UserRegister) -> dict:
        """
        Registers a new user after verifying that the email is unique.
        """
        email = user_in.email.lower().strip()
        
        # Check if email is already registered
        try:
            check_response = supabase.table("users").select("id").eq("email", email).execute()
            if check_response.data and len(check_response.data) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already registered"
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during register verification: {str(e)}"
            )

        # Hash password and store user
        hashed = hash_password(user_in.password)
        user_data = {
            "name": user_in.name,
            "email": email,
            "password": hashed,
            "role": user_in.role or "member"
        }

        try:
            insert_response = supabase.table("users").insert(user_data).execute()
            if not insert_response.data or len(insert_response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="User registration failed: database record was not created"
                )
            return insert_response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during registration insert: {str(e)}"
            )

    @staticmethod
    def login(user_in: UserLogin) -> dict:
        """
        Authenticates a user and issues a JWT access token.
        """
        email = user_in.email.lower().strip()
        
        try:
            response = supabase.table("users").select("*").eq("email", email).execute()
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            user = response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during login fetch: {str(e)}"
            )

        # Validate password
        if not verify_password(user_in.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Create access token payload
        token_payload = {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
        
        access_token = create_access_token(data=token_payload)
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
