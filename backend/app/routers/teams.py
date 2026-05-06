"""
teams.py — Team management for global Admins.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db, require_admin
from ..models import Team, TeamMember, User, RoleEnum
from ..schemas import (
    TeamCreate, TeamUpdate, TeamRead, TeamReadWithMembers,
    TeamMemberAdd, TeamMemberRead
)

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("", response_model=list[TeamRead])
def list_teams(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all teams (Admin only)."""
    return db.query(Team).all()


@router.post("", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new team (Admin only)."""
    team = Team(**payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.get("/{team_id}", response_model=TeamReadWithMembers)
def get_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get team details and members (Admin only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.patch("/{team_id}", response_model=TeamRead)
def update_team(
    team_id: UUID,
    payload: TeamUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update team details (Admin only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(team, k, v)

    db.commit()
    db.refresh(team)
    return team


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a team (Admin only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    db.delete(team)
    db.commit()


# ─── Team Members ────────────────────────────────────────────────────────────

@router.post("/{team_id}/members", response_model=TeamMemberRead)
def add_team_member(
    team_id: UUID,
    payload: TeamMemberAdd,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Add a user to a team (Admin only)."""
    # Check if team exists
    if not db.query(Team).filter(Team.id == team_id).first():
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if user exists
    if not db.query(User).filter(User.id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == payload.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this team")

    member = TeamMember(team_id=team_id, **payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Remove a user from a team (Admin only)."""
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team membership not found")

    db.delete(member)
    db.commit()
