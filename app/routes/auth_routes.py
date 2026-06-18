from fastapi import APIRouter, status
from app.models.user_models import UserRegister, UserLogin, UserResponse
from app.models.auth_models import Token
from app.services.auth_service import AuthService

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
