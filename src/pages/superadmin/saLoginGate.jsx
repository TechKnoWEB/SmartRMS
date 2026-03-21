// src/pages/superadmin/saLoginGate.jsx
import { useState } from 'react'
import { callApi } from './saConstants'
import {
  ShieldCheck, Eye, EyeOff, Loader2, AlertTriangle,
  User, Lock, Shield, Server, CheckCircle2,
} from 'lucide-react'

export function LoginGate({ onAuth }) {
  const [adminId,  setAdminId]  = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')
  const [shake,    setShake]    = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!adminId.trim() || !password.trim()) {
      setErr('Enter Admin ID and password.')
      setShake(true); setTimeout(() => setShake(false), 500)
      return
    }
    setLoading(true); setErr('')
    try {
      await callApi('/auth/login', { adminId: adminId.trim(), password: password.trim() })
      onAuth({ adminId: adminId.trim(), password: password.trim() })
    } catch (ex) {
      setErr(ex.message || 'Login failed.')
      setShake(true); setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className={`relative w-full max-w-sm transition-transform ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center ring-4 ring-slate-900">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-xl font-black text-center text-white mb-1 tracking-tight">Super Admin</h1>
          <p className="text-sm text-center text-white/40 mb-8">Result Management System</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">Admin ID</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-white/30 pointer-events-none" />
                <input type="text" value={adminId}
                  onChange={e => { setAdminId(e.target.value); setErr('') }}
                  placeholder="Enter your admin ID"
                  autoComplete="username" autoFocus
                  className="w-full bg-white/8 border border-white/10 text-white placeholder-white/25 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/30 transition-all hover:bg-white/10" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-white/30 pointer-events-none" />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setErr('') }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full bg-white/8 border border-white/10 text-white placeholder-white/25 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/30 transition-all hover:bg-white/10" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 animate-[slideDown_0.2s_ease-out]">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400 font-medium">{err}</p>
              </div>
            )}

            <button type="submit" disabled={loading || !adminId.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-sm font-bold shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2 active:scale-[0.98]">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
              ) : (
                <><ShieldCheck className="w-4 h-4" />Sign In to Dashboard</>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-3">
            {[
              { icon: Shield, label: 'Encrypted' },
              { icon: Server, label: '24x7 Live' },
              { icon: Lock,   label: 'Session Only' },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-1.5 text-white/20">
                {i > 0 && <span className="text-white/10 mr-1.5">·</span>}
                <item.icon className="w-3 h-3" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
