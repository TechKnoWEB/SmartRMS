// src/pages/superadmin/saSchoolDrawer.jsx
// UPDATED: Added "Reset Admin Password" section in the Overview tab.
// Super admin can reset any school's admin user password directly.

import { useState } from 'react'
import { callApi, FEATURES, PLAN_FEATURES, DEF_FEATURES, PLANS } from './saConstants'
import { useToast, PlanBadge, ConfirmDialog, Tooltip } from './saComponents'
import {
  GraduationCap, X, ChevronRight, Building2, CreditCard,
  Sliders, StickyNote, Power, AlertTriangle, AlertCircle,
  ToggleLeft, ToggleRight, Save, Loader2, Copy, CheckCheck,
  MapPin, Phone, Calendar, Hash, User, MailOpen, Sparkles,
  Zap, Clock, Lock, Key, Eye, EyeOff, CheckCircle2,
} from 'lucide-react'

/* ── SchoolRow ───────────────────────────────────────────────── */
export function SchoolRow({ school, creds, onUpdated }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const expired      = school.plan_expires_at && new Date(school.plan_expires_at) < new Date()
  const expiringSoon = !expired && school.plan_expires_at && new Date(school.plan_expires_at) < new Date(Date.now() + 7 * 86400000)

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-all group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 flex items-center justify-center flex-shrink-0 shadow-sm">
          <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{school.school_name}</p>
            <PlanBadge plan={school.plan} />
            {expired && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md ring-1 ring-red-200 dark:ring-red-800/40 animate-pulse">
                <AlertTriangle className="w-3 h-3" />EXPIRED
              </span>
            )}
            {expiringSoon && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md ring-1 ring-amber-200 dark:ring-amber-800/40">
                <Clock className="w-3 h-3" />EXPIRING
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-gray-400 font-mono">{school.school_code}</p>
            <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
            <p className="text-[11px] text-gray-400 truncate">{school.contact_email || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tooltip text={school.is_active ? 'School is active' : 'School is inactive'}>
            <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ring-1 ${school.is_active
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800/40'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 ring-gray-200 dark:ring-gray-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${school.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {school.is_active ? 'Active' : 'Inactive'}
            </span>
          </Tooltip>
          <button onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-all group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            Manage<ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {drawerOpen && (
        <SchoolDrawer school={school} creds={creds}
          onClose={() => setDrawerOpen(false)}
          onUpdated={() => { onUpdated(); setDrawerOpen(false) }} />
      )}
    </>
  )
}

/* ── ResetAdminPasswordPanel ─────────────────────────────────── */
// Inline sub-component used inside the Overview tab of SchoolDrawer.
function ResetAdminPasswordPanel({ school, creds }) {
  const { toast }      = useToast()
  const [open,         setOpen]    = useState(false)
  const [newPw,        setNewPw]   = useState('')
  const [confirmPw,    setConfirm] = useState('')
  const [showPw,       setShowPw]  = useState(false)
  const [saving,       setSaving]  = useState(false)

  const adminUserId = school.admin_user_id  // from school_registrations, stored on school object

  const reset = () => { setNewPw(''); setConfirm(''); setSaving(false); setOpen(false) }

  const handleReset = async () => {
    if (!newPw.trim())           { toast('Enter a new password', 'warning');        return }
    if (newPw.length < 8)        { toast('Minimum 8 characters required', 'warning'); return }
    if (newPw !== confirmPw)     { toast('Passwords do not match', 'warning');      return }
    if (!adminUserId)            { toast('Admin user ID not found for this school', 'error'); return }

    setSaving(true)
    try {
      await callApi('/users/reset-password', creds, {
        user_id:      adminUserId,
        new_password: newPw.trim(),
      })
      toast(`Password reset for ${adminUserId}`, 'success')
      reset()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!adminUserId) return null

  return (
    <div className="rounded-xl ring-1 ring-amber-200 dark:ring-amber-800/40 overflow-hidden">
      {/* Collapsed trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Reset Admin Password</p>
          <p className="text-[11px] text-gray-400">For: <span className="font-mono text-indigo-500">{adminUserId}</span></p>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded form */}
      {open && (
        <div className="p-4 space-y-3 border-t border-amber-200/60 dark:border-amber-800/30 bg-white dark:bg-gray-900 animate-[slideDown_0.2s_ease-out]">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-200 dark:ring-amber-800/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              This resets the password for <strong>{adminUserId}</strong>. The admin will need the new password to log in.
              Use this only when the admin has been locked out.
            </p>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Confirm Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              />
            </div>

            {/* Validation feedback */}
            {newPw && confirmPw && newPw !== confirmPw && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40">
                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">Passwords do not match</p>
              </div>
            )}
            {newPw && confirmPw && newPw === confirmPw && newPw.length >= 8 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Passwords match</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={reset} disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleReset} disabled={saving || !newPw || !confirmPw || newPw !== confirmPw || newPw.length < 8}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm shadow-amber-500/20">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
              Reset Password
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── SchoolDrawer ────────────────────────────────────────────── */
export function SchoolDrawer({ school, creds, onClose, onUpdated }) {
  const { toast }       = useToast()
  const [tab,           setTab]           = useState('overview')
  const [saving,        setSaving]        = useState(null)
  const [err,           setErr]           = useState('')
  const [features,      setFeatures]      = useState({ ...DEF_FEATURES, ...(school.features || {}) })
  const [plan,          setPlan]          = useState(school.plan || 'free')
  const [expiry,        setExpiry]        = useState(school.plan_expires_at ? school.plan_expires_at.slice(0, 10) : '')
  const [planNote,      setPlanNote]      = useState(school.plan_note || '')
  const [notes,         setNotes]         = useState(school.admin_notes || '')
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [copied,        setCopied]        = useState(false)

  const act = async (lbl, fn, successMsg) => {
    setSaving(lbl); setErr('')
    try { await fn(); onUpdated(); toast(successMsg || 'Updated successfully', 'success') }
    catch (e) { setErr(e.message); toast(e.message, 'error') }
    finally { setSaving(null) }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast('Copied to clipboard', 'info')
  }

  const applyPlanDefaults = (planKey) => {
    setPlan(planKey)
    setFeatures(prev => ({ ...prev, ...PLAN_FEATURES[planKey] }))
  }

  const DRAWTABS = [
    { key: 'overview',  label: 'Overview',     icon: Building2  },
    { key: 'plan',      label: 'Subscription', icon: CreditCard },
    { key: 'features',  label: 'Features',     icon: Sliders    },
    { key: 'notes',     label: 'Notes',        icon: StickyNote },
  ]

  const expired         = school.plan_expires_at && new Date(school.plan_expires_at) < new Date()
  const daysUntilExpiry = school.plan_expires_at
    ? Math.ceil((new Date(school.plan_expires_at) - new Date()) / 86400000)
    : null

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ml-auto w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden animate-[slideInRight_0.3s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 dark:text-white text-sm truncate">{school.school_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] font-mono text-gray-400">{school.school_code}</p>
                <button onClick={() => copyToClipboard(school.school_code)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                  {copied ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge plan={school.plan} />
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expiry banners */}
        {expired && (
          <div className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs font-bold text-red-600 dark:text-red-400">Plan expired {Math.abs(daysUntilExpiry)} days ago</p>
          </div>
        )}
        {!expired && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Plan expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0 overflow-x-auto px-2">
          {DRAWTABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${tab === t.key
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {err && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40 flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400 flex-1">{err}</p>
            <button onClick={() => setErr('')} className="p-0.5"><X className="w-3 h-3 text-red-400" /></button>
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="space-y-3">
              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${school.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Power className={`w-4.5 h-4.5 ${school.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">School Access</p>
                    <p className="text-xs text-gray-400">{school.is_active ? 'Active — can log in & use system' : 'Deactivated — all access blocked'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDialog({
                    title:        school.is_active ? 'Deactivate School?' : 'Activate School?',
                    message:      school.is_active ? `${school.school_name} will lose all access immediately.` : `${school.school_name} will regain full access.`,
                    confirmLabel: school.is_active ? 'Deactivate' : 'Activate',
                    danger:       school.is_active,
                    onConfirm:    () => {
                      setConfirmDialog(null)
                      act('active', () => callApi('/schools/toggle-active', creds, { school_id: school.id, is_active: !school.is_active }),
                        `School ${school.is_active ? 'deactivated' : 'activated'}`)
                    },
                  })}
                  disabled={saving === 'active'}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50 ${school.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${school.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Info rows */}
              {[
                { icon: MailOpen, label: 'Email',    val: school.contact_email || '—' },
                { icon: Phone,    label: 'Phone',    val: school.contact_phone || '—' },
                { icon: Calendar, label: 'Session',  val: school.academic_session || '—' },
                { icon: MapPin,   label: 'Address',  val: school.address || '—' },
                { icon: User,     label: 'Admin ID', val: school.admin_user_id || '—', copyable: true },
              ].map(({ icon: Icon, label, val, copyable }) => (
                <div key={label} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 group">
                  <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-all">{val}</p>
                  </div>
                  {copyable && val !== '—' && (
                    <button onClick={() => copyToClipboard(val)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}

              {/* ── RESET ADMIN PASSWORD ── NEW SECTION ── */}
              <ResetAdminPasswordPanel school={school} creds={creds} />

              {/* Active features summary */}
              <div className="px-4 py-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 ring-1 ring-indigo-100 dark:ring-indigo-900/30">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Active Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {FEATURES.filter(f => (school.features || DEF_FEATURES)[f.key]).map(f => (
                    <span key={f.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                      <f.icon className="w-3 h-3" />{f.label}
                    </span>
                  ))}
                  {FEATURES.filter(f => (school.features || DEF_FEATURES)[f.key]).length === 0 && (
                    <span className="text-xs text-gray-400">No features enabled</span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center pt-2">
                Created {new Date(school.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Plan tab */}
          {tab === 'plan' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Select Plan</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLANS.map(p => {
                    const isSelected = plan === p.key
                    const gradients  = {
                      free:       'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700',
                      basic:      'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
                      pro:        'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20',
                      enterprise: 'from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20',
                    }
                    return (
                      <button key={p.key} onClick={() => applyPlanDefaults(p.key)}
                        className={`relative flex flex-col p-3.5 rounded-2xl border-2 text-left transition-all ${isSelected
                          ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradients[p.key]} flex items-center justify-center mb-2`}>
                          {p.key === 'enterprise' ? <Sparkles className="w-4 h-4 text-violet-500" /> : <Zap className="w-4 h-4 text-gray-500" />}
                        </div>
                        <p className="text-sm font-black text-gray-800 dark:text-gray-200">{p.label}</p>
                        <p className="text-xs font-bold text-indigo-500 mt-0.5">{p.price}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Up to {p.maxStudents} students</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Expiry Date <span className="text-gray-400 font-normal ml-1">(blank = no expiry)</span>
                </label>
                <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
                {expiry && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {new Date(expiry) < new Date() ? (
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />This date is in the past</p>
                    ) : (
                      <p className="text-[11px] text-gray-400 font-semibold">{Math.ceil((new Date(expiry) - new Date()) / 86400000)} days from now</p>
                    )}
                    <button onClick={() => setExpiry('')} className="text-[11px] text-gray-400 hover:text-red-500 font-semibold ml-auto">Clear</button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">Internal Plan Note</label>
                <input type="text" value={planNote} onChange={e => setPlanNote(e.target.value)}
                  placeholder="e.g. Paid via UPI on 15 Jan 2026 — Ref: TXN123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
              </div>

              <button
                onClick={() => act('plan', () => callApi('/schools/set-plan', creds, {
                  school_id: school.id, plan, plan_expires_at: expiry || null, plan_note: planNote || null
                }), `Plan updated to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`)}
                disabled={saving === 'plan'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">
                {saving === 'plan' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Subscription
              </button>
            </div>
          )}

          {/* Features tab */}
          {tab === 'features' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Toggle features on/off for this school.</p>
                <button onClick={() => setFeatures({ ...PLAN_FEATURES[plan] })}
                  className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                  Reset to plan defaults
                </button>
              </div>

              {FEATURES.map(f => {
                const enabled     = features[f.key]
                const planDefault = PLAN_FEATURES[plan]?.[f.key]
                const isOverride  = enabled !== planDefault
                return (
                  <div key={f.key}
                    className={`flex items-center justify-between p-4 rounded-xl ring-1 transition-all ${enabled
                      ? 'bg-white dark:bg-gray-800 ring-indigo-200 dark:ring-indigo-800/40'
                      : 'bg-gray-50 dark:bg-gray-800/50 ring-gray-200 dark:ring-gray-700'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${enabled ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <f.icon className={`w-4 h-4 transition-colors ${enabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold transition-colors ${enabled ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}`}>{f.label}</p>
                          {isOverride && <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">CUSTOM</span>}
                        </div>
                        <p className="text-[11px] text-gray-400">{f.desc}</p>
                      </div>
                    </div>
                    <button onClick={() => setFeatures(p => ({ ...p, [f.key]: !p[f.key] }))} className="flex-shrink-0">
                      {enabled
                        ? <ToggleRight className="w-9 h-9 text-indigo-500 transition-colors" />
                        : <ToggleLeft  className="w-9 h-9 text-gray-300 dark:text-gray-600 transition-colors" />}
                    </button>
                  </div>
                )
              })}

              <button
                onClick={() => act('features', () => callApi('/schools/set-features', creds, { school_id: school.id, features }), 'Features updated successfully')}
                disabled={saving === 'features'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">
                {saving === 'features' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Features
              </button>
            </div>
          )}

          {/* Notes tab */}
          {tab === 'notes' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-200 dark:ring-amber-800/30">
                <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Internal only — never shown to the school</p>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={10}
                placeholder="e.g. Contacted on 10 Jan, waiting for payment confirmation. Principal: Mr. Sharma, prefers phone calls."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 resize-none leading-relaxed transition-all" />
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>{notes.length} characters</span>
                <span>Last updated: {school.notes_updated_at ? new Date(school.notes_updated_at).toLocaleDateString() : 'Never'}</span>
              </div>
              <button
                onClick={() => act('notes', () => callApi('/schools/set-notes', creds, { school_id: school.id, notes }), 'Notes saved')}
                disabled={saving === 'notes'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">
                {saving === 'notes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Notes
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          danger={confirmDialog.danger}
          loading={saving === 'active'}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </div>
  )
}
