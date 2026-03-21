// src/components/ui/ForgotPasswordModal.jsx
// Drop-in modal — import and render inside LoginPage.jsx
//
// USAGE IN LoginPage.jsx:
//   1. Import: import ForgotPasswordModal from '../../components/ui/ForgotPasswordModal'
//   2. Add state: const [forgotOpen, setForgotOpen] = useState(false)
//   3. Wire button:
//        onClick={() => setForgotOpen(true)}
//   4. Render:
//        <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />

import { useState } from 'react'
import { X, KeyRound, Building2, User, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

async function requestReset(userId, schoolCode) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/rms-api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey':        ANON_KEY,
    },
    body: JSON.stringify({ user_id: userId, school_code: schoolCode }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export default function ForgotPasswordModal({ open, onClose }) {
  const [userId,     setUserId]     = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [loading,    setLoading]    = useState(false)
  const [sent,       setSent]       = useState(false)

  const reset = () => { setUserId(''); setSchoolCode(''); setLoading(false); setSent(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId.trim() || !schoolCode.trim()) {
      toast.error('Please fill in both fields.')
      return
    }
    setLoading(true)
    try {
      await requestReset(userId.trim(), schoolCode.trim().toUpperCase())
      setSent(true)
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm overflow-hidden animate-[scaleIn_0.2s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Forgot Password?</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">We'll send a reset link to your school email</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          /* Success state */
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Check your email</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              If an account exists for <span className="font-semibold text-gray-700 dark:text-gray-300">{userId}</span>,
              a reset link was sent to the school's registered email address.
              The link expires in 15 minutes.
            </p>
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-200 dark:ring-amber-800/30 text-left mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                The reset link is sent to your <strong>school's registered email</strong> (set during registration), not to your personal email.
              </p>
            </div>
            <button onClick={handleClose}
              className="w-full py-3 px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:opacity-90 transition-opacity">
              Back to Login
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Enter your User ID and School DISE code. A password reset link will be sent to the school's registered email address.
            </p>

            {/* User ID */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                User ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  placeholder="Your admin user ID"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            {/* School Code */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                School DISE Code
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={schoolCode}
                  onChange={e => setSchoolCode(e.target.value)}
                  placeholder="e.g. 123456789012"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 pl-1">Found on your school's login page below the school name.</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading || !userId.trim() || !schoolCode.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Send Link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}