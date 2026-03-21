import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { INACTIVITY_MS } from '../../lib/security'
import { Clock, X } from 'lucide-react'

// Show a warning banner 2 minutes before session expires
const WARN_BEFORE_MS = 2 * 60 * 1000

export default function SessionGuard() {
  const { user, logout } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [secsLeft, setSecsLeft] = useState(0)

  const checkExpiry = useCallback(() => {
    const expiry = parseInt(sessionStorage.getItem('rms_session_expiry') || '0')
    const remaining = expiry - Date.now()

    if (remaining <= 0) {
      setShowWarning(false)
      return
    }
    if (remaining <= WARN_BEFORE_MS) {
      setShowWarning(true)
      setSecsLeft(Math.ceil(remaining / 1000))
    } else {
      setShowWarning(false)
    }
  }, [])

  useEffect(() => {
    if (!user) { setShowWarning(false); return }
    const interval = setInterval(checkExpiry, 1000)
    return () => clearInterval(interval)
  }, [user, checkExpiry])

  const stayLoggedIn = () => {
    // Touch the expiry to reset the timer — the AuthContext activity handler
    // already does this on real events, this covers the case where user hasn't moved
    sessionStorage.setItem('rms_session_expiry', String(Date.now() + INACTIVITY_MS))
    setShowWarning(false)
  }

  if (!showWarning) return null

  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl
        bg-amber-50 dark:bg-gray-900 border border-amber-200 dark:border-amber-700
        shadow-modal">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40
          flex items-center justify-center">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Session expiring in <span className="text-amber-600 dark:text-amber-400 tabular-nums">{timeStr}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You'll be logged out due to inactivity
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={stayLoggedIn}
            className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white
              text-xs font-bold transition-colors">
            Stay Logged In
          </button>
          <button onClick={() => setShowWarning(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
