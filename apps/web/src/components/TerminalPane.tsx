import { useEffect, useRef } from 'react'

interface Props { tool: string | null; lines: string[] }

export default function TerminalPane({ tool, lines }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const getColor = (line: string) => {
    if (line.includes('ERROR') || line.includes('error') || line.includes('failed')) return 'var(--red)'
    if (line.includes('WARN') || line.includes('warn')) return 'var(--yellow)'
    if (line.match(/\d+\.\d+\.\d+\.\d+/)) return 'var(--cyan)'
    if (line.match(/^[\w.-]+\.[a-z]{2,}/)) return 'var(--green)'
    if (line.startsWith('[')) return 'var(--text-dim)'
    return 'var(--text)'
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{
        padding: '8px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ color: 'var(--green)' }}>●</span>
        {tool ? `OUTPUT :: ${tool}` : 'SELECT A TOOL FROM THE PIPELINE'}
        <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>{lines.length} lines</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.8 }}>
        {lines.length === 0 && tool && (
          <span style={{ color: 'var(--text-dim)' }}>
            waiting for output
            <span style={{ animation: 'blink 1s infinite', display: 'inline-block' }}>█</span>
          </span>
        )}
        {lines.map((line, i) => (
          <div key={i} style={{ color: getColor(line), display: 'flex', gap: 12 }}>
            <span style={{ color: 'var(--border2)', userSelect: 'none', minWidth: 40, textAlign: 'right' }}>
              {i + 1}
            </span>
            <span>{line}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
