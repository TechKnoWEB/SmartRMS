import { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-5xl', '3xl': 'max-w-6xl' }

export default function Modal({ open, onClose, title, subtitle, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handle = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handle)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-950/60 dark:bg-gray-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={clsx(
        'relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-modal',
        'border border-gray-100 dark:border-gray-800',
        'max-h-[90vh] overflow-y-auto',
        'animate-slide-up',
        sizes[size] || sizes.md
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
