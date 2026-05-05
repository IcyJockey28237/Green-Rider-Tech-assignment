
"""
main.py — FastAPI application factory.

Registers all routers, configures CORS, and creates DB tables on startup.
"""
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, projects, tasks, users

load_dotenv()

# ─── Create tables ────────────────────────────────────────────────────────────
# In production, use Alembic migrations instead.
Base.metadata.create_all(bind=engine)


# ─── App factory ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Team Task Manager API",
    description="JWT-authenticated project & task management with project-scoped RBAC.",
    version="1.0.0",
)

# ─── CORS ────────────────────────────────────────────────────────────────────

_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in _origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Team Task Manager API is running."}
