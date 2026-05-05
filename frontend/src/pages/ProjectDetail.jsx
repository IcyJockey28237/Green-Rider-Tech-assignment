/**
 * ProjectDetail.jsx — Full project view accessible via /projects/:projectId.
 *
 * Features:
 *   - Project header with role badge and member count
 *   - Completion progress bar
 *   - Task tab filter: All | Todo | In Progress | Done | Overdue
 *   - Interactive status change per task (for Members)
 *   - Create Task modal (Admin only — triggers 403 toast for Members)
 *   - Overdue tasks highlighted automatically
 */
import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckSquare, AlertTriangle, Users, Plus, X,
  Calendar, RefreshCw, Shield, User,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import ProgressBar from '../components/ProgressBar'
import TaskCard from '../components/TaskCard'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['All', 'Todo', 'In Progress', 'Done', 'Overdue']

// ─── Create Task Modal ────────────────────────────────────────────────────────
function CreateTaskModal({ projectId, members, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Medium',
    due_date: '', assigned_to: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        title:       form.title,
        description: form.description || null,
        priority:    form.priority,
        due_date:    form.due_date ? new Date(form.due_date).toISOString() : null,
        assigned_to: form.assigned_to || null,
      }
      await client.post(`/projects/${projectId}/tasks`, payload)
      onCreated()
      onClose()
    } catch (err) {
      // 403 is handled globally by ForbiddenAlert; only show other errors here
      if (err.response?.status !== 403) {
        setError(err.response?.data?.detail ?? 'Failed to create task.')
      } else {
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg card animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-100">Create Task</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-sm text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="label">Title <span className="text-rose-500">*</span></label>
            <input
              id="task-title"
              name="title"
              required
              value={form.title}
              onChange={handleChange}
              placeholder="Task title"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="task-description" className="label">Description</label>
            <textarea
              id="task-description"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              placeholder="Optional details…"
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="label">Priority</label>
              <select id="task-priority" name="priority" value={form.priority} onChange={handleChange} className="input">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="label">Due date</label>
              <input
                id="task-due"
                name="due_date"
                type="datetime-local"
                value={form.due_date}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-assign" className="label">Assign to</label>
            <select id="task-assign" name="assigned_to" value={form.assigned_to} onChange={handleChange} className="input">
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.user.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Plus size={16} />
              }
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { projectId } = useParams()
  const { user } = useAuth()

  const [project,  setProject]  = useState(null)
  const [tasks,    setTasks]    = useState([])
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [showModal, setShowModal] = useState(false)

  // Derived: current user's role in this project
  const myMembership  = members.find(m => m.user_id === user?.id)
  const isAdmin       = myMembership?.role === 'Admin'

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projRes, tasksRes, membersRes] = await Promise.all([
        client.get(`/projects/${projectId}`),
        client.get(`/projects/${projectId}/tasks`),
        client.get(`/projects/${projectId}/members`),
      ])
      setProject(projRes.data)
      setTasks(tasksRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      setError('Failed to load project data.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Task status update ─────────────────────────────────────────────────────
  async function handleStatusChange(taskId, newStatus) {
    try {
      await client.patch(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      // 403 is handled globally
    }
  }

  // ── Task filtering ─────────────────────────────────────────────────────────
  const now = new Date()
  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'All')         return true
    if (activeTab === 'Overdue')     return t.due_date && new Date(t.due_date) < now && t.status !== 'Done'
    return t.status === activeTab
  })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const doneTasks     = tasks.filter(t => t.status === 'Done').length
  const activeTasks   = tasks.filter(t => t.status !== 'Done').length
  const overdueTasks  = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'Done').length
  const completionPct = tasks.length ? (doneTasks / tasks.length) * 100 : 0

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = {
    'All':         tasks.length,
    'Todo':        tasks.filter(t => t.status === 'Todo').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    'Done':        doneTasks,
    'Overdue':     overdueTasks,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="card text-rose-400 text-sm">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400
                                          hover:text-slate-200 mb-6 transition-colors">
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>

        {/* ── Project header ───────────────────────────────────────────────── */}
        <div className="card mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-100 truncate">{project?.name}</h1>
                <span className={`badge ${isAdmin ? 'bg-brand-900 text-brand-300' : 'bg-slate-800 text-slate-400'}`}>
                  {isAdmin ? <><Shield size={10} className="inline mr-1" />Admin</> : 'Member'}
                </span>
              </div>
              {project?.description && (
                <p className="text-slate-400 text-sm">{project.description}</p>
              )}
            </div>

            {/* Admin: create task button */}
            <button
              onClick={() => setShowModal(true)}
              id="btn-create-task"
              className={`btn-primary shrink-0 ${!isAdmin ? 'opacity-60' : ''}`}
              title={!isAdmin ? 'Admin role required' : 'Create a new task'}
            >
              <Plus size={16} />
              New Task
            </button>
          </div>

          {/* Stats mini-row */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckSquare size={14} className="text-brand-400" />
              {activeTasks} active
            </span>
            <span className="flex items-center gap-1.5">
              <CheckSquare size={14} className="text-emerald-400" />
              {doneTasks} done
            </span>
            {overdueTasks > 0 && (
              <span className="flex items-center gap-1.5 text-rose-400">
                <AlertTriangle size={14} />
                {overdueTasks} overdue
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-500" />
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Completion progress */}
          <div className="mt-4">
            <ProgressBar pct={completionPct} label="Project completion" />
          </div>
        </div>

        {/* ── Members strip ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-slate-500 mr-1">Team:</span>
          {members.map(m => (
            <div
              key={m.id}
              title={`${m.user.full_name} — ${m.role}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                         bg-slate-800 border border-slate-700 text-xs text-slate-300"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold
                              ${m.role === 'Admin' ? 'bg-brand-600' : 'bg-slate-600'}`}>
                {m.user.full_name[0].toUpperCase()}
              </div>
              {m.user.full_name.split(' ')[0]}
              {m.role === 'Admin' && <Shield size={9} className="text-brand-400" />}
            </div>
          ))}
        </div>

        {/* ── Task tabs ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                whitespace-nowrap transition-all duration-200
                ${activeTab === tab
                  ? tab === 'Overdue'
                    ? 'bg-rose-900 text-rose-300'
                    : 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}
              `}
            >
              {tab}
              <span className={`
                inline-flex items-center justify-center w-5 h-5 rounded-full text-xs
                ${activeTab === tab ? 'bg-white/20' : 'bg-slate-800'}
              `}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}

          <button
            onClick={fetchAll}
            className="ml-auto btn-ghost py-1.5 px-2.5"
            title="Refresh tasks"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* ── Task list ────────────────────────────────────────────────────── */}
        {filteredTasks.length === 0 ? (
          <div className="card text-center py-16">
            <CheckSquare size={36} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-400">No tasks in this view.</p>
            {isAdmin && (
              <button onClick={() => setShowModal(true)} className="btn-primary mx-auto mt-4">
                <Plus size={16} /> Create first task
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Create task modal ─────────────────────────────────────────────── */}
      {showModal && (
        <CreateTaskModal
          projectId={projectId}
          members={members}
          onClose={() => setShowModal(false)}
          onCreated={fetchAll}
        />
      )}
    </div>
  )
}
