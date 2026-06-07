import { useState, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import ScanView from './components/ScanView'

export default function App() {
  const [activeScanId, setActiveScanId] = useState<string | null>(null)

  const handleScanCreated = useCallback((id: string) => {
    setActiveScanId(id)
  }, [])

  const handleBack = useCallback(() => {
    setActiveScanId(null)
  }, [])

  return activeScanId
    ? <ScanView scanId={activeScanId} onBack={handleBack} />
    : <Dashboard onScanCreated={handleScanCreated} />
}
