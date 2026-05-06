"""
dependencies.py — Reusable FastAPI dependency functions.

Dependency chain:
  get_db()                    → yields SQLAlchemy Session
  get_current_active_user()   → decodes JWT, returns User (HTTP 401 on failure)
  ProjectAdminRequired        → class-based dep that checks project-scoped Admin role (HTTP 403)
  require_project_member()    → verifies the user is at least a Member of a project (HTTP 403)
"""
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .auth import decode_access_token
from .database import SessionLocal
from .models import ProjectMember, RoleEnum, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ─── Database session ────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Current user ─────────────────────────────────────────────────────────────

def get_current_active_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the Bearer JWT and return the authenticated User.
    Raises HTTP 401 if the token is missing, expired, or invalid.
    Raises HTTP 401 if the account is deactivated.
    """
    payload = decode_access_token(token)
    user_id: str = payload.get("sub")

    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )
    return user


def require_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Ensures the current user is a global Admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return current_user


# ─── RBAC: Project-scoped Admin check ────────────────────────────────────────

class ProjectAdminRequired:
    """
    Class-based dependency factory.

    FastAPI resolves `project_id` from the path parameter automatically
    because it appears as a typed argument in __call__.

    Usage:
        @router.post("/{project_id}/tasks", dependencies=[Depends(require_project_admin)])
    or as a typed return value:
        admin: User = Depends(require_project_admin)
    """

    def __call__(
        self,
        project_id: UUID,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
                ProjectMember.role == RoleEnum.admin,
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You need Admin privileges for this project.",
            )
        return current_user


require_project_admin = ProjectAdminRequired()


# ─── RBAC: Project-scoped Member check ───────────────────────────────────────

class ProjectMemberRequired:
    """Ensures the current user is at least a Member of the project."""

    def __call__(
        self,
        project_id: UUID,
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this project.",
            )
        return current_user


require_project_member = ProjectMemberRequired()
