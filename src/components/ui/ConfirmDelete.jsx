// src/components/ui/ConfirmDelete.jsx
import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * Enhanced delete confirmation modal that shows related record counts.
 *
 * Props:
 *   open       - boolean
 *   onClose    - function
 *   onConfirm  - async function: called when user confirms
 *   title      - string: e.g. "Delete Student"
 *   itemName   - string: e.g. student name
 *   fetchCount - async function returning { label, count }[]
 *                e.g. async () => [{ label: 'marks records', count: 42 }]
 *   confirmLabel - string: button label (default "Delete")
 */
export default function ConfirmDelete({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  itemName,
  fetchCount,
  confirmLabel = 'Delete',
}) {
  const [counts,    setCounts]    = useState([])
  const [counting,  setCounting]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  useEffect(() => {
    if (!open || !fetchCount) { setCounts([]); return }
    setCounting(true)
    fetchCount()
      .then(c => { setCounts(c || []); setCounting(false) })
      .catch(() => { setCounts([]); setCounting(false) })
  }, [open, fetchCount])

  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  const hasRelated = counts.some(c => c.count > 0)

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">

        {/* Warning icon + primary message */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30
            flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Are you sure you want to delete{' '}
              <span className="text-red-600 dark:text-red-400">
                &quot;{itemName}&quot;
              </span>?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Related records */}
        {fetchCount && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
            {counting ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Checking related records…
              </div>
            ) : counts.length === 0 ? (
              <p className="text-xs text-gray-400">No related records found.</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase
                  tracking-wide mb-2">
                  Also deletes:
                </p>
                <div className="space-y-1">
                  {counts.map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{label}</span>
                      <span className={`font-bold tabular-nums ${
                        count > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-400'
                      }`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
                {hasRelated && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium">
                    All related records will be permanently deleted.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={deleting}
            disabled={counting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
