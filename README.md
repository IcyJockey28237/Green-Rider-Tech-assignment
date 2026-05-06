# Team Task Manager

A full-stack project and task management application with project-scoped RBAC and global team management features.

## ✨ Features

- **Authentication**: Secure JWT-based authentication (Login/Register).
- **Dashboard**: High-level overview of project progress, active tasks, and overdue items.
- **Project Management**: Create and manage projects with scoped access.
- **Task Management**: Create, update, and assign tasks with priority and due dates.
- **RBAC**: Project-level roles (Admin/Member) and global platform Admin role.
- **Team Management (Admin Only)**: 
    - Create and manage global teams.
    - Assign users to teams.
    - Associate projects with teams for better organization.
- **Real-time Feedback**: Global error handling and forbidden action alerts.
- **Modern UI**: Clean, responsive design built with Tailwind CSS and Lucide icons.

## 🛠 Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Database**: PostgreSQL (via SQLAlchemy ORM)
- **Auth**: JWT (jose), Bcrypt for password hashing
- **Validation**: Pydantic v2

### Frontend
- **Framework**: [React](https://reactjs.org/) (Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **Networking**: Axios

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or any SQL database supported by SQLAlchemy)

### Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment and activate it:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure environment variables:
    Create a `.env` file based on `.env.example`:
    ```env
    DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
    SECRET_KEY=your-secret-key
    CORS_ORIGINS=http://localhost:5173
    ```
5.  Seed the database (this will create tables and sample data):
    ```bash
    python seed.py
    ```
6.  Start the FastAPI server:
    ```bash
    fastapi dev app/main.py
    ```

### Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## 👤 Default Accounts

After running `seed.py`, you can log in with:

- **Admin Account**: `admin@taskmanager.dev` / `Password123!`
- **Member Account**: `member@taskmanager.dev` / `Password123!`

## 📝 License

Distributed under the MIT License.
