"""
seed.py — Populate the database with realistic fake data using the Faker library.

Generates:
  - 6 users  (1 super-admin, 5 regular)
  - 3 projects
  - Each project has 1 Admin + 2-4 Members
  - 8-12 tasks per project with mixed statuses, priorities, and due dates
    (including deliberately overdue tasks so the Dashboard is interesting)

Run from the backend/ directory:
    python seed.py

All generated accounts use the password: "Password123!"
"""
import os
import sys
import random
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

# ─── Bootstrap path so we can import app modules ─────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
load_dotenv()

from app.auth import get_password_hash
from app.database import SessionLocal, engine, Base
from app.models import (
    PriorityEnum,
    Project,
    ProjectMember,
    RoleEnum,
    StatusEnum,
    Task,
    User,
)

try:
    from faker import Faker
except ImportError:
    print("❌  Faker not installed. Run:  pip install faker")
    sys.exit(1)

fake = Faker()
Faker.seed(42)
random.seed(42)

DEMO_PASSWORD = "Password123!"
HASHED_DEMO_PASSWORD = get_password_hash(DEMO_PASSWORD)


def _random_past(days: int = 30) -> datetime:
    """Return a random datetime in the past N days (UTC, timezone-aware)."""
    delta = random.randint(1, days)
    return datetime.now(timezone.utc) - timedelta(days=delta)


def _random_future(days: int = 30) -> datetime:
    delta = random.randint(1, days)
    return datetime.now(timezone.utc) + timedelta(days=delta)


def _random_due_date() -> datetime:
    """
    70 % chance of a past due date (so many tasks appear overdue),
    30 % chance of a future due date.
    """
    if random.random() < 0.7:
        return _random_past(days=20)
    return _random_future(days=20)


def seed():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Wipe existing seed data (idempotent re-runs) ──────────────────────
        print("🗑  Clearing existing data …")
        db.query(Task).delete()
        db.query(ProjectMember).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()

        # ── Create users ──────────────────────────────────────────────────────
        print("👤  Creating users …")
        users = []
        # First user is the "platform admin" who owns all projects
        admin_user = User(
            email="admin@taskmanager.dev",
            full_name="Alex Morgan (Admin)",
            hashed_password=HASHED_DEMO_PASSWORD,
        )
        db.add(admin_user)
        users.append(admin_user)

        # Second user is the "demo member"
        member_user = User(
            email="member@taskmanager.dev",
            full_name="Sam Smith (Member)",
            hashed_password=HASHED_DEMO_PASSWORD,
        )
        db.add(member_user)
        users.append(member_user)

        for _ in range(4):
            u = User(
                email=fake.unique.email(),
                full_name=fake.name(),
                hashed_password=HASHED_DEMO_PASSWORD,
            )
            db.add(u)
            users.append(u)

        db.flush()
        print(f"   ✔  {len(users)} users created")

        # ── Create projects ───────────────────────────────────────────────────
        print("📁  Creating projects …")
        project_data = [
            {
                "name": "Apollo CRM Redesign",
                "description": "Full redesign of the customer relationship management platform with modern UX patterns.",
            },
            {
                "name": "Hermes API Gateway",
                "description": "Build a unified API gateway to consolidate microservices and enforce rate limiting.",
            },
            {
                "name": "Athena Analytics Dashboard",
                "description": "Real-time analytics dashboard for business KPIs with drill-down capabilities.",
            },
        ]

        projects = []
        for pd in project_data:
            p = Project(
                name=pd["name"],
                description=pd["description"],
                created_by=admin_user.id,
            )
            db.add(p)
            projects.append(p)

        db.flush()
        print(f"   ✔  {len(projects)} projects created")

        # ── Assign members ────────────────────────────────────────────────────
        print("🤝  Assigning project members …")
        for proj in projects:
            # admin_user is Admin on every project
            db.add(ProjectMember(project_id=proj.id, user_id=admin_user.id, role=RoleEnum.admin))

            # member_user is Member on every project
            db.add(ProjectMember(project_id=proj.id, user_id=member_user.id, role=RoleEnum.member))

            # Pick 1-3 random members from the remaining users
            member_candidates = [u for u in users if u.id not in (admin_user.id, member_user.id)]
            chosen = random.sample(member_candidates, k=random.randint(1, 3))
            for u in chosen:
                db.add(ProjectMember(project_id=proj.id, user_id=u.id, role=RoleEnum.member))

        db.flush()
        print("   ✔  Memberships assigned")

        # ── Create tasks ──────────────────────────────────────────────────────
        print("✅  Creating tasks …")
        task_templates = [
            "Implement {feature} module",
            "Write unit tests for {feature}",
            "Design {feature} UI mockups",
            "Code review: {feature} PR",
            "Deploy {feature} to staging",
            "Fix {feature} performance regression",
            "Document {feature} API endpoints",
            "Refactor {feature} to use new patterns",
            "Add {feature} error handling",
            "Sync {feature} with design team",
        ]
        features = [
            "authentication", "dashboard", "notification", "reporting",
            "search", "payment", "onboarding", "data export", "webhook",
            "settings", "admin panel", "audit log",
        ]

        statuses = list(StatusEnum)
        priorities = list(PriorityEnum)

        total_tasks = 0
        for proj in projects:
            # Get all member user IDs for this project
            members = db.query(ProjectMember).filter(ProjectMember.project_id == proj.id).all()
            member_ids = [m.user_id for m in members]

            n_tasks = random.randint(8, 12)
            for i in range(n_tasks):
                template = random.choice(task_templates)
                feature = random.choice(features)
                title = template.format(feature=feature)

                # Weight statuses toward Todo/In Progress to make active count high
                status = random.choices(
                    statuses,
                    weights=[40, 35, 25],  # Todo, In Progress, Done
                    k=1,
                )[0]

                task = Task(
                    project_id=proj.id,
                    created_by=admin_user.id,
                    assigned_to=random.choice(member_ids),
                    title=title,
                    description=fake.paragraph(nb_sentences=2),
                    status=status,
                    priority=random.choice(priorities),
                    due_date=_random_due_date(),
                )
                db.add(task)
                total_tasks += 1

        db.commit()
        print(f"   ✔  {total_tasks} tasks created")

        # ── Summary ───────────────────────────────────────────────────────────
        print("\n" + "═" * 52)
        print("🎉  Seed complete!")
        print("═" * 52)
        print(f"  Admin Login   : admin@taskmanager.dev")
        print(f"  Member Login  : member@taskmanager.dev")
        print(f"  Password      : {DEMO_PASSWORD}")
        print(f"  Projects      : {len(projects)}")
        print(f"  Users         : {len(users)}")
        print(f"  Tasks         : {total_tasks}")
        print("═" * 52)

    except Exception as exc:
        db.rollback()
        print(f"\n❌  Seed failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
