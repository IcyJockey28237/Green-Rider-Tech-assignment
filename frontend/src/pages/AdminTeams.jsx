import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, RefreshCw, ArrowRight, Shield } from 'lucide-react'
import Navbar from '../components/Navbar'
import client from '../api/client'

export default function AdminTeams() {
  const [teams, setTeams]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  async function fetchTeams() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get('/teams')
      setTeams(data)
    } catch (err) {
      setError('Failed to load teams.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeams() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await client.post('/teams', newTeam)
      setNewTeam({ name: '', description: '' })
      setShowForm(false)
      fetchTeams()
    } catch (err) {
      setError('Failed to create team.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Shield className="text-brand-500" size={24} />
              Team Management
            </h1>
            <p className="text-slate-400 mt-1">Manage global teams and their memberships</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchTeams} className="btn-ghost" disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              <Plus size={16} />
              Create Team
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <div className="card mb-8 animate-slide-up border-brand-500/50">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">New Team</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Team Name</label>
                <input
                  required
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Design Team"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={newTeam.description}
                  onChange={e => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="input"
                  placeholder="What does this team do?"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && teams.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card h-32 animate-pulse bg-slate-900/50" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="card text-center py-20">
            <Users size={40} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400">No teams found. Create your first team to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <Link
                key={team.id}
                to={`/admin/teams/${team.id}`}
                className="card group hover:border-brand-500/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-100 group-hover:text-brand-400 transition-colors">
                    {team.name}
                  </h3>
                  <ArrowRight size={16} className="text-slate-600 group-hover:text-brand-400 transition-all" />
                </div>
                <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">
                  {team.description || 'No description provided.'}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
