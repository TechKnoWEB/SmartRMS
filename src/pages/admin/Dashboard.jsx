// src/pages/admin/Dashboard.jsx
import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/ui/StatCard'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import {
  Users, BookOpen, GraduationCap, FileText,
  AlertTriangle, Clock, ArrowRight, BarChart2,
  CheckCircle2, Lock, Unlock, Eye, EyeOff,
  TrendingUp, Activity, Calendar, Shield,
  Zap, Bell, ChevronRight, RefreshCw,
  Sun, Moon, CloudSun, Hash, Sparkles,
  LayoutDashboard, ArrowUpRight, Layers,
  Target, Award, PieChart,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/* ─── Action metadata ──────────────────────────────────────── */
const ACTION_META = {
  MARKS_SAVE:      { color: 'green',  label: 'Marks Saved',         icon: CheckCircle2 },
  MARKS_DELETE:    { color: 'red',    label: 'Marks Deleted',       icon: FileText },
  STUDENT_ADD:     { color: 'blue',   label: 'Student Added',       icon: Users },
  STUDENT_UPDATE:  { color: 'indigo', label: 'Student Updated',     icon: Users },
  STUDENT_DELETE:  { color: 'red',    label: 'Student Deleted',     icon: Users },
  PUBLISH:         { color: 'green',  label: 'Results Published',   icon: Eye },
  UNPUBLISH:       { color: 'gray',   label: 'Results Unpublished', icon: EyeOff },
  USER_LOGIN:      { color: 'blue',   label: 'Login',               icon: Users },
  USER_LOGOUT:     { color: 'gray',   label: 'Logout',              icon: Users },
  TERM_LOCK:       { color: 'red',    label: 'Term Locked',         icon: Lock },
  TERM_UNLOCK:     { color: 'green',  label: 'Term Unlocked',       icon: Unlock },
  CONFIG_CHANGE:   { color: 'yellow', label: 'Config Changed',      icon: BookOpen },
  PASSWORD_CHANGE: { color: 'indigo', label: 'Password Changed',    icon: Lock },
}

const BADGE_STYLES = {
  green:  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800/40',
  red:    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/40',
  blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800/40',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/40',
  yellow: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800/40',
  gray:   'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700',
}

