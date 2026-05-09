import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-3 p-6 text-center">
          <p className="text-sm font-medium" style={{ color: '#d9622a' }}>
            앱 오류가 발생했습니다
          </p>
          <p className="text-xs" style={{ color: '#9a7060' }}>
            {this.state.message || '알 수 없는 오류'}
          </p>
          <button
            className="text-xs px-3 py-1 rounded"
            style={{ background: '#d9622a', color: '#fff' }}
            onClick={() => window.location.reload()}
          >
            다시 시작
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
