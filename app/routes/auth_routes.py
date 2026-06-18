from fastapi import APIRouter, status, Depends
from app.models.user_models import UserRegister, UserLogin, UserResponse
from app.models.auth_models import Token
from app.services.auth_service import AuthService
from app.dependencies.auth_dependency import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new society member or admin"
)
def register_user(user_in: UserRegister):
    """
    Registers a new user inside the society database.
    By default, registers as a 'member' role unless explicitly specified otherwise.
    """
    return AuthService.register(user_in)

@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Login to receive a JWT access token"
)
def login_user(user_in: UserLogin):
    """
    Verifies user credentials and issues a JWT token.
    """
    return AuthService.login(user_in)

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current logged in user details"
)
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the profile metadata of the currently authenticated user session.
    """
    return current_user