const ICON_BG = {
  green:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  red:    'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  yellow: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  gray:   'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function GreetingIcon() {
  const h = new Date().getHours()
  if (h < 12) return <Sun className="w-6 h-6 text-amber-300 drop-shadow-lg" />
  if (h < 17) return <CloudSun className="w-6 h-6 text-orange-300 drop-shadow-lg" />
  return <Moon className="w-6 h-6 text-indigo-300 drop-shadow-lg" />
}

/* ═══════════════════════════════════════════════════════════════
   BATCH LOADER — single call for all class×section status data
   FIX PER-01: replaces N+1 pattern (5 queries × N rows → 5 queries total)
   ═══════════════════════════════════════════════════════════════ */
async function loadAllClassStatus(school_id, classRows) {
  if (!classRows.length) return {}

  // 5 queries total — regardless of how many class×section rows exist
  const [
    { data: students },
    { data: marks },
    { data: config },
    { data: locks },
    { data: pub },
  ] = await Promise.all([
    supabase.from('students')
      .select('class_name, section')
      .eq('school_id', school_id).eq('is_active', true),
    supabase.from('marks')
      .select('class_name, section')
      .eq('school_id', school_id),
    supabase.from('config')
      .select('class_name')
      .eq('school_id', school_id).eq('is_active', true),
    supabase.from('term_locks')
      .select('class_name, section, t1_lock, t2_lock, t3_lock')
      .eq('school_id', school_id),
    supabase.from('publish_settings')
      .select('class_name, section, is_published')
      .eq('school_id', school_id),
  ])

  // Build O(1) lookup maps keyed by "className|section"
  const key = (cls, sec) => `${cls}|${sec ?? ''}`

  const studentCounts = {}
  ;(students || []).forEach(r => {
    const k = key(r.class_name, r.section)
    studentCounts[k] = (studentCounts[k] || 0) + 1
  })

  const marksCounts = {}
  ;(marks || []).forEach(r => {
    const k = key(r.class_name, r.section)
    marksCounts[k] = (marksCounts[k] || 0) + 1
  })

  const subjectCounts = {}
  ;(config || []).forEach(r => {
    subjectCounts[r.class_name] = (subjectCounts[r.class_name] || 0) + 1
  })

  const lockMap = {}
  ;(locks || []).forEach(r => {
    lockMap[key(r.class_name, r.section)] = {
      t1: r.t1_lock, t2: r.t2_lock, t3: r.t3_lock,
    }
  })

  const pubMap = {}
  ;(pub || []).forEach(r => {
    pubMap[key(r.class_name, r.section)] = r.is_published
  })

  // Build per-row result object
  const result = {}
  classRows.forEach(({ cls, section }) => {
    const k     = key(cls.class_name, section)
    const studentsN = studentCounts[k] || 0
    const subjectsN = subjectCounts[cls.class_name] || 0
    const entered   = marksCounts[k] || 0
    const expected  = studentsN * subjectsN * 3
    const pct = expected > 0
      ? Math.min(100, Math.round((entered / expected) * 100))
      : studentsN === 0 ? -1 : 0

    result[k] = {
      total: studentsN, subjectsN, entered, expected, pct,
      allTerms:    lockMap[k] || { t1: false, t2: false, t3: false },
      isPublished: pubMap[k]  || false,
    }
  })
  return result
}

/* ═══════════════════════════════════════════════════════════════
   CLASS-WISE STATUS ROW  — pure display, data passed as prop
   FIX PER-01: no longer fires any queries of its own
   ═══════════════════════════════════════════════════════════════ */
function ClassStatusRow({ cls, section, data, index }) {
  const error = data === 'error'

  /* ── Loading skeleton — shown while parent hasn't resolved data yet ── */
  if (data === null) {
    return (
      <tr className="border-b border-gray-100 dark:border-gray-800">
        <td className="px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {cls.class_name}
        </td>
        <td className="px-4 py-3.5 text-sm text-gray-500">{section || '—'}</td>
        {[1, 2, 3, 4, 5].map(j => (
          <td key={j} className="px-4 py-3.5">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse w-16" />
          </td>
        ))}
      </tr>
    )
  }

  /* ── Error state ── */
  if (error) {
    return (
      <tr className="border-b border-gray-100 dark:border-gray-800">
        <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{cls.class_name}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{section || '—'}</td>
        <td colSpan={5} className="px-4 py-3">
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Failed to load
          </span>
        </td>
      </tr>
    )
  }

  /* ── Bar color logic ── */
  const barPct = data.pct === -1 ? 0 : data.pct
  const barColor =
    data.pct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
    data.pct >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
    data.pct > 0   ? 'bg-gradient-to-r from-red-400 to-red-500' :
                     'bg-gray-300 dark:bg-gray-600'
  const pctColor =
    data.pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
    data.pct >= 40 ? 'text-amber-600 dark:text-amber-400' :
    data.pct > 0   ? 'text-red-600 dark:text-red-400' :
                     'text-gray-400'

  const isEven = index % 2 === 0

  return (
    <tr className={`
      group border-b border-gray-100 dark:border-gray-800 transition-all duration-200
      hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:shadow-sm
      ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/20'}
    `}>
      {/* Class */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {cls.class_name}
          </span>
        </div>
      </td>

      {/* Section */}
      <td className="px-4 py-3.5">
        {section ? (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold ring-1 ring-indigo-200/60 dark:ring-indigo-800/40 shadow-sm">
            {section}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Students */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="tabular-nums text-sm font-semibold text-gray-700 dark:text-gray-300">
            {data.total}
          </span>
        </div>
      </td>

      {/* Total Subjects */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="tabular-nums text-sm font-medium text-gray-600 dark:text-gray-400">
            {data.subjectsN}
          </span>
        </div>
      </td>

      {/* Marks Entry — BAR STYLE */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="flex-1 min-w-[90px] max-w-[130px]">
            <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-end min-w-[56px]">
            <span className={`text-xs font-bold tabular-nums leading-tight ${pctColor}`}>
              {data.pct === -1 ? '—' : `${data.pct}%`}
            </span>
            <span className="text-[10px] text-gray-400 tabular-nums leading-tight">
              {data.pct === -1 ? 'No data' : `${data.entered}/${data.expected}`}
            </span>
          </div>
        </div>
      </td>

      {/* Term Locks */}
      <td className="px-4 py-3.5">
        <div className="flex gap-1.5">
          {[
            ['T1', data.allTerms.t1],
            ['T2', data.allTerms.t2],
            ['T3', data.allTerms.t3],
          ].map(([label, locked]) => (
            <span
              key={label}
              className={`
                inline-flex items-center gap-0.5 text-[11px] px-2 py-1 rounded-lg font-semibold transition-all duration-200
                ${locked
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/40 shadow-sm shadow-red-100 dark:shadow-red-900/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }
              `}
            >
              {locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
              {label}
            </span>
          ))}
        </div>
      </td>

      {/* Publish */}
      <td className="px-4 py-3.5">
        {data.isPublished ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Live</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
            <EyeOff className="w-3 h-3 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Draft</span>
          </span>
        )}
      </td>
    </tr>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TERM OVERVIEW CARD
   ═══════════════════════════════════════════════════════════════ */
function TermOverviewCard({ school_id }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: locks } = await supabase
        .from('term_locks')
        .select('t1_lock,t2_lock,t3_lock')
        .eq('school_id', school_id)
      if (!locks || !locks.length) {
        setData({ t1: 0, t2: 0, t3: 0, total: 0 })
        return
      }
      setData({
        t1: locks.filter(l => l.t1_lock).length,
        t2: locks.filter(l => l.t2_lock).length,
        t3: locks.filter(l => l.t3_lock).length,
        total: locks.length,
      })
    }
    load()
  }, [school_id])

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    )
  }

  const terms = [
    { key: 't1', label: 'Term 1', accent: 'blue' },
    { key: 't2', label: 'Term 2', accent: 'indigo' },
    { key: 't3', label: 'Term 3', accent: 'violet' },
  ]

  const accentMap = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-sky-50/50 dark:from-blue-900/20 dark:to-sky-900/10',
      ring: 'ring-blue-200/60 dark:ring-blue-800/40',
      text: 'text-blue-700 dark:text-blue-400',
      bar: 'bg-gradient-to-r from-blue-400 to-blue-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      shadow: 'shadow-blue-100/50 dark:shadow-blue-900/20',
    },
    indigo: {
      bg: 'bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/10',
      ring: 'ring-indigo-200/60 dark:ring-indigo-800/40',
      text: 'text-indigo-700 dark:text-indigo-400',
      bar: 'bg-gradient-to-r from-indigo-400 to-indigo-600',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      shadow: 'shadow-indigo-100/50 dark:shadow-indigo-900/20',
    },
    violet: {
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-900/20 dark:to-purple-900/10',
      ring: 'ring-violet-200/60 dark:ring-violet-800/40',
      text: 'text-violet-700 dark:text-violet-400',
      bar: 'bg-gradient-to-r from-violet-400 to-violet-600',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      shadow: 'shadow-violet-100/50 dark:shadow-violet-900/20',
    },
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {terms.map(term => {
        const locked = data[term.key]
        const pct = data.total > 0 ? Math.round((locked / data.total) * 100) : 0
        const c = accentMap[term.accent]
        const allLocked = locked === data.total && data.total > 0

        return (
          <div key={term.key} className={`rounded-2xl ${c.bg} ring-1 ${c.ring} p-4 flex flex-col justify-between min-h-[112px] shadow-sm ${c.shadow} transition-all duration-200 hover:shadow-md`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{term.label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${allLocked ? c.iconBg : 'bg-gray-100 dark:bg-gray-800'}`}>
                {allLocked
                  ? <Lock className={`w-3.5 h-3.5 ${c.text}`} />
                  : <Unlock className="w-3.5 h-3.5 text-gray-400" />
                }
              </div>
            </div>
            <div>
              <div className="h-2 rounded-full bg-white/60 dark:bg-gray-700/60 overflow-hidden mb-3 shadow-inner">
                <div
                  className={`h-full rounded-full ${c.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black tabular-nums leading-none ${c.text}`}>{locked}</span>
                  <span className="text-[11px] text-gray-500 font-medium">/ {data.total}</span>
                </div>
                <span className={`text-[11px] font-bold tabular-nums ${c.text} opacity-70`}>{pct}%</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PENDING ALERTS CARD
   ═══════════════════════════════════════════════════════════════ */
function PendingAlertsCard({ stats, school_id }) {
  const [alerts, setAlerts] = useState(null)
  const navigate = useNavigate()  // FIX CQ-02: use React Router navigate, not window.location

  useEffect(() => {
    async function load() {
      const items = []

      if ((stats.students || 0) === 0)
        items.push({ type: 'warning', label: 'No students enrolled', detail: 'Add students to get started', to: '/students' })

      if ((stats.subjects || 0) === 0)
        items.push({ type: 'warning', label: 'No subjects configured', detail: 'Configure subjects first', to: '/config' })

      if ((stats.remedial || 0) > 0)
        items.push({ type: 'info', label: `${stats.remedial} remedial students`, detail: 'Review flagged students', to: '/students' })

      const { data: pub } = await supabase
        .from('publish_settings')
        .select('is_published')
        .eq('school_id', school_id)

      const unpub = (pub || []).filter(p => !p.is_published).length
      if (unpub > 0 && (pub || []).length > 0)
        items.push({ type: 'action', label: `${unpub} section(s) unpublished`, detail: 'Publish when ready', to: '/results' })

      // FIX 4.7: Surface PENDING notification_log entries (corrected columns)
      const { data: notifs } = await supabase
        .from('notification_log')
        .select('id, message, channel, created_at')
        .eq('status', 'PENDING')
        .is('school_id', null)          // registration alerts have no school_id yet
        .order('created_at', { ascending: false })
        .limit(5)

      ;(notifs || []).forEach(n => {
        items.push({ type: 'info', label: 'Pending notification', detail: n.message, notifId: n.id })
      })

      setAlerts(items)
    }
    load()
  }, [stats, school_id])

  if (!alerts) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 rounded-2xl animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 mb-3">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-1">All clear!</p>
        <p className="text-xs text-gray-400 mt-0.5">No pending actions</p>
      </div>
    )
  }

  const typeStyles = {
    warning: {
      bg: 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/15 dark:to-orange-900/10',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      ring: 'ring-amber-200/60 dark:ring-amber-800/30',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-sky-50/50 dark:from-blue-900/15 dark:to-sky-900/10',
      icon: Bell,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      ring: 'ring-blue-200/60 dark:ring-blue-800/30',
    },
    action: {
      bg: 'bg-gradient-to-r from-violet-50 to-purple-50/50 dark:from-violet-900/15 dark:to-purple-900/10',
      icon: Zap,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      ring: 'ring-violet-200/60 dark:ring-violet-800/30',
    },
  }

  return (
    <div className="space-y-2.5">
      {alerts.map((alert, i) => {
        const s = typeStyles[alert.type] || typeStyles.info
        const Icon = s.icon
        return (
          <button key={i} onClick={() => alert.to && navigate(alert.to)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${s.bg} ring-1 ${s.ring} text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-sm active:scale-[0.99] group`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg} transition-transform duration-200 group-hover:scale-110`}>
              <Icon className={`w-4 h-4 ${s.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{alert.label}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{alert.detail}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, school, can } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({})
  const [logs, setLogs] = useState([])
  const [classes, setClasses] = useState([])
  const [classStatusMap, setClassStatusMap] = useState({})  // FIX PER-01: batch data keyed by "cls|sec"
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  /* ── Build flat rows: one per class×section ── */
  const classRows = useMemo(() => {
    const rows = []
    classes.forEach(cls => {
      if (cls.sections && cls.sections.length > 0) {
        cls.sections.forEach(sec => rows.push({ cls, section: sec }))
      } else {
        rows.push({ cls, section: null })
      }
    })
    return rows
  }, [classes])

  // FIX CQ-01: wrapped in useCallback so useEffect dep array is stable
  const loadData = useCallback(async () => {
    const [
      { count: students },
      { data: classData },
      { count: users },
      { count: subjects },
      { data: logData },
      { count: remedial },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', user.school_id),
      supabase.from('classes').select('class_name,sections,display_order')
        .eq('school_id', user.school_id).order('display_order'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('school_id', user.school_id),
      supabase.from('config').select('*', { count: 'exact', head: true }).eq('school_id', user.school_id),
      supabase.from('entry_logs').select('*').eq('school_id', user.school_id)
        .order('created_at', { ascending: false }).limit(10),
      supabase.from('students').select('*', { count: 'exact', head: true })
        .eq('school_id', user.school_id).eq('remedial_flag', true),
    ])

    let clsList = classData || []
    if (!clsList.length) {
      const { data: stuClasses } = await supabase
        .from('students').select('class_name').eq('school_id', user.school_id)
      const unique = [...new Set((stuClasses || []).map(r => r.class_name).filter(Boolean))].sort()
      clsList = unique.map((c, i) => ({ class_name: c, sections: [], display_order: i }))
    }

    // FIX PER-01: build flat rows then load all status data in 5 queries total
    const rows = []
    clsList.forEach(cls => {
      if (cls.sections?.length > 0) {
        cls.sections.forEach(sec => rows.push({ cls, section: sec }))
      } else {
        rows.push({ cls, section: null })
      }
    })

    const statusMap = await loadAllClassStatus(user.school_id, rows).catch(() => ({}))

    setStats({ students, classes: clsList.length, users, subjects, remedial })
    setLogs(logData || [])
    setClasses(clsList)
    setClassStatusMap(statusMap)
    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  /* Quick action cards config */
  const quickActions = [
    {
      label: 'Enter Marks',
      to: '/marks',
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      border: 'border-blue-100 dark:border-blue-900/40',
      iconBg: 'bg-blue-500',
    },
    {
      label: 'View Results',
      to: '/results',
      icon: Award,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
      border: 'border-emerald-100 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-500',
    },
    {
      label: 'Add Students',
      to: '/students',
      icon: Users,
      gradient: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      text: 'text-violet-700 dark:text-violet-300',
      hoverBg: 'hover:bg-violet-100 dark:hover:bg-violet-900/30',
      border: 'border-violet-100 dark:border-violet-900/40',
      iconBg: 'bg-violet-500',
    },
    {
      label: 'Analytics',
      to: '/analytics',
      icon: PieChart,
      gradient: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
      border: 'border-amber-100 dark:border-amber-900/40',
      iconBg: 'bg-amber-500',
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ═══ 1. GREETING HERO BANNER ═══════════════════════════ */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-7 md:p-8 text-white overflow-hidden shadow-xl shadow-primary-600/15 dark:shadow-primary-900/30">
        {/* Decorative elements */}
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute right-24 bottom-0 w-44 h-44 rounded-full bg-white/5 translate-y-1/2" />
        <div className="absolute left-1/3 top-1/2 w-24 h-24 rounded-full bg-white/[0.03]" />
        <div className="absolute left-0 bottom-0 w-32 h-32 rounded-full bg-white/[0.04] translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <GreetingIcon />
              </div>
              <div>
                <p className="text-primary-200 text-sm font-semibold tracking-wide">{greeting()}</p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{user?.name}</h1>
              </div>
            </div>
            <p className="text-primary-200/80 text-sm mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm">
                <Calendar className="w-3.5 h-3.5" />
                {school?.school_name || 'School RMS'}
              </span>
              {school?.academic_session && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm">
                  <Layers className="w-3.5 h-3.5" />
                  {school.academic_session}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 backdrop-blur-sm shadow-inner group"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4.5 h-4.5 transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-90'}`} />
          </button>
        </div>
      </div>

      {/* ═══ 2. STAT CARDS ═════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Students" value={loading ? null : stats.students} icon={Users} color="blue" />
        <StatCard title="Classes" value={loading ? null : stats.classes} icon={GraduationCap} color="indigo" />
        <StatCard title="Users" value={loading ? null : stats.users} icon={Users} color="green" />
        <StatCard title="Subjects" value={loading ? null : stats.subjects} icon={BookOpen} color="yellow" />
        <StatCard title="Remedial" value={loading ? null : stats.remedial} icon={AlertTriangle} color="red" sub="Flagged" />
      </div>

      {/* ═══ 3. QUICK ACTIONS — ENHANCED CARDS ════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map(({ label, to, icon: Icon, bg, text, hoverBg, border, iconBg }) => (
          <button key={to} onClick={() => navigate(to)}
            className={`
              group relative flex flex-col items-start gap-3 px-4 py-4 rounded-2xl border
              font-semibold text-sm transition-all duration-200
              active:scale-[0.97] hover:shadow-md hover:-translate-y-0.5
              ${bg} ${text} ${hoverBg} ${border}
            `}>
            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110`}>
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="font-bold">{label}</span>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-1 group-hover:translate-x-0" />
            </div>
          </button>
        ))}
      </div>

      {/* ═══ 4. CLASS-WISE STATUS TABLE ════════════════════════ */}
      {can('analytics') && classes.length > 0 && (
        <Card
          title={
            <span className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm shadow-primary-200 dark:shadow-primary-900/40">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-800 dark:text-gray-200">Class-wise Status</span>
                <p className="text-xs text-gray-400 font-normal mt-0.5">
                  {classRows.length} section{classRows.length !== 1 ? 's' : ''} across {classes.length} class{classes.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </span>
          }
        >
          <div className="overflow-x-auto -mx-1 rounded-xl border border-gray-200/80 dark:border-gray-700/50">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-800 dark:to-gray-900/80 border-b-2 border-gray-200 dark:border-gray-700">
                  {[
                    { label: 'Class',       w: 'min-w-[120px]' },
                    { label: 'Section',     w: 'min-w-[80px]' },
                    { label: 'Students',    w: 'min-w-[80px]' },
                    { label: 'Subjects',    w: 'min-w-[80px]' },
                    { label: 'Marks Entry', w: 'min-w-[220px]' },
                    { label: 'Term Locks',  w: 'min-w-[150px]' },
                    { label: 'Publish',     w: 'min-w-[110px]' },
                  ].map(h => (
                    <th key={h.label}
                      className={`px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h.w}`}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1, 2, 3, 4].map(i => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      {[1, 2, 3, 4, 5, 6, 7].map(j => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : classRows.map((row, idx) => (
                    <ClassStatusRow
                      key={`${row.cls.class_name}-${row.section || 'all'}`}
                      cls={row.cls}
                      section={row.section}
                      data={classStatusMap[`${row.cls.class_name}|${row.section ?? ''}`] ?? null}
                      index={idx}
                    />
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {!loading && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between px-1">
              <p className="text-xs text-gray-400 tabular-nums flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {stats.students || 0} total students
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" />
                  {stats.subjects || 0} subjects
                </span>
              </p>
              <button
                onClick={() => navigate('/analytics')}
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1.5 transition-all duration-200 group"
              >
                Detailed analytics
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          )}
        </Card>
      )}

      {/* ═══ 5. VISUAL CARDS: Term Overview + Alerts ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          title={
            <span className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-primary-200 dark:shadow-primary-900/40">
                <BarChart2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-800 dark:text-gray-200">Term Overview</span>
                <p className="text-xs text-gray-400 font-normal mt-0.5">Lock progress across all sections</p>
              </div>
            </span>
          }
        >
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <TermOverviewCard school_id={user.school_id} />
          )}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-200 dark:shadow-amber-900/40">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-800 dark:text-gray-200">Pending Actions</span>
                <p className="text-xs text-gray-400 font-normal mt-0.5">Items needing attention</p>
              </div>
            </span>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <PendingAlertsCard stats={stats} school_id={user.school_id} />
          )}
        </Card>
      </div>

      {/* ═══ 6. RECENT ACTIVITY — TABLE STYLE ══════════════════ */}
      <Card
        title={
          <span className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm shadow-primary-200 dark:shadow-primary-900/40">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 dark:text-gray-200">Recent Activity</span>
              <p className="text-xs text-gray-400 font-normal mt-0.5">Latest system actions</p>
            </div>
          </span>
        }
      >
        {loading ? (
          <div className="overflow-x-auto -mx-1 rounded-xl border border-gray-200/80 dark:border-gray-700/50">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-800 dark:to-gray-900/80 border-b-2 border-gray-200 dark:border-gray-700">
                  {['Action', 'Class / Subject', 'User', 'Date', 'Time', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map(i => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {[1, 2, 3, 4, 5, 6].map(j => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-4 shadow-inner">
              <Clock className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No activity yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">Actions will appear here once users start using the system</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1 rounded-xl border border-gray-200/80 dark:border-gray-700/50">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-800 dark:to-gray-900/80 border-b-2 border-gray-200 dark:border-gray-700">
                  {[
                    { label: 'Action',           w: 'min-w-[170px]' },
                    { label: 'Class / Subject',  w: 'min-w-[160px]' },
                    { label: 'User',             w: 'min-w-[120px]' },
                    { label: 'Date',             w: 'min-w-[80px]' },
                    { label: 'Time',             w: 'min-w-[80px]' },
                    { label: 'Status',           w: 'min-w-[90px]' },
                  ].map(h => (
                    <th key={h.label}
                      className={`px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h.w}`}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const meta = ACTION_META[log.action_type] || {
                    color: 'gray',
                    label: log.action_type?.replace(/_/g, ' ') || 'Action',
                    icon: Clock,
                  }
                  const IconComp = meta.icon || Clock
                  const isEven = i % 2 === 0

                  return (
                    <tr
                      key={log.id}
                      className={`
                        group border-b border-gray-100 dark:border-gray-800 transition-all duration-200
                        hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:shadow-sm
                        ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/20'}
                      `}
                    >
                      {/* Action */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${ICON_BG[meta.color] || ICON_BG.gray}`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {meta.label}
                          </span>
                        </div>
                      </td>

                      {/* Class / Subject */}
                      <td className="px-4 py-3.5">
                        {log.class_name ? (
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {log.class_name} {log.section || ''}
                            </span>
                            {log.subject && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{log.subject}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white">
                              {(log.saved_by || '?')[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                            {log.saved_by || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-gray-500 tabular-nums">
                          {formatDate(log.created_at)}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-400 tabular-nums">
                          {formatTime(log.created_at)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${BADGE_STYLES[meta.color] || BADGE_STYLES.gray}`}>
                          {log.status || 'OK'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}