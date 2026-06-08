import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Dashboard from './components/Dashboard'
import ScanView from './components/ScanView'
import Login from './components/Login'

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [activeScanId, setActiveScanId] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/auth/me', { withCredentials: true })
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
  }, [])

  const handleLogin = useCallback(() => setAuthed(true), [])
  const handleScanCreated = useCallback((id: string) => setActiveScanId(id), [])
  const handleBack = useCallback(() => setActiveScanId(null), [])

  if (authed === null) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 13, letterSpacing: 2 }}>
        INITIALIZING...
      </span>
    </div>
  )

  if (!authed) return <Login onLogin={handleLogin} />

  return activeScanId
    ? <ScanView scanId={activeScanId} onBack={handleBack} />
    : <Dashboard onScanCreated={handleScanCreated} />
}
