"""
schemas.py — Pydantic v2 request / response models.

Key Pydantic v2 patterns used:
  - model_config = ConfigDict(from_attributes=True)  (replaces orm_mode)
  - str | None  instead of Optional[str]
  - UUID imported from uuid (standard library)
"""
from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from .models import RoleEnum, StatusEnum, PriorityEnum


# ─── Auth / Token ─────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── User ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime


# ─── Project ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    created_by: UUID
    created_at: datetime


class ProjectReadWithStats(ProjectRead):
    """Extended response that includes computed task statistics."""
    total_tasks: int = 0
    done_tasks: int = 0
    overdue_tasks: int = 0
    completion_pct: float = 0.0
    user_role: str = "Member"


# ─── Project Members ─────────────────────────────────────────────────────────

class MemberAdd(BaseModel):
    user_id: UUID
    role: RoleEnum = RoleEnum.member


class MemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    role: RoleEnum
    joined_at: datetime
    user: UserRead


# ─── Tasks ───────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: PriorityEnum = PriorityEnum.medium
    due_date: datetime | None = None
    assigned_to: UUID | None = None


class TaskUpdate(BaseModel):
    """All fields optional — supports partial PATCH updates."""
    title: str | None = None
    description: str | None = None
    status: StatusEnum | None = None
    priority: PriorityEnum | None = None
    due_date: datetime | None = None
    assigned_to: UUID | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    created_by: UUID
    assigned_to: UUID | None
    title: str
    description: str | None
    status: StatusEnum
    priority: PriorityEnum
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime
    assignee: UserRead | None = None


# ─── Dashboard stats ─────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_active_tasks: int
    total_done_tasks: int
    total_overdue_tasks: int
    projects: list[ProjectReadWithStats]
