import { useState, useEffect } from 'react'
import axios from 'axios'
import { getToken } from '../lib/auth'

interface User {
  id: string
  username: string
  role: string
  created_at: string
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

const api = () => axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { Authorization: `Bearer ${getToken()}` }
})

interface Props { onBack: () => void }

export default function UserManager({ onBack }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api().get('/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await api().post('/users', { username, password, role })
      setUsers(prev => [res.data, ...prev])
      setUsername('')
      setPassword('')
    } catch (e: any) {
      setError(String(e.response?.data?.error ?? e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api().delete(`/users/${id}`)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch {}
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg2)',
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid var(--border2)', borderRadius: 4,
          padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)',
        }}>‹ BACK</button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--text-bright)' }}>USER MANAGEMENT</span>
      </header>

      <div style={{ flex: 1, padding: 32, maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {/* Create user */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
          padding: 24, marginBottom: 32, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--green), var(--cyan), transparent)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, letterSpacing: 2 }}>
            // CREATE NEW OPERATOR
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              style={{
                flex: 1, minWidth: 150, background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 13,
                color: 'var(--text-bright)', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              style={{
                flex: 1, minWidth: 150, background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 13,
                color: 'var(--text-bright)', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {(['user', 'admin'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)} style={{
                  padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1,
                  border: `1px solid ${role === r ? 'var(--cyan)' : 'var(--border2)'}`,
                  background: role === r ? 'var(--cyan-dim)' : 'transparent',
                  color: role === r ? 'var(--cyan)' : 'var(--text-dim)',
                }}>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={handleCreate} disabled={loading || !username || !password} style={{
              padding: '10px 24px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1,
              border: '1px solid var(--green)', background: 'var(--green-dim)', color: 'var(--green)',
              opacity: (!username || !password) ? 0.4 : 1,
            }}>
              + CREATE
            </button>
          </div>
          {error && <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>✕ {error}</div>}
        </div>

        {/* Users list */}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, letterSpacing: 2 }}>
          // OPERATORS [{users.length}]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-bright)', flex: 1 }}>
                {u.username}
              </span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 10px', borderRadius: 3,
                border: `1px solid ${u.role === 'admin' ? 'var(--orange)' : 'var(--cyan)'}`,
                color: u.role === 'admin' ? 'var(--orange)' : 'var(--cyan)',
              }}>
                {u.role.toUpperCase()}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                {new Date(u.created_at).toLocaleDateString()}
              </span>
              <button onClick={() => handleDelete(u.id)} style={{
                background: 'none', border: '1px solid var(--border2)', borderRadius: 4,
                padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--mono)',
                fontSize: 11, color: 'var(--text-dim)',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)'; (e.currentTarget as HTMLElement).style.color = 'var(--red)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)' }}
              >✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
