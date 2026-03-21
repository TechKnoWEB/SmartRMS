// src/pages/superadmin/saComponents.jsx
// Shared UI primitives used across multiple super admin tabs.
// Nothing here fetches data or calls the API.

import { useState, useMemo } from 'react'
import {
  ArrowUpRight, ArrowDownRight, AlertTriangle, HelpCircle,
  Loader2, CheckCircle2, XCircle, Clock, Activity,
  Building2, Power, CreditCard, AlertCircle, Sparkles, Zap,
  Database, Server, HardDrive, Shield,
} from 'lucide-react'
import { PLANS } from './saConstants'

/* ── Theme context (self-contained in super admin) ───────────── */
import { createContext, useContext } from 'react'
export const ThemeContext = createContext({ dark: false, toggle: () => {} })
export function useTheme() { return useContext(ThemeContext) }

/* ── Toast context ───────────────────────────────────────────── */
export const ToastContext = createContext({ toast: () => {} })
export function useToast() { return useContext(ToastContext) }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }
  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
            backdrop-blur-xl border min-w-[300px] max-w-[420px]
            animate-[slideInRight_0.3s_ease-out]
            ${t.type === 'success'
              ? 'bg-emerald-50/95 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-200'
              : t.type === 'error'
                ? 'bg-red-50/95 dark:bg-red-900/40 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-200'
                : t.type === 'warning'
                  ? 'bg-amber-50/95 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-200'
                  : 'bg-white/95 dark:bg-gray-800/95 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
            }
          `}>
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            {t.type === 'error'   && <XCircle      className="w-5 h-5 text-red-500 flex-shrink-0"     />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0"  />}
            {t.type === 'info'    && <AlertCircle  className="w-5 h-5 text-blue-500 flex-shrink-0"    />}
            <p className="text-sm font-semibold flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0">
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ── Tooltip ─────────────────────────────────────────────────── */
export function Tooltip({ children, text }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-semibold whitespace-nowrap shadow-xl z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45" />
        </div>
      )}
    </div>
  )
}

/* ── ConfirmDialog ───────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm mx-4 p-6 animate-[scaleIn_0.2s_ease-out]">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
          {danger ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <HelpCircle className="w-6 h-6 text-indigo-500" />}
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-white text-center">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-50 ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── EmptyState ──────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-5 shadow-inner">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-base font-bold text-gray-500 dark:text-gray-400">{title}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ── Skeleton / LoadingGrid ──────────────────────────────────── */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />
}

export function LoadingGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-12" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  )
}

/* ── PlanBadge ───────────────────────────────────────────────── */
export function PlanBadge({ plan = 'free', size = 'sm' }) {
  const colors = {
    free:       'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 ring-gray-200 dark:ring-gray-700',
    basic:      'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 ring-blue-200 dark:ring-blue-800/40',
    pro:        'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 ring-indigo-200 dark:ring-indigo-800/40',
    enterprise: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 ring-violet-200 dark:ring-violet-800/40',
  }
  const planData    = PLANS.find(p => p.key === plan) || PLANS[0]
  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg font-black ring-1 uppercase tracking-wide ${sizeClasses} ${colors[plan] || colors.free}`}>
      {plan === 'enterprise' ? <Sparkles className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
      {planData.label}
    </span>
  )
}

