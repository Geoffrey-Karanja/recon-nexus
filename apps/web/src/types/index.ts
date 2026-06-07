export type ScanStatus = 'idle' | 'queued' | 'running' | 'done' | 'error'
export type FindingType = 'subdomain' | 'ip' | 'port' | 'email' | 'cve' | 'technology' | 'waf'
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface Finding {
  id: string
  scan_id: string
  type: FindingType
  value: string
  severity: Severity
  metadata?: Record<string, unknown>
  discovered_by: string
  discovered_at: string
}

export interface ToolResult {
  tool: string
  stage: string
  status: ScanStatus
  output: string[]
  error?: string
}

export interface Scan {
  id: string
  target: string
  profile: string
  status: ScanStatus
  created_at: string
  updated_at: string
  findings?: Finding[]
  tools?: ToolResult[]
}

export interface WsEvent {
  type: string
  scanId: string
  payload: Record<string, unknown>
}
