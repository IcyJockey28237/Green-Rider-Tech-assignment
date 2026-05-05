/**
 * ForbiddenAlert.jsx
 *
 * Listens for the global 'forbidden' CustomEvent dispatched by the Axios
 * interceptor whenever a 403 response is received. Renders a toast
 * notification that auto-dismisses after 5 seconds.
 *
 * This component must be mounted once at the root (App.jsx) to work globally.
 */
import { useEffect, useState } from 'react'
import { ShieldX, X } from 'lucide-react'

export default function ForbiddenAlert() {
  const [message, setMessage] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      setMessage(e.detail ?? 'You do not have permission to perform this action.')
      setVisible(true)
    }
    window.addEventListener('forbidden', handler)
    return () => window.removeEventListener('forbidden', handler)
  }, [])

  // Auto-dismiss after 5 s
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 right-4 z-50 max-w-sm w-full animate-slide-up"
    >
      <div className="flex items-start gap-3 p-4 rounded-2xl
                      bg-rose-950 border border-rose-700 shadow-2xl shadow-rose-900/40">
        <ShieldX className="text-rose-400 mt-0.5 shrink-0" size={20} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-rose-300 text-sm">Access Denied</p>
          <p className="text-rose-400 text-xs mt-0.5 leading-relaxed">{message}</p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-rose-500 hover:text-rose-300 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