/* ── StatusBadge ─────────────────────────────────────────────── */
export function StatusBadge({ status, size = 'sm' }) {
  const config = {
    pending:  { cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800/40',    Icon: Clock        },
    approved: { cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800/40', Icon: CheckCircle2 },
    rejected: { cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-red-200 dark:ring-red-800/40',               Icon: XCircle      },
  }
  const s           = config[status] || config.pending
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg font-bold ring-1 ${sizeClasses} ${s.cls}`}>
      <s.Icon className="w-3 h-3" />{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

/* ── MiniBar sparkline ───────────────────────────────────────── */
export function MiniBar({ values = [], color = 'indigo' }) {
  const max = Math.max(...values, 1)
  const colorMap = {
    indigo:  'bg-indigo-400 dark:bg-indigo-500',
    emerald: 'bg-emerald-400 dark:bg-emerald-500',
    amber:   'bg-amber-400 dark:bg-amber-500',
  }
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className={`w-1.5 rounded-full ${colorMap[color]} opacity-70 transition-all duration-500`}
          style={{ height: `${Math.max((v / max) * 100, 8)}%` }} />
      ))}
    </div>
  )
}

/* ── StatCard ────────────────────────────────────────────────── */
export function StatCard({ label, value, icon: Icon, color, trend, trendValue, subtitle, onClick }) {
  const colorMap = {
    amber:  'from-amber-500 to-orange-500 shadow-amber-500/20',
    emerald:'from-emerald-500 to-teal-500 shadow-emerald-500/20',
    red:    'from-red-500 to-pink-500 shadow-red-500/20',
    indigo: 'from-indigo-500 to-violet-500 shadow-indigo-500/20',
    teal:   'from-teal-500 to-cyan-500 shadow-teal-500/20',
    gray:   'from-gray-400 to-gray-500 shadow-gray-400/20',
  }
  return (
    <div onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{value}</p>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
          {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
  )
}

/* ── SubscriptionHealth widget ───────────────────────────────── */
export function SubscriptionHealth({ schools }) {
  const planCounts = useMemo(() => {
    const counts = { free: 0, basic: 0, pro: 0, enterprise: 0 }
    schools.forEach(s => { counts[s.plan || 'free']++ })
    return counts
  }, [schools])

  const total    = schools.length || 1
  const expiring = schools.filter(s =>
    s.plan_expires_at && new Date(s.plan_expires_at) < new Date(Date.now() + 7 * 86400000) && new Date(s.plan_expires_at) > new Date()
  ).length
  const expired  = schools.filter(s =>
    s.plan_expires_at && new Date(s.plan_expires_at) < new Date()
  ).length

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          Subscription Overview
        </h3>
        {(expiring > 0 || expired > 0) && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold ring-1 ring-amber-200 dark:ring-amber-800/40">
            <AlertCircle className="w-3 h-3" />
            {expired > 0 ? `${expired} expired` : `${expiring} expiring`}
          </span>
        )}
      </div>

      <div className="flex rounded-full h-3 overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
        {planCounts.enterprise > 0 && <div className="bg-violet-500 transition-all duration-700" style={{ width: `${(planCounts.enterprise / total) * 100}%` }} />}
        {planCounts.pro        > 0 && <div className="bg-indigo-500 transition-all duration-700" style={{ width: `${(planCounts.pro        / total) * 100}%` }} />}
        {planCounts.basic      > 0 && <div className="bg-blue-500   transition-all duration-700" style={{ width: `${(planCounts.basic      / total) * 100}%` }} />}
        {planCounts.free       > 0 && <div className="bg-gray-400   transition-all duration-700" style={{ width: `${(planCounts.free       / total) * 100}%` }} />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PLANS.map(p => {
          const dot = { free: 'bg-gray-400', basic: 'bg-blue-500', pro: 'bg-indigo-500', enterprise: 'bg-violet-500' }
          return (
            <div key={p.key} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className={`w-2.5 h-2.5 rounded-full ${dot[p.key]}`} />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 flex-1">{p.label}</span>
              <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">{planCounts[p.key]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── SystemHealth widget ─────────────────────────────────────── */
export function SystemHealth() {
  const items = [
    { key: 'database',  label: 'Database',       icon: Database  },
    { key: 'functions', label: 'Edge Functions',  icon: Server    },
    { key: 'storage',   label: 'Storage',         icon: HardDrive },
    { key: 'auth',      label: 'Authentication',  icon: Shield    },
  ]
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-emerald-500" />
        System Health
      </h3>
      <div className="space-y-2.5">
        {items.map(item => (
          <div key={item.key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex-1">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">healthy</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── ActivityTimeline ────────────────────────────────────────── */
export function ActivityTimeline({ regs }) {
  const activities = useMemo(() => {
    return regs.slice(0, 8).map(r => ({
      id:       `reg-${r.id}`,
      title:    r.school_name,
      subtitle: r.status === 'pending' ? 'New registration request' : r.status === 'approved' ? 'Registration approved' : 'Registration rejected',
      time:     r.created_at,
      icon:     r.status === 'pending' ? Clock : r.status === 'approved' ? CheckCircle2 : XCircle,
      color:    r.status === 'pending' ? 'text-amber-500' : r.status === 'approved' ? 'text-emerald-500' : 'text-red-500',
      bg:       r.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' : r.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30',
    })).sort((a, b) => new Date(b.time) - new Date(a.time))
  }, [regs])

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Activity className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-400">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((a, i) => (
        <div key={a.id} className="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg}`}>
              <a.icon className={`w-3.5 h-3.5 ${a.color}`} />
            </div>
            {i < activities.length - 1 && (
              <div className="w-px h-full bg-gray-200 dark:bg-gray-700 mt-1 min-h-[16px]" />
            )}
          </div>
          <div className="flex-1 min-w-0 pb-2">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{a.title}</p>
            <p className="text-xs text-gray-400">{a.subtitle}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {new Date(a.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
