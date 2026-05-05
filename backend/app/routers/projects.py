"""
routers/projects.py — Project CRUD and member management.

POST   /projects/                          → create project (creator becomes Admin)
GET    /projects/                          → list projects the current user belongs to
GET    /projects/{project_id}              → project detail + members
POST   /projects/{project_id}/members     → add member [Admin only]
DELETE /projects/{project_id}/members/{user_id}  → remove member [Admin only]
GET    /projects/{project_id}/members     → list members [Member+]
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_current_active_user, get_db, require_project_admin, require_project_member
from ..models import Project, ProjectMember, RoleEnum, User
from ..schemas import MemberAdd, MemberRead, ProjectCreate, ProjectRead

router = APIRouter(prefix="/projects", tags=["Projects"])


# ─── Create project ───────────────────────────────────────────────────────────

@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new project. The creator is automatically added as Admin."""
    project = Project(
        name=payload.name,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(project)
    db.flush()  # assign ID before creating membership

    membership = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=RoleEnum.admin,
    )
    db.add(membership)
    db.commit()
    db.refresh(project)
    return project


# ─── List user's projects ─────────────────────────────────────────────────────

@router.get("/", response_model=list[ProjectRead])
def list_projects(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return all projects where the current user is a member."""
    memberships = (
        db.query(ProjectMember)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )
    project_ids = [m.project_id for m in memberships]
    return db.query(Project).filter(Project.id.in_(project_ids)).all()


# ─── Project detail ───────────────────────────────────────────────────────────

@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: UUID,
    current_user: User = Depends(require_project_member),
    db: Session = Depends(get_db),
):
    """Return a single project. Requires membership."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return project


# ─── Member management ────────────────────────────────────────────────────────

@router.get("/{project_id}/members", response_model=list[MemberRead])
def list_members(
    project_id: UUID,
    current_user: User = Depends(require_project_member),
    db: Session = Depends(get_db),
):
    """List all members of a project."""
    return db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()


@router.post("/{project_id}/members", response_model=MemberRead, status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: UUID,
    payload: MemberAdd,
    admin: User = Depends(require_project_admin),   # ← 403 if not Admin
    db: Session = Depends(get_db),
):
    """Add a user to the project. Admin-only."""
    # Verify target user exists
    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found.")

    # Check for existing membership
    existing = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == payload.user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member.")

    membership = ProjectMember(
        project_id=project_id,
        user_id=payload.user_id,
        role=payload.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_project_admin),   # ← 403 if not Admin
    db: Session = Depends(get_db),
):
    """Remove a member from the project. Admin-only. Cannot remove yourself."""
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove yourself.")

    membership = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    db.delete(membership)
    db.commit()
