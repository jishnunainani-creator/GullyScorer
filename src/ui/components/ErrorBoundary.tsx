import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Trash2, Home as HomeIcon } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PitchLog ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReturnHome = () => {
    window.location.href = '/'
  }

  handleResetStorage = async () => {
    if (window.confirm('Reset all local data and reload? This will clear local IndexedDB matches and settings.')) {
      try {
        window.indexedDB.deleteDatabase('PitchLogDB')
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/'
      } catch (err) {
        console.error('Failed to clear database:', err)
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080C0E] text-white p-6 flex flex-col justify-center items-center">
          <div className="max-w-md w-full bg-[#121A1D] border border-red-500/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-wide text-white">Something went wrong</h2>
                <p className="text-xs text-slate-400">PitchLog encountered an unexpected error</p>
              </div>
            </div>

            <div className="bg-[#080C0E] p-3 rounded-xl border border-red-950 font-mono text-xs text-red-300 max-h-36 overflow-y-auto break-all">
              {this.state.error?.message || 'Unknown error occurred'}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition"
              >
                <HomeIcon size={16} />
                <span>Return to Home</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 bg-[#18262C] hover:bg-[#20333B] text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-[#233238] transition"
              >
                <RefreshCw size={15} />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full py-2 text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition opacity-80 hover:opacity-100"
              >
                <Trash2 size={13} />
                <span>Clear Local Database & Reset</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
