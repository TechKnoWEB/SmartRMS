// src/pages/superadmin/saRegistrationsTab.jsx
import { useState } from 'react'
import { callApi } from './saConstants'
import { useToast, StatusBadge, EmptyState } from './saComponents'
import {
  School, Clock, ChevronDown, AlertTriangle, Loader2,
  User, Hash, Phone, Calendar, MapPin, MailOpen,
  CheckCircle2, XCircle, X,
} from 'lucide-react'

export function RegCard({ reg, creds, onDone }) {
  const { toast }       = useToast()
  const [open,         setOpen]        = useState(false)
  const [acting,       setActing]      = useState(null)
  const [rejectMsg,    setRejectMsg]   = useState('')
  const [showReject,   setShowReject]  = useState(false)
  const [err,          setErr]         = useState('')

  const age = (() => {
    const d = Math.floor((Date.now() - new Date(reg.created_at)) / 86400000)
    return d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`
  })()

  const approve = async () => {
    setActing('approve'); setErr('')
    try { await callApi('/registrations/approve', creds, { registration_id: reg.id }); toast(`${reg.school_name} approved successfully`, 'success'); onDone() }
    catch (e) { setErr(e.message); toast(e.message, 'error'); setActing(null) }
  }

  const reject = async () => {
    if (!rejectMsg.trim()) { setErr('Reason required'); return }
    setActing('reject'); setErr('')
    try { await callApi('/registrations/reject', creds, { registration_id: reg.id, reason: rejectMsg }); toast(`${reg.school_name} rejected`, 'warning'); onDone() }
    catch (e) { setErr(e.message); toast(e.message, 'error'); setActing(null) }
  }

  const statusBg = { approved: 'border-l-emerald-500', rejected: 'border-l-red-500', pending: 'border-l-amber-500' }

  return (
    <div className={`rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden border-l-4 ${statusBg[reg.status] || statusBg.pending} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          reg.status === 'pending'  ? 'bg-amber-100 dark:bg-amber-900/30' :
          reg.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          <School className={`w-4.5 h-4.5 ${
            reg.status === 'pending'  ? 'text-amber-600 dark:text-amber-400' :
            reg.status === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{reg.school_name}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {reg.school_code && (
              <span className="text-[11px] font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">{reg.school_code}</span>
            )}
            <span className="text-[11px] text-gray-400 flex items-center gap-1"><MailOpen className="w-3 h-3" />{reg.contact_email}</span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{age}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={reg.status} />
          <div className={`p-1.5 rounded-lg text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30 animate-[slideDown_0.2s_ease-out]">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Admin Name', val: reg.admin_name,       icon: User     },
              { label: 'Admin ID',   val: reg.admin_user_id,    icon: Hash     },
              { label: 'Phone',      val: reg.contact_phone||'—',icon: Phone  },
              { label: 'Session',    val: reg.academic_session, icon: Calendar },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{val}</p>
                </div>
              </div>
            ))}
          </div>

          {reg.address && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Address</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{reg.address}</p>
              </div>
            </div>
          )}

          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40">
              <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium flex-1">{err}</p>
              <button onClick={() => setErr('')}><X className="w-3 h-3 text-red-400" /></button>
            </div>
          )}

          {reg.status === 'pending' && (
            <div className="pt-1">
              {!showReject ? (
                <div className="flex gap-2">
                  <button onClick={approve} disabled={!!acting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm shadow-emerald-500/20">
                    {acting === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve School
                  </button>
                  <button onClick={() => setShowReject(true)} disabled={!!acting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all border border-red-200 dark:border-red-800 disabled:opacity-50">
                    <XCircle className="w-3.5 h-3.5" />Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-2 animate-[slideDown_0.2s_ease-out]">
                  <textarea value={rejectMsg} onChange={e => setRejectMsg(e.target.value)} rows={2}
                    placeholder="Enter reason for rejection…"
                    className="w-full px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={reject} disabled={!!acting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm shadow-red-500/20">
                      {acting === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Confirm Rejection
                    </button>
                    <button onClick={() => { setShowReject(false); setRejectMsg(''); setErr('') }}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {reg.status === 'rejected' && reg.rejection_reason && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 ring-1 ring-red-200 dark:ring-red-800/30">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Rejection Reason</p>
                <p className="text-xs text-red-600 dark:text-red-400">{reg.rejection_reason}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Registrations tab render ────────────────────────────────── */
export function RegistrationsTab({ regs, creds, onDone, loading }) {
  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        </div>
      )}
      {regs.length === 0 ? (
        <EmptyState icon={School} title="No registrations" subtitle="Registrations will appear here" />
      ) : (
        <>
          <p className="text-xs text-gray-400 font-semibold px-1">
            Showing {regs.length} registration{regs.length !== 1 ? 's' : ''}
          </p>
          {regs.map(reg => (
            <RegCard key={reg.id} reg={reg} creds={creds} onDone={onDone} />
          ))}
        </>
      )}
    </div>
  )
}
