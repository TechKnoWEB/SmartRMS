// src/components/ui/UnsavedBanner.jsx
import { AlertTriangle, Save, RotateCcw } from 'lucide-react'

/**
 * Shows a sticky top banner when there are unsaved changes.
 * Also attaches a beforeunload listener to warn on tab close.
 *
 * Props:
 *   isDirty  - boolean: show/hide the banner
 *   onSave   - async function: called when user clicks Save
 *   onDiscard - function: called when user clicks Discard
 *   saving   - boolean: show loading state on Save button
 *   label    - optional string: describe what's unsaved
 */
import { useEffect } from 'react'

export default function UnsavedBanner({
  isDirty,
  onSave,
  onDiscard,
  saving = false,
  label = 'You have unsaved changes',
}) {
  // Warn on browser tab close / refresh
  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  if (!isDirty) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4
      bg-amber-500 dark:bg-amber-600 px-4 py-3 shadow-lg shadow-amber-900/20
      animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-white font-semibold text-sm">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDiscard}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
            bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" /> Discard
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
            bg-white text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
        >
          {saving
            ? <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            : <><Save className="w-3 h-3" /> Save Now</>
          }
        </button>
      </div>
    </div>
  )
}
