import { useEffect, useRef, useCallback } from 'react'
import type { WsEvent } from '../types'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

export function useWs(scanId: string | null, onEvent: (e: WsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    if (!scanId) return
    const ws = new WebSocket(`${WS_BASE}/ws/${scanId}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const event: WsEvent = JSON.parse(e.data)
        onEventRef.current(event)
      } catch {}
    }

    ws.onclose = () => { wsRef.current = null }
  }, [scanId])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])
}
