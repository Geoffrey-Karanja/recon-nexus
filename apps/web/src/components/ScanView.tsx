import { useState, useEffect, useCallback } from 'react'
import { getScan, cancelScan } from '../lib/api'
import { useWs } from '../hooks/useWs'
import type { Scan, Finding, WsEvent } from '../types'
import ForceGraph from './ForceGraph'
import TerminalPane from './TerminalPane'

interface Props { scanId: string; onBack: () => void }

const severityColor: Record<string, string> = {
  info: 'var(--text-dim)', low: 'var(--cyan)', medium: 'var(--yellow)',
  high: 'var(--orange)', critical: 'var(--red)',
}
const typeIcon: Record<string, string> = {
  subdomain: '⬡', ip: '◈', port: '⊞', email: '✉',
  technology: '⚙', waf: '⛨', cve: '⚠',
}

function downloadReport(scanId: string) {
  window.open(`/api/scans/${scanId}/report`, '_blank')
}

export default function ScanView({ scanId, onBack }: Props) {
  const [scan, setScan] = useState<Scan | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [toolOutputs, setToolOutputs] = useState<Record<string, string[]>>({})
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'graph' | 'terminal' | 'findings'>('graph')
  const [toolStatuses, setToolStatuses] = useState<Record<string, string>>({})
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    getScan(scanId).then(r => {
      setScan(r.data)
      setFindings(r.data.findings ?? [])
      const outputs: Record<string, string[]> = {}
      r.data.tools?.forEach(t => { outputs[t.tool] = t.output })
      setToolOutputs(outputs)
      const statuses: Record<string, string> = {}
      r.data.tools?.forEach(t => { statuses[t.tool] = t.status })
      setToolStatuses(statuses)
    }).catch(() => {})
  }, [scanId])

  const handleWsEvent = useCallback((e: WsEvent) => {
    if (e.type === 'finding:new') {
      setFindings(prev => [e.payload as unknown as Finding, ...prev])
    }
    if (e.type === 'tool:output') {
      const { tool, line } = e.payload as { tool: string; line: string }
      setToolOutputs(prev => ({ ...prev, [tool]: [...(prev[tool] ?? []), line] }))
    }
    if (e.type === 'tool:start') {
      const { tool } = e.payload as { tool: string }
      if (tool) {
        setToolStatuses(prev => ({ ...prev, [tool]: 'running' }))
        setActiveTool(tool)
      }
    }
    if (e.type === 'tool:done') {
      const { tool } = e.payload as { tool: string }
      setToolStatuses(prev => ({ ...prev, [tool]: 'done' }))
    }
    if (e.type === 'tool:error') {
      const { tool } = e.payload as { tool: string }
      setToolStatuses(prev => ({ ...prev, [tool]: 'error' }))
    }
    if (e.type === 'scan:done') {
      setScan(prev => prev ? { ...prev, status: 'done' } : prev)
    }
    if (e.type === 'scan:cancelled') {
      setScan(prev => prev ? { ...prev, status: 'cancelled' as any } : prev)
    }
  }, [])

  useWs(scanId, handleWsEvent)

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelScan(scanId)
      setScan(prev => prev ? { ...prev, status: 'cancelled' as any } : prev)
    } catch {}
    setCancelling(false)
  }

  const tools = ['whois', 'subfinder', 'theHarvester', 'crtsh', 'google', 'github', 'dnsx', 'nmap', 'httpx', 'wafw00f']
  const statusColor: Record<string, string> = {
    queued: 'var(--text-dim)', running: 'var(--cyan)',
    done: 'var(--green)', error: 'var(--red)', cancelled: 'var(--yellow)',
  }
  const statusIcon: Record<string, string> = {
    queued: '○', running: '◉', done: '◆', error: '✕', cancelled: '⊘',
  }

  const scanStatus = (scan?.status ?? 'loading') as string
  const isActive = scanStatus === 'running' || scanStatus === 'queued'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg2)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid var(--border2)', borderRadius: 4,
          padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--mono)',
          fontSize: 12, color: 'var(--text-dim)',
        }}>‹ BACK</button>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--text-bright)' }}>
          {scan?.target ?? '...'}
        </div>

        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
          color: statusColor[scanStatus] ?? 'var(--text-dim)',
          padding: '2px 8px', borderRadius: 3,
          border: `1px solid ${statusColor[scanStatus] ?? 'var(--border)'}`,
          animation: isActive ? 'pulse-green 1.5s infinite' : 'none',
        }}>
          {scanStatus.toUpperCase()}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {isActive && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 14px',
                borderRadius: 4, cursor: cancelling ? 'not-allowed' : 'pointer',
                background: 'var(--red-dim)', border: '1px solid var(--red)',
                color: 'var(--red)', opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? '...' : '✕ CANCEL'}
            </button>
          )}
          <button
            onClick={() => downloadReport(scanId)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 14px',
              borderRadius: 4, cursor: 'pointer',
              background: 'var(--green-dim)', border: '1px solid var(--green)',
              color: 'var(--green)',
            }}
          >
            ↓ PDF REPORT
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            {findings.length} FINDINGS
          </span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div style={{
          width: 180, borderRight: '1px solid var(--border)',
          background: 'var(--bg2)', display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{
            padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 10,
            color: 'var(--text-dim)', letterSpacing: 2, borderBottom: '1px solid var(--border)',
          }}>PIPELINE</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {tools.map(tool => {
              const st = toolStatuses[tool] ?? 'queued'
              const isActive = activeTool === tool
              return (
                <div
                  key={tool}
                  onClick={() => { setActiveTool(tool); setActiveTab('terminal') }}
                  style={{
                    padding: '8px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isActive ? 'var(--bg3)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--cyan)' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    fontSize: 10, color: statusColor[st] ?? 'var(--text-dim)',
                    animation: st === 'running' ? 'pulse-green 1s infinite' : 'none',
                  }}>
                    {statusIcon[st] ?? '○'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 11,
                    color: isActive ? 'var(--cyan)' : 'var(--text-dim)',
                  }}>
                    {tool}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
            {(['graph', 'terminal', 'findings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 24px', cursor: 'pointer', background: 'none', border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--cyan)' : '2px solid transparent',
                  fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1,
                  color: activeTab === tab ? 'var(--cyan)' : 'var(--text-dim)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'graph' && <ForceGraph findings={findings} target={scan?.target ?? ''} />}
            {activeTab === 'terminal' && (
              <TerminalPane
                tool={activeTool}
                lines={activeTool ? (toolOutputs[activeTool] ?? []) : []}
              />
            )}
            {activeTab === 'findings' && (
              <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
                {findings.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '60px',
                    fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)',
                  }}>
                    AWAITING FINDINGS...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {findings.map((f, i) => (
                      <div key={f.id ?? i} style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '10px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        animation: 'fadeIn 0.2s ease both',
                      }}>
                        <span style={{ fontSize: 14, color: 'var(--text-dim)', width: 20, textAlign: 'center' }}>
                          {typeIcon[f.type] ?? '·'}
                        </span>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 8px', borderRadius: 3,
                          border: `1px solid ${severityColor[f.severity] ?? 'var(--border)'}`,
                          color: severityColor[f.severity] ?? 'var(--text-dim)',
                          background: `${severityColor[f.severity]}15`,
                          minWidth: 80, textAlign: 'center',
                        }}>
                          {f.type.toUpperCase()}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-bright)', flex: 1 }}>
                          {f.value}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                          {f.discovered_by}
                        </span>
                        {f.type === 'cve' && f.metadata?.score != null && (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', padding: '2px 6px', border: '1px solid var(--red-dim)', borderRadius: 3 }}>
                            CVSS {String(f.metadata.score)}
                          </span>
                        )}
                        {f.type === 'cve' && f.metadata?.url != null && (
                          <a href={String(f.metadata.url)} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cyan)' }}>↗</a>
                        )}
                        {f.metadata?.country != null && (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cyan)', padding: '2px 6px', border: '1px solid var(--cyan-dim)', borderRadius: 3 }}>
                            {String(f.metadata.country)}{f.metadata.city ? ' · ' + String(f.metadata.city) : ''}
                          </span>
                        )}
                        {f.metadata?.screenshot != null && (
                          <a href={`/api/screenshots/${f.scan_id}/${String(f.metadata.screenshot).split('/').pop()}`} target="_blank" rel="noreferrer">
                            <img src={`/api/screenshots/${f.scan_id}/${String(f.metadata.screenshot).split('/').pop()}`} style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 3, border: '1px solid var(--border2)', cursor: 'pointer' }} alt="screenshot" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
