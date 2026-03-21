// src/pages/ResetPassword.jsx
// Public page — users arrive here from the forgot-password email link.
// URL format: /reset-password?token=<hex>
//
// Flow:
//   1. Extract token from URL
//   2. User enters + confirms new password
//   3. POST /auth/reset-password → rms-api Edge Function
//   4. On success → redirect to /login with a toast

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Lock, Eye, EyeOff, CheckCircle2, AlertTriangle,
  GraduationCap, ArrowRight, KeyRound, ShieldCheck,
} from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

async function callReset(token, newPassword) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/rms-api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey':        ANON_KEY,
    },
    body: JSON.stringify({ token, new_password: newPassword }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export default function ResetPassword() {
  const [searchParams]   = useSearchParams()
  const navigate         = useNavigate()
  const token            = searchParams.get('token') ?? ''

  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [focusField, setFocusField] = useState(null)

  // Redirect if no token in URL
  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  const passwordsMatch = password && confirm && password === confirm
  const isStrong       = password.length >= 8

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || !confirm) { toast.error('Please fill in both fields.'); return }
    if (password !== confirm)   { toast.error('Passwords do not match.'); return }
    if (!isStrong)              { toast.error('Password must be at least 8 characters.'); return }

    setLoading(true)
    try {
      await callReset(token, password)
      setDone(true)
      toast.success('Password reset successfully!')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      toast.error(err.message || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950/20 px-4">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-100/40 dark:bg-indigo-900/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-100/40 dark:bg-violet-900/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-gray-50 dark:border-gray-800">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-5">
              {done ? <CheckCircle2 className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {done ? 'Password Updated!' : 'Set New Password'}
            </h1>
            <p className="text-sm text-gray-400 mt-1.5">
              {done
                ? 'Redirecting you to login…'
                : 'Enter a strong new password for your account.'
              }
            </p>
          </div>

          {done ? (
            /* Success state */
            <div className="px-8 py-8 text-center">
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40 mb-6">
                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Your password has been changed successfully.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Go to Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

              {/* New password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> New Password
                </label>
                <div className={`relative rounded-xl transition-all ${focusField === 'pw' ? 'ring-4 ring-primary-500/15' : ''}`}>
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focusField === 'pw' ? 'text-indigo-500' : 'text-gray-400'}`} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusField('pw')}
                    onBlur={() => setFocusField(null)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    autoFocus
                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-indigo-500 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {password && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          password.length >= i * 3
                            ? password.length >= 12 ? 'bg-emerald-400' : password.length >= 8 ? 'bg-amber-400' : 'bg-red-400'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      password.length >= 12 ? 'text-emerald-500' : password.length >= 8 ? 'text-amber-500' : 'text-red-400'
                    }`}>
                      {password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : 'Weak'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Confirm Password
                </label>
                <div className={`relative rounded-xl transition-all ${focusField === 'confirm' ? 'ring-4 ring-primary-500/15' : ''}`}>
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focusField === 'confirm' ? 'text-indigo-500' : 'text-gray-400'}`} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onFocus={() => setFocusField('confirm')}
                    onBlur={() => setFocusField(null)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-indigo-500 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  />
                </div>

                {/* Match feedback */}
                {password && confirm && (
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${passwordsMatch ? 'text-emerald-500' : 'text-red-400'}`}>
                    {passwordsMatch
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                      : <><AlertTriangle className="w-3.5 h-3.5" /> Passwords do not match</>
                    }
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all mt-2"
              >
                {loading ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</>
                ) : (
                  <><ShieldCheck className="w-4.5 h-4.5" />Reset Password</>
                )}
              </button>

              {/* Back to login */}
              <p className="text-center text-xs text-gray-400 pt-1">
                Remember your password?{' '}
                <Link to="/login" className="text-indigo-500 font-semibold hover:text-indigo-600 transition-colors">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <GraduationCap className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          <p className="text-[11px] text-gray-400">School Result Management System</p>
        </div>
      </div>
    </div>
  )
}