import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { getToken } from './lib/auth'
import Dashboard from './components/Dashboard'
import ScanView from './components/ScanView'
import Login from './components/Login'
import Register from './components/Register'
import UserManager from './components/UserManager'

type View = 'login' | 'register' | 'dashboard' | 'scan' | 'users'

export default function App() {
  const [view, setView] = useState<View | null>(null)
  const [activeScanId, setActiveScanId] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) { setView('login'); return }
    axios.get(`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => setView('dashboard'))
      .catch(() => setView('login'))
  }, [])

  const handleScanCreated = useCallback((id: string) => {
    setActiveScanId(id)
    setView('scan')
  }, [])

  if (view === null) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-dim)', fontSize: 13, letterSpacing: 2 }}>INITIALIZING...</span>
    </div>
  )

  if (view === 'login') return <Login onLogin={() => setView('dashboard')} onRegister={() => setView('register')} />
  if (view === 'register') return <Register onRegister={() => setView('dashboard')} onBack={() => setView('login')} />
  if (view === 'users') return <UserManager onBack={() => setView('dashboard')} />
  if (view === 'scan' && activeScanId) return <ScanView scanId={activeScanId} onBack={() => setView('dashboard')} />
  return <Dashboard onScanCreated={handleScanCreated} onManageUsers={() => setView('users')} />
}
