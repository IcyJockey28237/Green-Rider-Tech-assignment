"""
models.py — SQLAlchemy ORM models.

Schema:
  users            — application accounts
  projects         — work containers
  project_members  — junction table carrying RBAC role (Admin | Member)
  tasks            — work items belonging to a project
"""
import enum
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


# ─── Enum types (stored as PG ENUM columns) ──────────────────────────────────

class RoleEnum(str, enum.Enum):
    admin  = "Admin"
    member = "Member"


class StatusEnum(str, enum.Enum):
    todo        = "Todo"
    in_progress = "In Progress"
    done        = "Done"


class PriorityEnum(str, enum.Enum):
    low    = "Low"
    medium = "Medium"
    high   = "High"
    urgent = "Urgent"


# ─── Models ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(Text, nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    is_admin        = Column(Boolean, default=False, nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    projects_created = relationship("Project", back_populates="creator")
    memberships      = relationship("ProjectMember", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")
    tasks_assigned   = relationship("Task", foreign_keys="Task.assigned_to", back_populates="assignee")
    tasks_created    = relationship("Task", foreign_keys="Task.created_by", back_populates="creator")


class Team(Base):
    __tablename__ = "teams"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    members  = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_user"),
    )

    id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    role    = Column(Enum(RoleEnum, name="teamroleenum"), nullable=False, default=RoleEnum.member)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")


class Project(Base):
    __tablename__ = "projects"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id     = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    name        = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by  = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    team    = relationship("Team", back_populates="projects")
    creator = relationship("User", back_populates="projects_created")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks   = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    """
    Many-to-many junction between users and projects.
    The `role` column drives RBAC: Admin can create/delete tasks and manage members.
    """
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_user"),
    )

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    role       = Column(Enum(RoleEnum, name="roleenum"), nullable=False, default=RoleEnum.member)
    joined_at  = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="members")
    user    = relationship("User",    back_populates="memberships")


class Task(Base):
    __tablename__ = "tasks"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id  = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="SET NULL"), nullable=True)
    created_by  = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"),  nullable=False)
    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status      = Column(Enum(StatusEnum,   name="statusenum"),   nullable=False, default=StatusEnum.todo)
    priority    = Column(Enum(PriorityEnum, name="priorityenum"), nullable=False, default=PriorityEnum.medium)
    due_date    = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project  = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="tasks_assigned")
    creator  = relationship("User", foreign_keys=[created_by],  back_populates="tasks_created")
