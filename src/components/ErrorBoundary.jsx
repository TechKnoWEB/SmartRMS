// src/components/ErrorBoundary.jsx
//
// Two boundary variants for two distinct points in the component tree:
//
//   RootErrorBoundary  — wraps the entire app in main.jsx.
//                        Last resort: catches provider crashes and anything
//                        the inner boundary misses. Shows a full-page screen.
//
//   PageErrorBoundary  — wraps <Outlet> in AppLayout.jsx.
//                        Keeps the sidebar + topbar alive when a single page
//                        crashes. Resets automatically on navigation so the
//                        teacher can move to a different route without a
//                        full page reload.
//
// Error Boundaries must be class components — React has no Hook equivalent
// for componentDidCatch / getDerivedStateFromError as of React 18.

import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Shared: copy error details to clipboard ────────────────────────────────
async function copyDetails(message, stack) {
  const text = `Error: ${message}\n\nStack:\n${stack ?? '(no stack)'}`
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // clipboard API blocked (e.g. insecure context) — fail silently
  }
}

// ─── RootErrorBoundary ───────────────────────────────────────────────────────
// Full-page fallback. Shown when everything inside has crashed, including
// context providers, the router, or App itself. Uses only inline styles so it
// renders even if Tailwind CSS has not loaded.
export class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, copied: false, showStack: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface to any error-tracking integration (e.g. Sentry) here.
    console.error('[RMS] Uncaught render error:', error, info.componentStack)
  }

  handleCopy = async () => {
    await copyDetails(
      this.state.error?.message,
      this.state.error?.stack,
    )
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  handleReload = () => window.location.reload()

  render() {
    if (!this.state.error) return this.props.children

    const { error, copied, showStack } = this.state
    const stack = error?.stack ?? ''

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
      }}>
        <div style={{
          maxWidth: 560,
          width: '100%',
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {/* Header stripe */}
          <div style={{
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            padding: '1.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: 0 }}>
                Something went wrong
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '2px 0 0' }}>
                An unexpected error crashed the application
              </p>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem 2rem' }}>
            {/* Error message */}
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '0.875rem 1rem',
              marginBottom: '1.25rem',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>
                Error message
              </p>
              <p style={{ fontSize: 13, color: '#7f1d1d', margin: 0, fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {error?.message || 'Unknown error'}
              </p>
            </div>

            {/* Collapsible stack trace */}
            {stack && (
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  onClick={() => this.setState(s => ({ showStack: !s.showStack }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#64748b', fontSize: 12, fontWeight: 600, padding: 0,
                    marginBottom: showStack ? 8 : 0,
                  }}
                >
                  {showStack
                    ? <ChevronUp style={{ width: 14, height: 14 }} />
                    : <ChevronDown style={{ width: 14, height: 14 }} />}
                  {showStack ? 'Hide' : 'Show'} stack trace
                </button>
                {showStack && (
                  <pre style={{
                    fontSize: 11, color: '#475569', background: '#f8fafc',
                    border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '0.75rem', margin: 0,
                    overflowX: 'auto', maxHeight: 200, overflowY: 'auto',
                    lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {stack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1, minWidth: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#4f46e5', color: '#fff',
                  border: 'none', borderRadius: 10, padding: '0.625rem 1.25rem',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Reload page
              </button>
              <button
                onClick={this.handleCopy}
                style={{
                  flex: 1, minWidth: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: copied ? '#f0fdf4' : '#f8fafc',
                  color: copied ? '#15803d' : '#475569',
                  border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 10, padding: '0.625rem 1.25rem',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? '✓ Copied' : 'Copy error'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

// ─── PageErrorBoundary ───────────────────────────────────────────────────────
// In-shell fallback for AppLayout's <Outlet>. Keeps the sidebar and topbar
// alive so the user can navigate away without a full reload.
//
// Key behaviour: resets automatically when the route changes. This is
// implemented by passing `resetKey={location.pathname}` from AppLayout —
// when the key changes, React unmounts and remounts the boundary, clearing
// the error state so the new route renders fresh.
export class PageErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null, copied: false, showStack: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[RMS] Page render error:', error, info.componentStack)
    this.setState({ info })
  }

  // Reset when the parent changes resetKey (i.e. the route changed)
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, info: null, copied: false, showStack: false })
    }
  }

  handleCopy = async () => {
    await copyDetails(
      this.state.error?.message,
      this.state.info?.componentStack ?? this.state.error?.stack,
    )
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  handleReload = () => window.location.reload()

  render() {
    if (!this.state.error) return this.props.children

    const { error, info, copied, showStack } = this.state
    const stack = info?.componentStack ?? error?.stack ?? ''

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-full max-w-lg">

          {/* Icon + heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              This page crashed
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              An unexpected error occurred while rendering this page.
              Your other pages and data are unaffected — navigate away or reload to continue.
            </p>
          </div>

          {/* Error message pill */}
          <div className="rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/40 px-4 py-3 mb-4">
            <p className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">
              Error
            </p>
            <p className="text-sm text-red-800 dark:text-red-300 font-mono break-words">
              {error?.message || 'Unknown error'}
            </p>
          </div>

          {/* Collapsible component stack */}
          {stack && (
            <div className="mb-4">
              <button
                onClick={() => this.setState(s => ({ showStack: !s.showStack }))}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-2"
              >
                {showStack
                  ? <ChevronUp className="w-3.5 h-3.5" />
                  : <ChevronDown className="w-3.5 h-3.5" />}
                {showStack ? 'Hide' : 'Show'} component stack
              </button>
              {showStack && (
                <pre className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3 overflow-auto max-h-44 leading-relaxed whitespace-pre-wrap break-words">
                  {stack}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reload page
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/80"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </button>
            <button
              onClick={this.handleCopy}
              title="Copy error details for support"
              className={`
                inline-flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-bold transition-all border
                ${copied
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80'
                }
              `}
            >
              {copied ? '✓' : '⎘'}
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-4">
            Navigate to another page using the sidebar — your session is still active.
          </p>
        </div>
      </div>
    )
  }
}
