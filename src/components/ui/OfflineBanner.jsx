// src/components/ui/OfflineBanner.jsx
import { useEffect, useRef, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const isOnline  = useOnlineStatus()
  const prevRef   = useRef(isOnline)
  const timerRef  = useRef(null)

  // 'offline' | 'reconnected' | null
  const [state, setState] = useState(null)

  useEffect(() => {
    const wasOnline = prevRef.current
    prevRef.current = isOnline

    if (!isOnline) {
      clearTimeout(timerRef.current)
      setState('offline')
      return
    }

    if (!wasOnline && isOnline) {
      // just came back online
      setState('reconnected')
      timerRef.current = setTimeout(() => setState(null), 3000)
    }

    return () => clearTimeout(timerRef.current)
  }, [isOnline])

  if (!state) return null

  const offline = state === 'offline'

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed top-14 inset-x-0 z-30 flex items-center justify-center gap-2.5',
        'px-4 py-2.5 text-xs font-semibold select-none',
        'transition-all duration-300 animate-fade-in',
        offline
          ? 'bg-red-600 text-white'
          : 'bg-emerald-600 text-white',
      ].join(' ')}
    >
      {offline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          You&rsquo;re offline — any saves will be queued and synced automatically when reconnected.
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
          Back online — syncing queued saves&hellip;
        </>
      )}
    </div>
  )
}
