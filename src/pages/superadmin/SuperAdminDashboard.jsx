// src/pages/superadmin/SuperAdminDashboard.jsx
//
// Single entry-point for the entire super admin panel.
// Imports shared pieces from sibling files; owns the shell + all tab components.
//
// ── FILE MAP (superadmin folder) ─────────────────────────────
//   SuperAdminDashboard.jsx   ← YOU ARE HERE
//     Shell: topbar, tab bar, routing
//     Tab components (inline, no separate file needed):
//       • PlatformAnalytics   — Analytics tab
//       • PackageManagement   — Packages tab
//       • PlatformConfig      — Platform Config tab
//       • CrossSchoolUsers    — Users tab
//
//   saDashboardOverview.jsx   — Overview tab (hero banner, stat cards, activity)
//                               EDIT THIS FILE to redesign the dashboard home screen
//   saConstants.js            — PLANS, FEATURES, callApi()
//   useSuperAdmin.js          — data fetching hook (creds, schools, regs, load)
//   saComponents.jsx          — shared UI: StatCard, PlanBadge, ToastProvider, etc.
//   saNotifications.jsx       — Email alert settings modal
//   saSchoolDrawer.jsx        — SchoolDrawer + SchoolRow
//   saLoginGate.jsx           — Login screen
//   saRegistrationsTab.jsx    — RegCard + registrations list
//   saSchoolsTab.jsx          — Schools list tab

// src/pages/superadmin/SuperAdminDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
  ShieldCheck, RefreshCw, LogOut, Bell, Sun, Moon, Menu,
  Clock, Building2, Power, FileText, CheckCircle2, XCircle,
  BarChart2, Zap, Sliders, Users, AlertTriangle, X, Wifi,
  Loader2, Search,
} from 'lucide-react'

import { ThemeContext, ToastProvider, Tooltip, LoadingGrid, useToast } from './saComponents'
import { callApi }                 from './saConstants'
import { useSuperAdmin }           from './useSuperAdmin'
import { LoginGate }               from './saLoginGate'
import { DashboardOverview }       from './saDashboardOverview'
import { RegistrationsTab }        from './saRegistrationsTab'
import { SchoolsTab }              from './saSchoolsTab'
import { NotificationSettingsModal } from './saNotifications'
import SidebarLayout               from './SidebarLayout'
import PackageManagement           from './PackageManagement'

