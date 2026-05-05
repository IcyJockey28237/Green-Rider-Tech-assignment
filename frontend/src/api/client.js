/**
 * client.js — Axios instance with:
 *   - Base URL pointing to FastAPI via Vite proxy
 *   - Request interceptor: attaches JWT from localStorage
 *   - Response interceptor: dispatches 'forbidden' custom event on HTTP 403
 *     so any component tree can react without prop-drilling
 */
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request: attach Bearer token ────────────────────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response: handle 401 and 403 globally ───────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    if (error.response?.status === 403) {
      // Project-scoped RBAC failure — broadcast so ForbiddenAlert can show
      const detail = error.response.data?.detail ?? 'You do not have permission to perform this action.'
      window.dispatchEvent(new CustomEvent('forbidden', { detail }))
    }

    return Promise.reject(error)
  }
)

export default client
