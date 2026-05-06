import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Users, Plus, X, UserMinus, Shield, RefreshCw } from 'lucide-react'
import Navbar from '../components/Navbar'
import client from '../api/client'

export default function TeamDetail() {
  const { teamId } = useParams()
  const [team, setTeam]     = useState(null)
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState('Member')
  const [adding, setAdding] = useState(false)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get(`/teams/${teamId}`)
      setTeam(data)
    } catch (err) {
      setError('Failed to load team details.')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await client.get('/users')
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users')
    }
  }, [])

  useEffect(() => {
    fetchTeam()
    fetchUsers()
  }, [fetchTeam, fetchUsers])

  async function handleAddMember(e) {
    e.preventDefault()
    if (!selectedUser) return
    setAdding(true)
    try {
      await client.post(`/teams/${teamId}/members`, {
        user_id: selectedUser,
        role: selectedRole
      })
      setShowAddModal(false)
      setSelectedUser('')
      fetchTeam()
    } catch (err) {
      alert(err.response?.data?.detail ?? 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveMember(userId) {
    if (!confirm('Are you sure you want to remove this member?')) return
    try {
      await client.delete(`/teams/${teamId}/members/${userId}`)
      fetchTeam()
    } catch (err) {
      alert('Failed to remove member')
    }
  }

  if (loading && !team) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/admin/teams" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6 transition-colors">
          <ArrowLeft size={15} />
          Back to Teams
        </Link>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {team && (
          <>
            <div className="card mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">{team.name}</h1>
                  <p className="text-slate-400 mt-1">{team.description || 'No description provided.'}</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary shrink-0"
                >
                  <Plus size={16} />
                  Add Member
                </button>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Users size={18} className="text-brand-400" />
                  Team Members
                  <span className="badge bg-slate-800 text-slate-400 ml-1">
                    {team.members.length}
                  </span>
                </h2>
                <button onClick={fetchTeam} className="btn-ghost p-2" title="Refresh">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {team.members.map(member => (
                  <div key={member.id} className="card flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                      ${member.role === 'Admin' ? 'bg-brand-600' : 'bg-slate-700'}`}>
                        {member.user.full_name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-slate-100 font-medium flex items-center gap-1.5">
                          {member.user.full_name}
                          {member.role === 'Admin' && <Shield size={12} className="text-brand-400" />}
                        </p>
                        <p className="text-xs text-slate-500">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded
                                      ${member.role === 'Admin' ? 'bg-brand-900/50 text-brand-400' : 'bg-slate-800 text-slate-500'}`}>
                        {member.role}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all opacity-0 group-hover:opacity-100"
                        title="Remove from team"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md card animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100">Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="label">Select User</label>
                <select
                  required
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="input"
                >
                  <option value="">Choose a user...</option>
                  {users
                    .filter(u => !team.members.some(m => m.user_id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="input"
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={adding || !selectedUser} className="btn-primary">
                  {adding ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
