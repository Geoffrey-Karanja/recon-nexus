import { useState } from 'react'
import axios from 'axios'
import { saveToken } from '../lib/auth'

interface Props { onRegister: () => void; onBack: () => void }

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export default function Register({ onRegister, onBack }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!username || !password) return
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, { username, password })
      saveToken(res.data.token)
      onRegister()
    } catch (e: any) {
      setError(String(e.response?.data?.error ?? e.message ?? 'Registration failed'))
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
          background: 'linear-gradient(90deg, var(--cyan), var(--green), transparent)',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 16 }}>
            <circle cx="24" cy="24" r="22" stroke="var(--cyan)" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="13" stroke="var(--green)" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="24" cy="24" r="5" fill="var(--cyan)" opacity="0.8" />
          </svg>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, color: 'var(--text-bright)', letterSpacing: 3 }}>
            RECON_NEXUS
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 6, letterSpacing: 2 }}>
            CREATE OPERATOR ACCOUNT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'USERNAME', value: username, set: setUsername, type: 'text', placeholder: 'operator_name' },
            { label: 'PASSWORD', value: password, set: setPassword, type: 'password', placeholder: '••••••••' },
            { label: 'CONFIRM PASSWORD', value: confirm, set: setConfirm, type: 'password', placeholder: '••••••••' },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: 1 }}>
                {label}
              </div>
              <input
                type={type}
                value={value}
                onChange={e => set(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                placeholder={placeholder}
                style={{
                  width: '100%', background: 'var(--bg3)',
                  border: '1px solid var(--border2)', borderRadius: 6,
                  padding: '10px 14px', fontFamily: 'var(--mono)',
                  fontSize: 14, color: 'var(--text-bright)', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>
          ))}

          {error && (
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)',
              padding: '8px 12px', background: 'var(--red-dim)',
              borderRadius: 4, border: '1px solid var(--red)',
            }}>✕ {error}</div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading || !username || !password || !confirm}
            style={{
              padding: '12px', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 2,
              border: '1px solid var(--cyan)', background: 'var(--cyan-dim)',
              color: 'var(--cyan)', opacity: (!username || !password || !confirm) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 8, transition: 'all 0.2s',
            }}
          >
            {loading
              ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> CREATING ACCOUNT</>
              : '▶ CREATE ACCOUNT'
            }
          </button>

          <button
            onClick={onBack}
            style={{
              padding: '8px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1,
              border: 'none', background: 'none', color: 'var(--text-dim)',
            }}
          >
            ← BACK TO LOGIN
          </button>
        </div>
      </div>
    </div>
  )
}
