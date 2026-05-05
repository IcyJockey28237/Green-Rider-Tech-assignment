"""
routers/users.py — Current-user profile endpoints.

GET /users/me  → returns the authenticated user's profile
"""
from fastapi import APIRouter, Depends

from ..dependencies import get_current_active_user
from ..models import User
from ..schemas import UserRead

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_active_user)):
    """Return the currently authenticated user's profile."""
    return current_user
