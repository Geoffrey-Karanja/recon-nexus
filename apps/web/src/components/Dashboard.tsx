import { useState, useEffect } from 'react'
import { createScan, getScans, deleteScan } from '../lib/api'
import type { Scan } from '../types'

interface Props { onScanCreated: (id: string) => void; onManageUsers: () => void }

const statusColor: Record<string, string> = {
  queued: 'var(--yellow)',
  running: 'var(--cyan)',
  done: 'var(--green)',
  error: 'var(--red)',
  idle: 'var(--text-dim)',
}

const statusIcon: Record<string, string> = {
  queued: '◌',
  running: '◉',
  done: '◆',
  error: '✕',
  idle: '○',
}

export default function Dashboard({ onScanCreated, onManageUsers }: Props) {
  const [target, setTarget] = useState('')
  const [profile, setProfile] = useState<'passive' | 'full'>('full')
  const [loading, setLoading] = useState(false)
  const [scans, setScans] = useState<Scan[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getScans().then(r => setScans(r.data)).catch(() => {})
    const t = setInterval(() => {
      getScans().then(r => setScans(r.data)).catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const handleLaunch = async () => {
    if (!target.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await createScan(target.trim(), profile)
      onScanCreated(res.data.scanId)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="var(--green)" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="8" stroke="var(--cyan)" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="14" cy="14" r="3" fill="var(--green)" />
            <line x1="14" y1="1" x2="14" y2="6" stroke="var(--green)" strokeWidth="1.5" />
            <line x1="14" y1="22" x2="14" y2="27" stroke="var(--green)" strokeWidth="1.5" />
            <line x1="1" y1="14" x2="6" y2="14" stroke="var(--green)" strokeWidth="1.5" />
            <line x1="22" y1="14" x2="27" y2="14" stroke="var(--green)" strokeWidth="1.5" />
          </svg>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--text-bright)', letterSpacing: 3 }}>RECON_NEXUS</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onManageUsers} style={{
            fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 12px', borderRadius: 4,
            cursor: 'pointer', background: 'none', border: '1px solid var(--border2)', color: 'var(--text-dim)',
          }}>⚙ USERS</button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>SYS::ONLINE</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse-green 2s infinite' }} />
        </div>
      </header>

      <div style={{ flex: 1, padding: '32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Launch Panel */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 28,
          marginBottom: 32,
          animation: 'fadeIn 0.4s ease',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, var(--green), var(--cyan), transparent)',
          }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, letterSpacing: 2 }}>
            // INITIALIZE RECON MISSION
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)',
              }}>›_</span>
              <input
                value={target}
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLaunch()}
                placeholder="target.domain.com"
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 6, padding: '12px 12px 12px 36px',
                  fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-bright)',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--green)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['passive', 'full'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProfile(p)}
                  style={{
                    padding: '12px 20px', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1,
                    border: `1px solid ${profile === p ? 'var(--cyan)' : 'var(--border2)'}`,
                    background: profile === p ? 'var(--cyan-dim)' : 'transparent',
                    color: profile === p ? 'var(--cyan)' : 'var(--text-dim)',
                    transition: 'all 0.2s',
                  }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={handleLaunch}
              disabled={loading || !target.trim()}
              style={{
                padding: '12px 28px', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: 2,
                border: '1px solid var(--green)',
                background: loading ? 'transparent' : 'var(--green-dim)',
                color: 'var(--green)',
                opacity: !target.trim() ? 0.4 : 1,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loading ? (
                <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> LAUNCHING</>
              ) : '▶ LAUNCH'}
            </button>
          </div>
          {error && <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)' }}>ERR: {error}</div>}
        </div>

        {/* Scan History */}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, letterSpacing: 2 }}>
          // MISSION HISTORY [{scans.length}]
        </div>
        {scans.length === 0 ? (
          <div style={{
            background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: 8,
            padding: '48px', textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)',
          }}>
            NO MISSIONS LOGGED — INITIALIZE FIRST SCAN
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scans.map((scan, i) => (
              <div
                key={scan.id}
                onClick={() => onScanCreated(scan.id)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  cursor: 'pointer', transition: 'all 0.2s',
                  animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg3)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg2)'
                }}
              >
                <span style={{ fontSize: 18, color: statusColor[scan.status] ?? 'var(--text-dim)' }}>
                  {statusIcon[scan.status] ?? '○'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-bright)' }}>{scan.target}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {scan.profile.toUpperCase()} · {new Date(scan.created_at).toLocaleString()}
                  </div>
                </div>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1,
                  color: statusColor[scan.status] ?? 'var(--text-dim)',
                  padding: '3px 10px', borderRadius: 4,
                  border: `1px solid ${statusColor[scan.status] ?? 'var(--border)'}`,
                  background: `${statusColor[scan.status]}15`,
                }}>
                  {scan.status.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: 16 }}>›</span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    try { await deleteScan(scan.id) } catch {}
                    setScans(prev => prev.filter(s => s.id !== scan.id))
                  }}
                  style={{
                    background: 'none', border: '1px solid var(--border2)',
                    borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)'; (e.currentTarget as HTMLElement).style.color = 'var(--red)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)' }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
