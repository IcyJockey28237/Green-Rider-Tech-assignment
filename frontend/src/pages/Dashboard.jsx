/**
 * Dashboard.jsx — Main overview page.
 *
 * Fetches /stats/dashboard in a single request to get:
 *   - Global counts: active tasks, done tasks, overdue tasks
 *   - Per-project: name, completion %, task counts, user role
 *
 * Sections:
 *   1. Stats row  (3 cards: active / done / overdue)
 *   2. Projects grid  (progress bar + role badge + link)
 *   3. Overdue tasks across all projects (compact TaskCard list)
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckSquare, TrendingUp, AlertTriangle,
  Folders, ArrowRight, Plus, RefreshCw,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import ProgressBar from '../components/ProgressBar'
import client from '../api/client'

function StatCard({ icon: Icon, label, value, colorClass, loading }) {
  return (
    <div className="card flex items-center gap-4 animate-slide-up">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        {loading
          ? <div className="h-7 w-12 bg-slate-800 rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold text-slate-100">{value}</p>
        }
      </div>
    </div>
  )
}

function ProjectCard({ project }) {
  const roleColor =
    project.user_role === 'Admin' ? 'bg-brand-900 text-brand-300' : 'bg-slate-800 text-slate-400'

  return (
    <Link
      to={`/projects/${project.id}`}
      className="card flex flex-col gap-4 hover:border-brand-700 hover:shadow-brand-500/10
                 transition-all duration-200 group animate-slide-up"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 truncate group-hover:text-brand-300 transition-colors">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge ${roleColor}`}>{project.user_role}</span>
          <ArrowRight size={16} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
        </div>
      </div>

      <ProgressBar pct={project.completion_pct} label={`${project.done_tasks} / ${project.total_tasks} tasks done`} />

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CheckSquare size={11} />
          {project.total_tasks} tasks
        </span>
        {project.overdue_tasks > 0 && (
          <span className="flex items-center gap-1 text-rose-400">
            <AlertTriangle size={11} />
            {project.overdue_tasks} overdue
          </span>
        )}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get('/stats/dashboard')
      setStats(data)
    } catch (err) {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  // Flatten overdue tasks from all projects for the bottom section
  // (We'll fetch them separately per project — for dashboard we rely on counts)
  const overdueTasks = stats?.projects?.flatMap(p =>
    Array.from({ length: p.overdue_tasks }, (_, i) => ({
      _projectName: p.name,
      _projectId: p.id,
    }))
  ) ?? []

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
            <p className="text-slate-400 mt-1">Overview of all your projects and tasks</p>
          </div>
          <button
            onClick={fetchStats}
            className="btn-ghost"
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            icon={CheckSquare}
            label="Active Tasks"
            value={stats?.total_active_tasks ?? 0}
            colorClass="bg-brand-600"
            loading={loading}
          />
          <StatCard
            icon={TrendingUp}
            label="Completed Tasks"
            value={stats?.total_done_tasks ?? 0}
            colorClass="bg-emerald-600"
            loading={loading}
          />
          <StatCard
            icon={AlertTriangle}
            label="Overdue Tasks"
            value={stats?.total_overdue_tasks ?? 0}
            colorClass="bg-rose-600"
            loading={loading}
          />
        </div>

        {/* ── Projects grid ─────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Folders size={18} className="text-brand-400" />
              Your Projects
            </h2>
            <span className="text-sm text-slate-500">
              {stats?.projects?.length ?? 0} project{stats?.projects?.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-5 bg-slate-800 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-800 rounded w-full mb-4" />
                  <div className="h-2 bg-slate-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : stats?.projects?.length === 0 ? (
            <div className="card text-center py-12">
              <Folders size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="text-slate-400">You haven&apos;t joined any projects yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stats?.projects?.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </section>

        {/* ── Overdue summary ───────────────────────────────────────────────── */}
        {!loading && stats?.total_overdue_tasks > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-rose-400" />
              Overdue Summary
              <span className="badge bg-rose-900 text-rose-400 ml-1">
                {stats.total_overdue_tasks}
              </span>
            </h2>
            <div className="card">
              <p className="text-slate-400 text-sm mb-4">
                You have <strong className="text-rose-400">{stats.total_overdue_tasks}</strong> overdue
                tasks across {stats.projects.filter(p => p.overdue_tasks > 0).length} projects.
                Open a project to view and update them.
              </p>
              <div className="space-y-2">
                {stats.projects.filter(p => p.overdue_tasks > 0).map(p => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between p-3 rounded-xl
                               bg-rose-950/30 border border-rose-900/50 hover:border-rose-700
                               transition-all duration-200 group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-200 group-hover:text-rose-300 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-xs text-rose-400 mt-0.5">
                        {p.overdue_tasks} overdue task{p.overdue_tasks !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-rose-600 group-hover:text-rose-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