// ════════════════════════════════════════════════════════════
// TAB: PLATFORM ANALYTICS
// ════════════════════════════════════════════════════════════
function PlatformAnalytics({ schools, creds }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await callApi('/stats/platform', creds)
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [creds])

  useEffect(() => { refresh() }, [refresh])

  const num = (v) =>
    typeof v === 'number' && !isNaN(v) ? v : undefined

  const t          = data?.totals            ?? {}
  const planDist   = data?.plan_distribution ?? {}
  const regsByDay  = (data?.regs_by_day      ?? []).map(d => d.count ?? 0)
  const actByType  = data?.activity_by_type  ?? {}
  const topSchools = data?.top_schools       ?? []

  const inactiveCount =
    num(t.schools) !== undefined && num(t.active_schools) !== undefined
      ? t.schools - t.active_schools
      : undefined

  const enrichedTop = topSchools.map(ts => ({
    ...ts,
    name: schools.find(sc => sc.id === ts.id)?.school_name ?? ts.school_name ?? 'Unknown',
  }))

  const ACTIVITY_LABELS = {
    MARKS_SAVE: 'Marks saved',      MARKS_DELETE: 'Marks deleted',
    STUDENT_ADD: 'Students added',  STUDENT_UPDATE: 'Students updated',
    PUBLISH: 'Results published',   EXPORT_PDF: 'PDF exports',
    EXPORT_EXCEL: 'Excel exports',  USER_LOGIN: 'Logins',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Platform Analytics</h2>
          <p className="text-xs text-gray-400 mt-0.5">Live aggregate statistics across all schools</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800
                     text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200
                     dark:hover:bg-gray-700 disabled:opacity-50 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20
                        ring-1 ring-red-200 dark:ring-red-800/40 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={refresh} className="font-bold underline text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-2xl h-20" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Schools',    value: num(t.schools), color: 'indigo',
                sub: num(t.active_schools) !== undefined ? `${t.active_schools} active` : undefined },
              { label: 'Total Students',   value: num(t.students) !== undefined
                  ? t.students?.toLocaleString('en-IN') : undefined, color: 'emerald' },
              { label: 'Marks Records',    value: num(t.marks) !== undefined
                  ? t.marks?.toLocaleString('en-IN') : undefined, color: 'blue' },
              { label: 'Total Users',      value: num(t.users), color: 'violet',
                sub: [num(t.admins) !== undefined ? `${t.admins} admins` : null,
                      num(t.teachers) !== undefined ? `${t.teachers} teachers` : null]
                  .filter(Boolean).join(' · ') || undefined },
              { label: 'Expired Plans',    value: num(t.expired_schools),  color: 'red',   sub: 'Need renewal' },
              { label: 'Expiring Soon',    value: num(t.expiring_schools), color: 'amber', sub: 'Within 7 days' },
              { label: 'Pending Regs',     value: num(t.pending_regs),    color: 'amber' },
              { label: 'Inactive Schools', value: inactiveCount,          color: 'gray' },
            ].map(({ label, value, color, sub }) => {
              const display = value === undefined || value === null ? '—' : value
              return (
                <div key={label}
                  className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                             dark:border-gray-800 p-4 shadow-sm">
                  <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
                    {display}
                  </p>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                    {label}
                  </p>
                  {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Registrations sparkline */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                            dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
                    Registrations
                  </h3>
                  <p className="text-[10px] text-gray-400">Last 14 days</p>
                </div>
                <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                  {regsByDay.reduce((a, b) => a + b, 0)}
                </span>
              </div>
              {regsByDay.length > 0 ? (
                <div className="flex items-end gap-px h-12">
                  {regsByDay.map((v, i) => {
                    const max = Math.max(...regsByDay, 1)
                    return (
                      <div key={i} className="flex-1 rounded-sm bg-indigo-400"
                        style={{
                          height: `${Math.max((v / max) * 100, 4)}%`,
                          opacity: 0.6 + (i / regsByDay.length) * 0.4,
                        }} />
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-6">
                  No registrations in last 14 days
                </p>
              )}
            </div>

            {/* Plan distribution */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                            dark:border-gray-800 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 mb-4">
                Plan distribution
              </h3>
              <div className="flex rounded-full h-3 overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
                {[
                  { key: 'enterprise', color: 'bg-violet-500' },
                  { key: 'pro',        color: 'bg-indigo-500' },
                  { key: 'basic',      color: 'bg-blue-500' },
                  { key: 'free',       color: 'bg-gray-300 dark:bg-gray-600' },
                ].map(p => {
                  const pct = ((planDist[p.key] ?? 0) / Math.max(num(t.schools) ?? 1, 1)) * 100
                  return pct > 0
                    ? <div key={p.key} className={`${p.color} transition-all duration-700`}
                        style={{ width: `${pct}%` }} />
                    : null
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['enterprise', 'bg-violet-500', 'Enterprise'],
                  ['pro',        'bg-indigo-500', 'Pro'],
                  ['basic',      'bg-blue-500',   'Basic'],
                  ['free',       'bg-gray-300 dark:bg-gray-600', 'Free'],
                ].map(([key, dot, lbl]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                                            bg-gray-50 dark:bg-gray-800/50">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex-1">
                      {lbl}
                    </span>
                    <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
                      {planDist[key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity breakdown */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                            dark:border-gray-800 p-5 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 mb-3">
                Activity (30d)
              </h3>
              <div className="space-y-1.5">
                {Object.entries(actByType).sort(([, a], [, b]) => b - a).slice(0, 6).map(([type, count]) => {
                  const maxVal = Math.max(...Object.values(actByType), 1)
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-gray-400 w-28 flex-shrink-0 truncate">
                        {ACTIVITY_LABELS[type] ?? type}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${(count / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-xs font-black text-gray-600 dark:text-gray-400
                                       tabular-nums w-8 text-right">{count}</span>
                    </div>
                  )
                })}
                {Object.keys(actByType).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No activity in last 30 days
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Most active schools */}
          {enrichedTop.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                            dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
                  Most active schools (30d)
                </h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {enrichedTop.map((s, i) => (
                  <div key={s.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50
                               dark:hover:bg-gray-800/50 transition-colors">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30
                                     text-indigo-600 dark:text-indigo-400 text-xs font-black flex
                                     items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {s.name}
                      </p>
                      <p className="text-[11px] text-gray-400">{s.student_count ?? 0} students</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      s.plan === 'enterprise' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                      s.plan === 'pro'        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                      s.plan === 'basic'      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>{s.plan}</span>
                    <span className="text-sm font-black text-gray-600 dark:text-gray-400 tabular-nums
                                     w-16 text-right">{s.activity_count ?? 0} events</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/*-------comment out code
// ════════════════════════════════════════════════════════════
// TAB: PACKAGE MANAGEMENT
// ════════════════════════════════════════════════════════════
function PackageManagement({ schools, creds, onUpdated }) {
  const { toast }      = useToast()
  const [packages,     setPackages]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(null)
  const [search,       setSearch]       = useState('')
  const [assignModal,  setAssignModal]  = useState(null)
  const [assignPkg,    setAssignPkg]    = useState('')
  const [assignExpiry, setAssignExpiry] = useState('')
  const [assignNotes,  setAssignNotes]  = useState('')

  useEffect(() => {
    supabase.from('packages').select('*').order('display_order').then(({ data }) => {
      setPackages(data ?? [])
      setLoading(false)
    })
  }, [])

  const handleAssign = async () => {
    if (!assignModal || !assignPkg) return
    setSaving(assignModal.school.id)
    try {
      await callApi('/schools/set-package', creds, {
        school_id:  assignModal.school.id,
        package_id: assignPkg,
        expires_at: assignExpiry || null,
        notes:      assignNotes  || null,
      })
      toast(`Package assigned to ${assignModal.school.school_name}`, 'success')
      setAssignModal(null)
      onUpdated()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(null)
    }
  }

  const filtered = schools.filter(s => {
    const q = search.toLowerCase()
    return !q || s.school_name.toLowerCase().includes(q) || s.school_code.includes(q)
  })

  const PKG_COLOR = {
    Basic:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40',
    Standard: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40',
    Premium:  'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/40',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white">Package Management</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Assign tiered packages to schools. Features update instantly via Realtime.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-2xl h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {packages.filter(p => p.is_active).map(pkg => {
            const schoolsOnPkg = schools.filter(s => s.plan === pkg.plan_key).length
            const features     = pkg.feature_preset ?? {}
            const enabledCount = Object.values(features).filter(Boolean).length
            return (
              <div key={pkg.id}
                className={`rounded-2xl border p-5 ${PKG_COLOR[pkg.name] ??
                  'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">{pkg.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {pkg.price_monthly > 0
                        ? `₹${(pkg.price_monthly / 100).toLocaleString('en-IN')}/mo`
                        : 'Custom pricing'}
                    </p>
                  </div>
                  <span className="text-xl font-black text-gray-500 dark:text-gray-400 tabular-nums">
                    {schoolsOnPkg}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">{pkg.description}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {enabledCount}/{Object.keys(features).length} features · Max{' '}
                  {pkg.max_students < 0 ? '∞' : pkg.max_students} students
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(features).filter(([, v]) => v).map(([k]) => (
                    <span key={k}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/60
                                 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400">
                      {k.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* School list */ /*<---comment out code } 
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                      dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 flex-1">
            Assign to school
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search schools…"
              className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-gray-50 dark:bg-gray-800 text-xs placeholder-gray-400 focus:outline-none
                         focus:ring-2 focus:ring-indigo-400/40 w-48 text-gray-800 dark:text-gray-200" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No schools found</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
            {filtered.map(s => {
              const exp = s.plan_expires_at && new Date(s.plan_expires_at) < new Date()
              return (
                <div key={s.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50
                             dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {s.school_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-indigo-500">{s.school_code}</span>
                      {exp && <span className="text-[10px] font-bold text-red-500">Expired</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    s.plan === 'enterprise' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                    s.plan === 'pro'        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                    s.plan === 'basic'      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>{s.plan ?? 'free'}</span>
                  <button
                    onClick={() => {
                      setAssignModal({ school: s })
                      setAssignPkg(''); setAssignExpiry(''); setAssignNotes('')
                    }}
                    disabled={saving === s.id}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold
                               bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50
                               shadow-sm shadow-indigo-500/20 transition-all">
                    {saving === s.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Zap className="w-3.5 h-3.5" />}
                    Assign
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign modal */ /*<----comment out code}
      {assignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => e.target === e.currentTarget && setAssignModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200
                          dark:border-gray-800 w-full max-w-sm mx-4 p-6
                          animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              Assign Package
            </h3>
            <p className="text-xs text-gray-400 mb-5">{assignModal.school.school_name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase
                                  tracking-wider block mb-1.5">Select Package</label>
                <div className="space-y-2">
                  {packages.filter(p => p.is_active).map(pkg => (
                    <button key={pkg.id} onClick={() => setAssignPkg(pkg.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left
                                  transition-all ${assignPkg === pkg.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        pkg.name === 'Premium' ? 'bg-violet-500' :
                        pkg.name === 'Standard' ? 'bg-indigo-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{pkg.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {pkg.price_monthly > 0
                            ? `₹${(pkg.price_monthly / 100).toLocaleString('en-IN')}/mo`
                            : 'Custom'} · Up to {pkg.max_students < 0 ? '∞' : pkg.max_students} students
                        </p>
                      </div>
                      {assignPkg === pkg.id && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase
                                  tracking-wider block mb-1.5">
                  Expiry Date <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input type="date" value={assignExpiry} onChange={e => setAssignExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                             bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200
                             focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase
                                  tracking-wider block mb-1.5">
                  Notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input type="text" value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
                  placeholder="e.g. Paid via UPI — Ref: TXN123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                             bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setAssignModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                           text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-50
                           dark:hover:bg-gray-800 transition-all">
                Cancel
              </button>
              <button onClick={handleAssign} disabled={!assignPkg || !!saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold
                           shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Assign Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
 comment out code --->*/

// ════════════════════════════════════════════════════════════
// TAB: PLATFORM CONFIG
// ════════════════════════════════════════════════════════════
function PlatformConfig({ creds }) {
  const { toast }  = useToast()
  const [config,   setConfig]  = useState([])
  const [loading,  setLoading] = useState(true)
  const [editing,  setEditing] = useState({})
  const [saving,   setSaving]  = useState(null)
  const [saved,    setSaved]   = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { config: rows } = await callApi('/platform/config/list', creds)
      setConfig(rows ?? [])
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [creds])

  useEffect(() => { load() }, [load])

  const handleSave = async (key) => {
    const rawVal = editing[key]
    if (rawVal === undefined) return
    setSaving(key)
    try {
      let parsed; try { parsed = JSON.parse(rawVal) } catch { parsed = rawVal }
      await callApi('/platform/config/update', creds, { key, value: parsed })
      setSaved(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[key]; return n }), 2000)
      setEditing(prev => { const n = { ...prev }; delete n[key]; return n })
      load()
    } catch (e) {
      toast(`Failed to save ${key}: ${e.message}`, 'error')
    } finally {
      setSaving(null)
    }
  }

  const FRIENDLY = {
    default_term_count:        { label: 'Default term count',         desc: 'Number of exam terms (1–3)' },
    attendance_module_plans:   { label: 'Attendance — allowed plans', desc: 'JSON array e.g. ["pro","enterprise"]' },
    grading_systems_available: { label: 'Available grading systems',  desc: '["percentage","grade","cgpa"]' },
    bulk_operations_plans:     { label: 'Bulk ops — allowed plans',   desc: 'Which plans get bulk import/export' },
    sms_alerts_plans:          { label: 'SMS alerts — allowed plans', desc: 'Which plans get SMS/WhatsApp' },
    student_portal_plans:      { label: 'Student portal — plans',     desc: 'Plans that unlock public portal' },
    analytics_plans:           { label: 'Analytics — plans',          desc: 'Plans that unlock analytics' },
    excel_export_plans:        { label: 'Excel export — plans',       desc: 'Plans that unlock Excel export' },
    platform_support_email:    { label: 'Support email',              desc: 'Shown on lock/expiry screens' },
    platform_name:             { label: 'Platform name',              desc: 'Brand name shown in UI' },
    registration_open:         { label: 'Registration open',          desc: 'Allow new school self-registration' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Platform Configuration</h2>
          <p className="text-xs text-gray-400 mt-0.5">Global settings applied across all schools</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800
                     text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200
                     dark:hover:bg-gray-700 disabled:opacity-50 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl h-16" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                        dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
          {config.map(row => {
            const meta    = FRIENDLY[row.key]
            const isDraft = editing[row.key] !== undefined
            const current = typeof row.value === 'string' ? row.value : JSON.stringify(row.value)
            const draft   = editing[row.key] ?? current
            return (
              <div key={row.key} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {meta?.label ?? row.key}
                  </p>
                  {saved[row.key] && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400
                                     flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />Saved
                    </span>
                  )}
                </div>
                {meta?.desc && <p className="text-[11px] text-gray-400 mb-2">{meta.desc}</p>}
                <div className="flex items-center gap-2">
                  <input type="text" value={draft}
                    onChange={e => setEditing(prev => ({ ...prev, [row.key]: e.target.value }))}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm font-mono
                                focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all
                                ${isDraft
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 text-gray-800 dark:text-gray-200'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`} />
                  {isDraft && (
                    <>
                      <button onClick={() => handleSave(row.key)} disabled={saving === row.key}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600
                                   hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50
                                   whitespace-nowrap transition-all">
                        {saving === row.key
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button onClick={() => setEditing(prev => {
                          const n = { ...prev }; delete n[row.key]; return n
                        })}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700
                                   text-gray-400 hover:text-red-500 hover:border-red-300 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                {row.updated_at && (
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Last updated{' '}
                    {new Date(row.updated_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                    {row.updated_by ? ` by ${row.updated_by}` : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50/50
                      dark:bg-amber-900/10 ring-1 ring-amber-100 dark:ring-amber-900/30">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
          JSON arrays need double quotes:{' '}
          <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
            ["pro","enterprise"]
          </code>. Booleans:{' '}
          <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">true</code> or{' '}
          <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">false</code>.
        </p>
      </div>
    </div>
  )
}


// ════════════════════════════════════════════════════════════
// TAB: CROSS-SCHOOL USERS
// ════════════════════════════════════════════════════════════
function CrossSchoolUsers({ creds, schools }) {
  const { toast }      = useToast()
  const [users,        setUsers]        = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('all')
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [toggling,     setToggling]     = useState(null)
  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await callApi('/users/list', creds, {
        school_id: schoolFilter !== 'all' ? schoolFilter : undefined,
        role:      roleFilter   !== 'all' ? roleFilter   : undefined,
        page, per_page: PER_PAGE,
      })
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [creds, page, roleFilter, schoolFilter])

  useEffect(() => { load() }, [load])

  const handleToggle = async (u) => {
    setToggling(u.user_id)
    try {
      await callApi('/users/toggle-active', creds, {
        user_id: u.user_id, is_active: !u.is_active,
      })
      toast(`${u.name} ${!u.is_active ? 'enabled' : 'disabled'}`, !u.is_active ? 'success' : 'info')
      load()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setToggling(null)
    }
  }

  const filtered   = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.user_id.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.school_name ?? '').toLowerCase().includes(q)
  })
  const totalPages = Math.ceil(total / PER_PAGE)

  const ROLE_COLOR = {
    admin:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    viewer:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white">User Management</h2>
        <p className="text-xs text-gray-400 mt-0.5">View and manage users across all schools.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name, ID, school…"
            className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-xs placeholder-gray-400 focus:outline-none
                       focus:ring-2 focus:ring-indigo-400/40 w-44 text-gray-800 dark:text-gray-200" />
        </div>
        <select value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white
                     dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-400/40 cursor-pointer">
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="viewer">Viewer</option>
        </select>
        <select value={schoolFilter}
          onChange={e => { setSchoolFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white
                     dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-400/40 cursor-pointer max-w-[200px]">
          <option value="all">All schools</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
        </select>
        <span className="text-[11px] text-gray-400 ml-auto">{total} total users</span>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100
                      dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No users found</div>
        ) : (
          <>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(u => (
                <div key={u.user_id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50
                             dark:hover:bg-gray-800/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500
                                  flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-xs font-black">
                      {u.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {u.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-indigo-500">{u.user_id}</span>
                      <span className="text-[10px] text-gray-400 truncate">{u.school_name}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md
                    ${ROLE_COLOR[u.role] ?? ROLE_COLOR.viewer}`}>{u.role}</span>
                  {u.last_login
                    ? <span className="text-[10px] text-gray-400 hidden sm:block w-24 text-right
                                       flex-shrink-0">
                        {new Date(u.last_login).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short',
                        })}
                      </span>
                    : <span className="text-[10px] text-gray-300 dark:text-gray-600 hidden sm:block
                                       w-24 text-right flex-shrink-0">Never</span>
                  }
                  <button onClick={() => handleToggle(u)} disabled={toggling === u.user_id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold
                                transition-all disabled:opacity-50 ${u.is_active
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}>
                    {toggling === u.user_id && <Loader2 className="w-3 h-3 animate-spin" />}
                    {u.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100
                              dark:border-gray-800">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400
                             bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                             disabled:opacity-40 transition-all">
                  ← Prev
                </button>
                <span className="text-xs text-gray-400">
                  Page {page} of {totalPages} · {total} users
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400
                             bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                             disabled:opacity-40 transition-all">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


// ════════════════════════════════════════════════════════════
// CONTENT TOOLBAR (search + filters for reg/school tabs)
// ════════════════════════════════════════════════════════════
function ContentToolbar({ tab, search, setSearch, sortBy, setSortBy, planFilter, setPlanFilter }) {
  const isSchoolTab = tab === 'schools' || tab === 'inactive'
  const PLANS = [
    { key: 'free', label: 'Free' }, { key: 'basic', label: 'Basic' },
    { key: 'pro',  label: 'Pro'  }, { key: 'enterprise', label: 'Enterprise' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 rounded-2xl bg-white dark:bg-gray-900
                    border border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm">
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search schools, emails, codes…"
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                     bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white
                     placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40
                     transition-all" />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-2.5 top-2.5 p-0.5 rounded hover:bg-gray-200
                       dark:hover:bg-gray-700">
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>
      <select value={sortBy} onChange={e => setSortBy(e.target.value)}
        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50
                   dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-indigo-400/40 cursor-pointer">
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="name">Name A-Z</option>
      </select>
      {isSchoolTab && (
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50
                     dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-400/40 cursor-pointer">
          <option value="all">All Plans</option>
          {PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD — sidebar shell + content router
// ════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const {
    creds, setCreds,
    regs, schools, counts,
    loading, initialLoad, err, setErr,
    lastRefresh, notifConfigured, setNotifConfigured, checkNotifStatus,
    load,
  } = useSuperAdmin()

  const [tab,        setTab]        = useState('dashboard')
  const [search,     setSearch]     = useState('')
  const [sortBy,     setSortBy]     = useState('newest')
  const [planFilter, setPlanFilter] = useState('all')
  const [notifModal, setNotifModal] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sa-theme') === 'dark' ||
      (!localStorage.getItem('sa-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('sa-theme', dark ? 'dark' : 'light')
  }, [dark])

  // Reset search/filters on tab change
  const handleNavigate = (key) => {
    setTab(key)
    setSearch('')
    setPlanFilter('all')
  }

  const isSchoolTab  = tab === 'schools' || tab === 'inactive'
  const isNewTab     = ['analytics', 'packages', 'platform', 'users_mgmt'].includes(tab)
  const isDashboard  = tab === 'dashboard'
  const showToolbar  = !isDashboard && !isNewTab

  const filteredRegs = useMemo(() => regs.filter(r => {
    const matchTab = tab === 'all' || r.status === tab
    const q = search.toLowerCase()
    return matchTab && (!q ||
      r.school_name.toLowerCase().includes(q) ||
      r.contact_email.toLowerCase().includes(q) ||
      (r.admin_user_id ?? '').toLowerCase().includes(q) ||
      (r.school_code ?? '').toLowerCase().includes(q))
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'name')   return a.school_name.localeCompare(b.school_name)
    return 0
  }), [regs, tab, search, sortBy])

  const filteredSchools = useMemo(() => schools.filter(s => {
    if (tab === 'inactive' && s.is_active) return false
    if (planFilter !== 'all' && (s.plan || 'free') !== planFilter) return false
    const q = search.toLowerCase()
    return !q ||
      s.school_name.toLowerCase().includes(q) ||
      s.school_code.includes(q) ||
      (s.contact_email ?? '').toLowerCase().includes(q)
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'name')   return a.school_name.localeCompare(b.school_name)
    return 0
  }), [schools, tab, planFilter, search, sortBy])

  // ── Login gate ──
  if (!creds) {
    return (
      <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
        <ToastProvider>
          <LoginGate onAuth={setCreds} />
        </ToastProvider>
      </ThemeContext.Provider>
    )
  }

  // ── Sidebar counts ──
  const sidebarCounts = {
    pending:  counts.pending,
    approved: counts.approved,
    rejected: counts.rejected,
    total:    counts.total,
    active:   counts.active,
    inactive: counts.inactive,
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      <ToastProvider>
        <SidebarLayout
          activeTab={tab}
          onNavigate={handleNavigate}
          counts={sidebarCounts}
          dark={dark}
          onToggleDark={() => setDark(d => !d)}
          onRefresh={load}
          onSignOut={() => setCreds(null)}
          onNotifClick={() => setNotifModal(true)}
          loading={loading}
          adminId={creds.adminId}
          lastRefresh={lastRefresh}
          notifConfigured={notifConfigured}
        >
          {/* ── Notification setup banner ── */}
          {!notifConfigured && !initialLoad && (
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r
                            from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30
                            ring-1 ring-indigo-200 dark:ring-indigo-800/40 mb-6
                            animate-[slideDown_0.3s_ease-out]">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex
                              items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">
                  Set up email alerts
                </p>
                <p className="text-xs text-indigo-500/70 dark:text-indigo-400/70">
                  Get notified instantly when a new school registers.
                </p>
              </div>
              <button onClick={() => setNotifModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500
                           hover:bg-indigo-600 text-white text-xs font-bold flex-shrink-0
                           transition-all">
                <Bell className="w-3.5 h-3.5" />Configure
              </button>
              <button onClick={() => setNotifConfigured(true)}
                className="p-1.5 rounded-lg text-indigo-300 hover:text-indigo-500
                           hover:bg-indigo-100 dark:hover:bg-indigo-900/30 flex-shrink-0
                           transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Error banner ── */}
          {err && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50
                            dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40 mb-6">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{err}</p>
              <button onClick={() => setErr('')}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          )}

          {/* ── Toolbar for reg/school tabs ── */}
          {showToolbar && (
            <ContentToolbar
              tab={tab}
              search={search}
              setSearch={setSearch}
              sortBy={sortBy}
              setSortBy={setSortBy}
              planFilter={planFilter}
              setPlanFilter={setPlanFilter}
            />
          )}

          {/* ── Tab content ── */}
          {initialLoad ? (
            <LoadingGrid />
          ) : isDashboard ? (
            <DashboardOverview regs={regs} schools={schools} onNavigate={handleNavigate} />
          ) : tab === 'analytics' ? (
            <PlatformAnalytics schools={schools} creds={creds} />
          ) : tab === 'packages' ? (
            <PackageManagement schools={schools} creds={creds} onUpdated={load} />
          ) : tab === 'platform' ? (
            <PlatformConfig creds={creds} />
          ) : tab === 'users_mgmt' ? (
            <CrossSchoolUsers creds={creds} schools={schools} />
          ) : isSchoolTab ? (
            <SchoolsTab schools={filteredSchools} creds={creds} onUpdated={load}
              loading={loading} tab={tab} />
          ) : (
            <RegistrationsTab regs={filteredRegs} creds={creds} onDone={load} loading={loading} />
          )}

          {/* ── Notification modal ── */}
          {notifModal && (
            <NotificationSettingsModal
              onClose={() => { setNotifModal(false); checkNotifStatus() }}
            />
          )}
        </SidebarLayout>
      </ToastProvider>
    </ThemeContext.Provider>
  )
}