import { useState } from 'react'
import axios from 'axios'
import { saveToken } from '../lib/auth'

interface Props { onLogin: () => void; onRegister: () => void }

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function Login({ onLogin, onRegister }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { username, password })
      saveToken(res.data.token)
      onLogin()
    } catch (e: any) {
      setError(String(e.response?.data?.error ?? e.message ?? 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--green) 1px, transparent 1px), linear-gradient(90deg, var(--green) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />

      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '48px 40px', width: 380,
        position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.4s ease',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, var(--green), var(--cyan), transparent)',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 16 }}>
            <circle cx="24" cy="24" r="22" stroke="var(--green)" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="13" stroke="var(--cyan)" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="24" cy="24" r="5" fill="var(--green)" opacity="0.8" />
            <line x1="24" y1="2" x2="24" y2="9" stroke="var(--green)" strokeWidth="1.5" />
            <line x1="24" y1="39" x2="24" y2="46" stroke="var(--green)" strokeWidth="1.5" />
            <line x1="2" y1="24" x2="9" y2="24" stroke="var(--green)" strokeWidth="1.5" />
            <line x1="39" y1="24" x2="46" y2="24" stroke="var(--green)" strokeWidth="1.5" />
          </svg>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, color: 'var(--text-bright)', letterSpacing: 3 }}>
            RECON_NEXUS
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 6, letterSpacing: 2 }}>
            AUTHORIZED ACCESS ONLY
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 1 }}>USERNAME</div>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="operator"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--mono)',
                fontSize: 14, color: 'var(--text-bright)', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />
          </div>

          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 1 }}>PASSWORD</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--mono)',
                fontSize: 14, color: 'var(--text-bright)', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />
          </div>

          {error && (
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)',
              padding: '8px 12px', background: 'var(--red-dim)',
              borderRadius: 4, border: '1px solid var(--red)',
            }}>✕ {error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !username || !password}
            style={{
              padding: '12px', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 2,
              border: '1px solid var(--green)', background: 'var(--green-dim)',
              color: 'var(--green)', opacity: (!username || !password) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 8, transition: 'all 0.2s',
            }}
          >
            {loading
              ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> AUTHENTICATING</>
              : '▶ AUTHENTICATE'
            }
          </button>

          <button
            onClick={onRegister}
            style={{
              padding: '8px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1,
              border: 'none', background: 'none', color: 'var(--text-dim)',
            }}
          >
            → CREATE ACCOUNT
          </button>
        </div>
      </div>
    </div>
  )
}
