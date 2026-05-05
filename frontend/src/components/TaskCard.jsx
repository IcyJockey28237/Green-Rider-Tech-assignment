/**
 * TaskCard.jsx — A single task row / card.
 *
 * Props:
 *   task        : TaskRead object from the API
 *   onStatusChange : (taskId, newStatus) => void  (optional)
 *   compact     : boolean — smaller variant for Dashboard overdue list
 */
import { Calendar, User, AlertTriangle } from 'lucide-react'

const STATUS_STYLES = {
  'Todo':        'bg-slate-800 text-slate-300',
  'In Progress': 'bg-brand-900 text-brand-300',
  'Done':        'bg-emerald-900 text-emerald-400',
}

const PRIORITY_STYLES = {
  'Low':    'bg-slate-800 text-slate-400',
  'Medium': 'bg-blue-900 text-blue-300',
  'High':   'bg-amber-900 text-amber-400',
  'Urgent': 'bg-rose-900 text-rose-400',
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'Done') return false
  return new Date(task.due_date) < new Date()
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function TaskCard({ task, onStatusChange, compact = false }) {
  const overdue = isOverdue(task)

  return (
    <div
      className={`
        group relative rounded-xl border transition-all duration-200
        ${overdue
          ? 'border-rose-800/60 bg-rose-950/30 hover:border-rose-700'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Priority + overdue indicator */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${PRIORITY_STYLES[task.priority] ?? 'bg-slate-800 text-slate-400'}`}>
            {task.priority}
          </span>
          {overdue && (
            <span className="badge bg-rose-900 text-rose-400 flex items-center gap-1">
              <AlertTriangle size={10} />
              Overdue
            </span>
          )}
        </div>

        {/* Status selector */}
        {onStatusChange ? (
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className={`badge cursor-pointer border-0 bg-transparent text-right
                        ${STATUS_STYLES[task.status] ?? ''}
                        focus:outline-none focus:ring-1 focus:ring-brand-500 rounded-full`}
          >
            <option value="Todo" className="bg-slate-900 text-slate-100">Todo</option>
            <option value="In Progress" className="bg-slate-900 text-slate-100">In Progress</option>
            <option value="Done" className="bg-slate-900 text-slate-100">Done</option>
          </select>
        ) : (
          <span className={`badge ${STATUS_STYLES[task.status] ?? ''}`}>{task.status}</span>
        )}
      </div>

      {/* Title */}
      <p className={`font-semibold text-slate-100 leading-snug ${compact ? 'text-sm' : 'text-base'}`}>
        {task.title}
      </p>

      {/* Description */}
      {!compact && task.description && (
        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        {task.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-rose-400' : ''}`}>
            <Calendar size={11} />
            {formatDate(task.due_date)}
          </span>
        )}
        {task.assignee && (
          <span className="flex items-center gap-1">
            <User size={11} />
            {task.assignee.full_name}
          </span>
        )}
      </div>
    </div>
  )
}
