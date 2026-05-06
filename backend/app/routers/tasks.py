"""
routers/tasks.py — Task CRUD, overdue endpoint, and dashboard stats.

POST   /projects/{project_id}/tasks              → create task [Admin only]
GET    /projects/{project_id}/tasks              → list tasks [Member+]
GET    /projects/{project_id}/tasks/overdue      → overdue tasks [Member+]
PATCH  /projects/{project_id}/tasks/{task_id}   → update task [Member+]
DELETE /projects/{project_id}/tasks/{task_id}   → delete task [Admin only]

GET    /stats/dashboard                          → aggregated dashboard data
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..dependencies import (
    get_current_active_user,
    get_db,
    require_project_admin,
    require_project_member,
)
from ..models import Project, ProjectMember, RoleEnum, StatusEnum, Task, User
from ..schemas import (
    DashboardStats,
    ProjectReadWithStats,
    TaskCreate,
    TaskRead,
    TaskUpdate,
)

router = APIRouter(tags=["Tasks"])


# ─── Helper ───────────────────────────────────────────────────────────────────

def _get_task_or_404(task_id: UUID, project_id: UUID, db: Session) -> Task:
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.project_id == project_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    return task


# ─── Task CRUD ────────────────────────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    project_id: UUID,
    payload: TaskCreate,
    admin: User = Depends(require_project_admin),   # ← HTTP 403 for non-Admins
    db: Session = Depends(get_db),
):
    """Create a task in the project. Requires Admin role."""
    task = Task(
        project_id=project_id,
        created_by=admin.id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        assigned_to=payload.assigned_to,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/projects/{project_id}/tasks", response_model=list[TaskRead])
def list_tasks(
    project_id: UUID,
    current_user: User = Depends(require_project_member),
    db: Session = Depends(get_db),
):
    """List all tasks in a project. Requires membership."""
    return (
        db.query(Task)
        .options(joinedload(Task.assignee))
        .filter(Task.project_id == project_id)
        .order_by(Task.created_at.desc())
        .all()
    )


@router.get("/projects/{project_id}/tasks/overdue", response_model=list[TaskRead])
def list_overdue_tasks(
    project_id: UUID,
    current_user: User = Depends(require_project_member),
    db: Session = Depends(get_db),
):
    """
    Return tasks where due_date < NOW() and status is not 'Done'.
    Uses the server's UTC clock — no client-side date manipulation needed.
    """
    now = datetime.now(timezone.utc)
    return (
        db.query(Task)
        .options(joinedload(Task.assignee))
        .filter(
            Task.project_id == project_id,
            Task.due_date < now,
            Task.status != StatusEnum.done,
        )
        .order_by(Task.due_date.asc())   # most overdue first
        .all()
    )


@router.patch("/projects/{project_id}/tasks/{task_id}", response_model=TaskRead)
def update_task(
    project_id: UUID,
    task_id: UUID,
    payload: TaskUpdate,
    current_user: User = Depends(require_project_member),
    db: Session = Depends(get_db),
):
    """Partially update a task. Any member can change status/assignment."""
    task = _get_task_or_404(task_id, project_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/projects/{project_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    project_id: UUID,
    task_id: UUID,
    admin: User = Depends(require_project_admin),   # ← HTTP 403 for non-Admins
    db: Session = Depends(get_db),
):
    """Delete a task. Requires Admin role."""
    task = _get_task_or_404(task_id, project_id, db)
    db.delete(task)
    db.commit()


# ─── Dashboard stats ─────────────────────────────────────────────────────────

@router.get("/stats/dashboard", response_model=DashboardStats)
def dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Aggregate dashboard data in a single request:
      - total active / done / overdue task counts
      - per-project breakdown with completion percentage and user role
    """
    # Fetch all projects this user belongs to
    memberships = (
        db.query(ProjectMember)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )
    role_by_project = {str(m.project_id): m.role for m in memberships}
    project_ids = list(role_by_project.keys())

    projects = db.query(Project).filter(Project.id.in_(project_ids)).all()

    now = datetime.now(timezone.utc)

    total_active = 0
    total_done = 0
    total_overdue = 0
    project_stats: list[ProjectReadWithStats] = []

    for proj in projects:
        all_tasks = db.query(Task).filter(Task.project_id == proj.id).all()
        done_tasks = [t for t in all_tasks if t.status == StatusEnum.done]
        active_tasks = [t for t in all_tasks if t.status != StatusEnum.done]
        overdue_tasks = [
            t for t in active_tasks
            if t.due_date and t.due_date.replace(tzinfo=timezone.utc) < now
        ]

        n_total = len(all_tasks)
        n_done = len(done_tasks)
        n_overdue = len(overdue_tasks)
        pct = round((n_done / n_total) * 100, 1) if n_total else 0.0

        total_active += len(active_tasks)
        total_done += n_done
        total_overdue += n_overdue

        project_stats.append(
            ProjectReadWithStats(
                id=proj.id,
                name=proj.name,
                description=proj.description,
                team_id=proj.team_id,
                created_by=proj.created_by,
                created_at=proj.created_at,
                total_tasks=n_total,
                done_tasks=n_done,
                overdue_tasks=n_overdue,
                completion_pct=pct,
                user_role=role_by_project[str(proj.id)].value,
            )
        )

    return DashboardStats(
        total_active_tasks=total_active,
        total_done_tasks=total_done,
        total_overdue_tasks=total_overdue,
        projects=project_stats,
    )
