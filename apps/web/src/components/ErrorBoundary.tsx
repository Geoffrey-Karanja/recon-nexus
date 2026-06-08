import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 20,
      }}>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--red)',
          borderRadius: 8, padding: '32px 40px', maxWidth: 500, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--red)', marginBottom: 12 }}>
            SYSTEM ERROR
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>
            {this.state.error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: 'var(--mono)', fontSize: 12, padding: '8px 24px',
              borderRadius: 4, cursor: 'pointer', letterSpacing: 1,
              background: 'var(--red-dim)', border: '1px solid var(--red)', color: 'var(--red)',
            }}
          >
            ↺ RELOAD
          </button>
        </div>
      </div>
    )
  }
}
