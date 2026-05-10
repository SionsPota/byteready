import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info })
    // 浏览器控制台输出便于排查
    console.error('[ErrorBoundary]', error, info)
  }

  reset = (): void => {
    this.setState({ error: null, info: null })
  }

  override render(): ReactNode {
    if (this.state.error) {
      const stack = this.state.info?.componentStack ?? ''
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
          <div className="max-w-3xl mx-auto rounded-lg border border-red-900/50 bg-red-950/20 p-6">
            <h1 className="text-xl font-bold text-red-300 mb-2">页面渲染出错</h1>
            <p className="text-sm text-slate-400 mb-4">
              发生了一个未处理的异常。详细信息已打印到浏览器控制台。
            </p>
            <pre className="text-xs text-red-200 bg-red-950/40 p-3 rounded overflow-auto whitespace-pre-wrap mb-3">
              {String(this.state.error.stack ?? this.state.error.message)}
            </pre>
            {stack && (
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer text-slate-400">React 组件栈</summary>
                <pre className="mt-2 whitespace-pre-wrap">{stack}</pre>
              </details>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={this.reset}
                className="px-4 py-1.5 rounded bg-slate-800 text-sm text-slate-200 hover:bg-slate-700"
              >
                重试
              </button>
              <button
                onClick={() => {
                  localStorage.clear()
                  location.reload()
                }}
                className="px-4 py-1.5 rounded bg-red-600 text-sm text-white hover:bg-red-500"
              >
                清除本地缓存并刷新
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
