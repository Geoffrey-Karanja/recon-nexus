export type ScanStatus = 'idle' | 'queued' | 'running' | 'done' | 'error'

export type ToolName =
  | 'whois'
  | 'theHarvester'
  | 'subfinder'
  | 'amass'
  | 'crtsh'
  | 'dnsx'
  | 'nmap'
  | 'httpx'
  | 'wafw00f'

export type StageType = 'passive' | 'active' | 'enrichment'

export interface ToolResult {
  tool: ToolName
  stage: StageType
  status: ScanStatus
  startedAt?: string
  finishedAt?: string
  output: string[]
  error?: string
}

export interface Finding {
  id: string
  scanId: string
  type: 'subdomain' | 'ip' | 'port' | 'email' | 'cve' | 'technology' | 'waf'
  value: string
  metadata?: Record<string, unknown>
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical'
  discoveredBy: ToolName
  discoveredAt: string
}

export interface Scan {
  id: string
  target: string
  profile: 'passive' | 'full' | 'custom'
  status: ScanStatus
  createdAt: string
  updatedAt: string
  tools: ToolResult[]
  findings: Finding[]
}

export interface WsEvent {
  type: 'tool:start' | 'tool:output' | 'tool:done' | 'tool:error' | 'finding:new' | 'scan:done'
  scanId: string
  payload: unknown
}
