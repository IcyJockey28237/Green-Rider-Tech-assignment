/**
 * Navbar.jsx — Top navigation bar.
 */
import { Link } from 'react-router-dom'
import { CheckSquare, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center
                          shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
            <CheckSquare size={18} className="text-white" />
          </div>
          <span className="font-bold text-slate-100 text-lg tracking-tight">TaskFlow</span>
        </Link>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800
                       transition-all duration-200"
          >
            <LayoutDashboard size={15} />
            Dashboard
          </Link>

          {user && (
            <>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center
                              text-white text-sm font-bold select-none">
                {user.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="hidden md:block text-sm text-slate-400 max-w-[140px] truncate">
                {user.full_name}
              </span>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-950
                           transition-all duration-200"
                title="Log out"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
