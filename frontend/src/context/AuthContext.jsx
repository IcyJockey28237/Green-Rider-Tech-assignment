/**
 * AuthContext.jsx — Global authentication state.
 *
 * Provides:
 *   - user      : currently logged-in user object (or null)
 *   - token     : JWT string (or null)
 *   - login()   : stores token + user, redirects to dashboard
 *   - logout()  : clears storage, redirects to login
 *   - isLoading : true while restoring session from localStorage
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // ── Restore session from localStorage on mount ───────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    const storedUser  = localStorage.getItem('user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)

    // Fetch user profile immediately after login
    const { data: me } = await client.get('/users/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    localStorage.setItem('user', JSON.stringify(me))

    setToken(data.access_token)
    setUser(me)
    navigate('/dashboard')
  }, [navigate])

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    navigate('/login')
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
