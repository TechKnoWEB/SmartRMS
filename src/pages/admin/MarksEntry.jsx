// src/pages/admin/MarksEntry.jsx
import { useState, useEffect, useCallback, Fragment, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useMarks } from '../../hooks/useMarks'
import { useClasses, useSections } from '../../hooks/useSections'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import toast from 'react-hot-toast'
import {
  Save, Lock, Unlock, AlertTriangle, BookOpen,
  Users, Hash, PenLine, Shield, GraduationCap,
  Layers, FileText, CheckCircle2, BarChart2,
  TrendingUp, Eye, Percent, Search, Keyboard,
  ArrowDown, ChevronRight, Sparkles, Info,
  ClipboardList, Target,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   TERM THEME TOKENS
   ═══════════════════════════════════════════════════════════════ */
// FIX 2.7: Mirrors the DB CHECK constraint so invalid values are caught
// immediately in the UI rather than only on save.
//   Valid: empty string, a number (incl. decimal), AB, - , —
const MARKS_REGEX = /^(AB|-|—|\d+(\.\d+)?)$/i

const TERM_THEME = {
  1: {
    dot:        'bg-blue-500',
    headerBg:   'bg-gradient-to-r from-blue-50 to-blue-100/40 dark:from-blue-900/30 dark:to-blue-900/10',
    text:       'text-blue-700 dark:text-blue-300',
    muted:      'text-blue-500/70 dark:text-blue-400/60',
    inputFocus: 'focus:ring-blue-400/50 focus:border-blue-400',
    saveBg:     'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    lockBadge:  'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200/50 dark:ring-red-800/30',
    openBadge:  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200/50 dark:ring-emerald-800/30',
    colBorder:  'border-blue-200/40 dark:border-blue-800/30',
    colBg:      'bg-blue-50/20 dark:bg-blue-900/5',
    statRing:   'ring-blue-200/60 dark:ring-blue-800/40',
    statBg:     'bg-blue-50 dark:bg-blue-900/20',
    gradient:   'from-blue-500 to-blue-600',
    ring:       'ring-blue-100 dark:ring-blue-900/30',
    lightBg:    'bg-blue-50/50 dark:bg-blue-950/20',
    accentBg:   'bg-blue-500',
  },
  2: {
    dot:        'bg-violet-500',
    headerBg:   'bg-gradient-to-r from-violet-50 to-violet-100/40 dark:from-violet-900/30 dark:to-violet-900/10',
    text:       'text-violet-700 dark:text-violet-300',
    muted:      'text-violet-500/70 dark:text-violet-400/60',
    inputFocus: 'focus:ring-violet-400/50 focus:border-violet-400',
    saveBg:     'bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600',
    lockBadge:  'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200/50 dark:ring-red-800/30',
    openBadge:  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200/50 dark:ring-emerald-800/30',
    colBorder:  'border-violet-200/40 dark:border-violet-800/30',
    colBg:      'bg-violet-50/20 dark:bg-violet-900/5',
    statRing:   'ring-violet-200/60 dark:ring-violet-800/40',
    statBg:     'bg-violet-50 dark:bg-violet-900/20',
    gradient:   'from-violet-500 to-violet-600',
    ring:       'ring-violet-100 dark:ring-violet-900/30',
    lightBg:    'bg-violet-50/50 dark:bg-violet-950/20',
    accentBg:   'bg-violet-500',
  },
  3: {
    dot:        'bg-emerald-500',
    headerBg:   'bg-gradient-to-r from-emerald-50 to-emerald-100/40 dark:from-emerald-900/30 dark:to-emerald-900/10',
    text:       'text-emerald-700 dark:text-emerald-300',
    muted:      'text-emerald-500/70 dark:text-emerald-400/60',
    inputFocus: 'focus:ring-emerald-400/50 focus:border-emerald-400',
    saveBg:     'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600',
    lockBadge:  'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200/50 dark:ring-red-800/30',
    openBadge:  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200/50 dark:ring-emerald-800/30',
    colBorder:  'border-emerald-200/40 dark:border-emerald-800/30',
    colBg:      'bg-emerald-50/20 dark:bg-emerald-900/5',
    statRing:   'ring-emerald-200/60 dark:ring-emerald-800/40',
    statBg:     'bg-emerald-50 dark:bg-emerald-900/20',
    gradient:   'from-emerald-500 to-emerald-600',
    ring:       'ring-emerald-100 dark:ring-emerald-900/30',
    lightBg:    'bg-emerald-50/50 dark:bg-emerald-950/20',
    accentBg:   'bg-emerald-500',
  },
  4: {
    dot:        'bg-orange-500',
    headerBg:   'bg-gradient-to-r from-orange-50 to-orange-100/40 dark:from-orange-900/30 dark:to-orange-900/10',
    text:       'text-orange-700 dark:text-orange-300',
    muted:      'text-orange-500/70 dark:text-orange-400/60',
    inputFocus: 'focus:ring-orange-400/50 focus:border-orange-400',
    saveBg:     'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
    lockBadge:  'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-red-200/50 dark:ring-red-800/30',
    openBadge:  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-emerald-200/50 dark:ring-emerald-800/30',
    colBorder:  'border-orange-200/40 dark:border-orange-800/30',
    colBg:      'bg-orange-50/20 dark:bg-orange-900/5',
    statRing:   'ring-orange-200/60 dark:ring-orange-800/40',
    statBg:     'bg-orange-50 dark:bg-orange-900/20',
    gradient:   'from-orange-500 to-orange-600',
    ring:       'ring-orange-100 dark:ring-orange-900/30',
    lightBg:    'bg-orange-50/50 dark:bg-orange-950/20',
    accentBg:   'bg-orange-500',
  },
}

/* ═══════════════════════════════════════════════════════════════
   RADIAL PROGRESS RING (SVG)
   ═══════════════════════════════════════════════════════════════ */
function RadialProgress({ percent, size = 52, strokeWidth = 4, color }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100 dark:text-gray-700/50"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tabular-nums text-gray-600 dark:text-gray-300">
        {percent}%
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TERM STATUS PANEL  (lock state + stats — above marks table)
   ═══════════════════════════════════════════════════════════════ */
function TermStatusPanel({ grids, locks, config, userRole, termList }) {
  const hasInt = config?.has_internal

  const getMax = (t) => {
    if (t === 1) return { w: config?.max_t1 || 0, i: config?.max_t1_int || 0 }
    if (t === 2) return { w: config?.max_t2 || 0, i: config?.max_t2_int || 0 }
    if (t === 3) return { w: config?.max_t3 || 0, i: config?.max_t3_int || 0 }
    if (t === 4) return { w: config?.max_t4 || 0, i: config?.max_t4_int || 0 }
    return { w: 0, i: 0 }
  }

  const getStats = (t) => {
    const rows = grids[`t${t}`] || []
    const total = rows.length
    const filled = rows.filter(r => r.written !== '' && r.written != null).length
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0
    return { total, filled, pct }
  }

  const colorMap = { 1: '#3b82f6', 2: '#8b5cf6', 3: '#10b981', 4: '#f97316' }

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-3.5 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide">
              Term Status & Progress
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-400">
            <Info className="w-3 h-3" />
            <span>Track entry progress across all terms</span>
          </div>
        </div>
      </div>

      {/* 3-column term cards */}
      <div className="p-4">
        <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(termList.length, 4)} gap-3`}>
          {termList.map(t => {
            const theme = TERM_THEME[t]
            const locked = locks[`t${t}`]
            const max = getMax(t)
            const stats = getStats(t)
            const isEditable = !locked || userRole === 'admin'

            return (
              <div
                key={t}
                className={`group relative rounded-2xl ${theme.lightBg} ring-1 ${theme.ring} p-4 hover:shadow-md transition-all duration-300 overflow-hidden`}
              >
                {/* Decorative accent */}
                <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full ${theme.accentBg} opacity-5 blur-xl group-hover:opacity-10 transition-opacity`} />

                {/* Term title + lock row */}
                <div className="relative flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${theme.dot} ring-2 ring-white dark:ring-gray-900 shadow-sm`} />
                    <span className={`font-black text-sm ${theme.text} tracking-tight`}>T{t}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {locked ? (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ring-1 ${theme.lockBadge}`}>
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ring-1 ${theme.openBadge}`}>
                        <Unlock className="w-2.5 h-2.5" /> Open
                      </span>
                    )}
                    {locked && userRole === 'admin' && (
                      <span className="flex items-center gap-0.5 text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full ring-1 ring-amber-200/50 dark:ring-amber-800/30 font-semibold" title="Admin override active">
                        <Shield className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Radial progress + max marks */}
                <div className="relative flex items-center gap-4 mb-3">
                  <RadialProgress percent={stats.pct} color={colorMap[t]} />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 font-medium">Written:</span>
                      <span className={`font-bold tabular-nums ${theme.text}`}>{max.w || '—'}</span>
                    </div>
                    {hasInt && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 font-medium">Internal:</span>
                        <span className={`font-bold tabular-nums ${theme.text}`}>{max.i || '—'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 tabular-nums">
                      <span>{stats.filled}/{stats.total} entered</span>
                      {stats.pct === 100 && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Linear progress bar */}
                <div className="mb-3">
                  <div className="h-1.5 rounded-full bg-white/60 dark:bg-gray-700/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${theme.dot} transition-all duration-700 ease-out`}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>

                {/* Editable indicator */}
                <div className={`pt-3 border-t ${locked ? 'border-red-200/30 dark:border-red-800/20' : 'border-gray-200/40 dark:border-gray-700/30'}`}>
                  {isEditable ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <PenLine className="w-3 h-3" /> Ready to edit
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
                      <Lock className="w-3 h-3" /> Read-only for teachers
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN MARKS ENTRY PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function MarksEntry() {
  const { user } = useAuth()
  const { fetchMarksAllTerms, saveMarks } = useMarks()
  const { classOpts } = useClasses()

  const [subjects,    setSubjects]    = useState([])
  const [filter,      setFilter]      = useState({ class_name: '', section: '', subject: '' })
  const [config,      setConfig]      = useState(null)
  const [maxTerms,    setMaxTerms]    = useState(3)
  const [locks,       setLocks]       = useState({ t1: false, t2: false, t3: false, t4: false })
  const [grids,       setGrids]       = useState({ t1: [], t2: [], t3: [], t4: [] })
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [saving,      setSaving]      = useState(null)
  // FIX 2.7/2.8: keyed by `t${term}_${idx}_${field}` → error string | null
  const [cellErrors,  setCellErrors]  = useState({})

  const { sectionOpts } = useSections(filter.class_name)

  useEffect(() => {
    if (!filter.class_name) { setSubjects([]); return }
    supabase
      .from('config')
      .select('subject_name, has_internal, max_t1, max_t1_int, max_t2, max_t2_int, max_t3, max_t3_int, max_t4, max_t4_int')
      .eq('class_name', filter.class_name)
      .eq('school_id', user.school_id)
      .order('display_order')
      .then(({ data }) => setSubjects(data || []))
  }, [filter.class_name, user])

  useEffect(() => {
    const { class_name, section, subject } = filter
    if (!class_name || !section || !subject) {
      setGrids({ t1: [], t2: [], t3: [], t4: [] })
      setCellErrors({})
      setConfig(null)
      return
    }
    const cfg = subjects.find(s => s.subject_name === subject)
    setConfig(cfg)

    async function load() {
      setLoadingGrid(true)

      // Fetch school max_terms and term locks in parallel
      const [schoolRes, lockRes] = await Promise.all([
        supabase.from('schools').select('max_terms').eq('id', user.school_id).single(),
        supabase.from('term_locks')
          .select('t1_lock, t2_lock, t3_lock, t4_lock')
          .eq('class_name', class_name)
          .eq('section', section)
          .eq('school_id', user.school_id)
          .single(),
      ])

      const mt = Math.min(schoolRes.data?.max_terms || 3, 4)
      setMaxTerms(mt)

      const lockData = lockRes.data
      setLocks({
        t1: lockData?.t1_lock || false,
        t2: lockData?.t2_lock || false,
        t3: lockData?.t3_lock || false,
        t4: lockData?.t4_lock || false,
      })

      const gridsResult = await fetchMarksAllTerms(class_name, section, subject)
      setGrids(gridsResult)
      setLoadingGrid(false)
    }
    load()
  // FIX 2.2: Use primitive values instead of the filter object reference.
  // An object dep causes a new reference on every render, which can trigger
  // cascading re-fetches when parent state updates recreate canAccessClass.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.class_name, filter.section, filter.subject, subjects])

  const handleSave = useCallback(async (termNum) => {
    const termKey = `t${termNum}`
    const grid = grids[termKey]
    if (!grid || grid.length === 0) return

    setSaving(termNum)
    const res = await saveMarks({
      className: filter.class_name,
      section: filter.section,
      subjectName: filter.subject,
      term: termNum,
      marksArr: grid,
    })
    setSaving(null)

    if (!res.success) {
      toast.error(res.message || 'Save failed.')
      return
    }
    if (res.partialErrors?.length > 0) {
      toast(`Saved ${res.changedCells} rows. ${res.partialErrors.length} failed.`, { icon: '⚠️' })
    } else {
      toast.success(
        res.changedCells > 0
          ? `Term ${termNum} saved — ${res.changedCells} cells updated.`
          : `Term ${termNum} saved.`,
      )
    }
  }, [filter, grids, saveMarks])

  const handleCellChange = (termNum, studentIdx, field, value) => {
    const termKey  = `t${termNum}`
    const errorKey = `t${termNum}_${studentIdx}_${field}`

    // FIX 2.7: Format validation — must match DB CHECK constraint or be empty
    let formatError = null
    if (value !== '' && !MARKS_REGEX.test(value)) {
      formatError = 'Use a number, AB, - or —'
    }

    // FIX 2.8: Range validation — written/internal must not exceed configured max
    let rangeError = null
    if (!formatError && value !== '' && config) {
      const maxMap = {
        1: { written: config.max_t1, internal: config.max_t1_int },
        2: { written: config.max_t2, internal: config.max_t2_int },
        3: { written: config.max_t3, internal: config.max_t3_int },
        4: { written: config.max_t4, internal: config.max_t4_int },
      }
      const maxVal = maxMap[termNum]?.[field]
      const numeric = parseFloat(value)
      if (!isNaN(numeric) && maxVal > 0 && numeric > maxVal) {
        rangeError = `Max is ${maxVal}`
      }
    }

    const errorMsg = formatError || rangeError || null
    setCellErrors(prev => ({ ...prev, [errorKey]: errorMsg }))

    setGrids(prev => ({
      ...prev,
      [termKey]: prev[termKey].map((r, j) =>
        j === studentIdx ? { ...r, [field]: value } : r,
      ),
    }))
  }

  // Returns true if any cell in this term has a validation error
  const termHasErrors = (termNum) =>
    Object.entries(cellErrors).some(([k, v]) => k.startsWith(`t${termNum}_`) && v !== null)

  const subjectOpts = [
    { value: '', label: '-- Subject --' },
    ...subjects.map(s => ({ value: s.subject_name, label: s.subject_name })),
  ]

  const termList    = Array.from({ length: maxTerms }, (_, i) => i + 1)
  const hasStudents = grids.t1.length > 0 || grids.t2.length > 0 || grids.t3.length > 0 || grids.t4.length > 0
  const anySelected = filter.class_name && filter.section && filter.subject
  const hasInt = config?.has_internal
  const students = grids.t1
  const colsPerTerm = hasInt ? 2 : 1

  const getMax = (t) => {
    if (t === 1) return { w: config?.max_t1, i: config?.max_t1_int }
    if (t === 2) return { w: config?.max_t2, i: config?.max_t2_int }
    if (t === 3) return { w: config?.max_t3, i: config?.max_t3_int }
    if (t === 4) return { w: config?.max_t4, i: config?.max_t4_int }
    return { w: 0, i: 0 }
  }

  const isEditable = (t) => !locks[`t${t}`] || user.role === 'admin'

  // FIX 2.1: getFilled inlined into useMemo so all accessed state is
  // explicitly in the dependency array — no stale-closure risk.
  const overallProgress = useMemo(() => {
    const countFilled = (t) => {
      const rows = grids[`t${t}`] || []
      return rows.filter(r => r.written !== '' && r.written != null).length
    }
    const totalCells = students.length * maxTerms
    if (totalCells === 0) return 0
    const filled = termList.reduce((acc, t) => acc + countFilled(t), 0)
    return Math.round((filled / totalCells) * 100)
  }, [grids, students, maxTerms, termList])

  // Thin wrapper used in the save-button footer; reads from grids which is
  // already tracked via overallProgress — safe to keep as a plain function.
  const getFilled = (t) => {
    const rows = grids[`t${t}`] || []
    return rows.filter(r => r.written !== '' && r.written != null).length
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ═══ HERO HEADER ═══════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 dark:from-indigo-800 dark:via-indigo-900 dark:to-purple-900 px-6 sm:px-8 py-7">
        {/* Decorative */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute top-6 right-24 w-2 h-2 bg-white/20 rounded-full" />
        <div className="absolute bottom-8 right-48 w-1.5 h-1.5 bg-white/15 rounded-full" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <PenLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Marks Entry
              </h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                Enter marks for all active terms in a single view
              </p>
            </div>
          </div>

          {/* Right: Context badges */}
          {anySelected && !loadingGrid && hasStudents && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-bold border border-white/10">
                <GraduationCap className="w-3 h-3" />
                {filter.class_name} – {filter.section}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-bold border border-white/10">
                <BookOpen className="w-3 h-3" />
                {filter.subject}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-bold border border-white/10">
                <Users className="w-3 h-3" />
                {students.length} students
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ FILTER BAR ════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700">
                <Layers className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </div>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide">
                Select Class Details
              </span>
            </div>
            {anySelected && !loadingGrid && hasStudents && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {overallProgress}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Class
              </label>
              <Select
                options={classOpts()}
                value={filter.class_name}
                onChange={e => setFilter({ class_name: e.target.value, section: '', subject: '' })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Section
              </label>
              <Select
                options={sectionOpts()}
                value={filter.section}
                onChange={e => setFilter(f => ({ ...f, section: e.target.value, subject: '' }))}
                disabled={!filter.class_name}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <Select
                options={subjectOpts}
                value={filter.subject}
                onChange={e => setFilter(f => ({ ...f, subject: e.target.value }))}
                disabled={!filter.section}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ EMPTY STATE ═══════════════════════════════════════ */}
      {!anySelected && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center ring-1 ring-indigo-100 dark:ring-indigo-800/30">
                <ClipboardList className="w-9 h-9 text-indigo-300 dark:text-indigo-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center">
                <Search className="w-3 h-3 text-indigo-500" />
              </div>
            </div>
            <h3 className="text-base font-bold text-gray-500 dark:text-gray-400 mt-5">
              Select class, section & subject
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 max-w-sm">
              All three terms will load together so you can enter marks side by side
            </p>
            <div className="flex items-center gap-6 mt-6">
              {[1,2,3,4].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-xs text-gray-300 dark:text-gray-600">
                  <div className={`w-2.5 h-2.5 rounded-full ${TERM_THEME[t].dot} opacity-40`} />
                  <span className="font-semibold">T{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LOADING ═══════════════════════════════════════════ */}
      {anySelected && loadingGrid && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
              <div className="absolute inset-0 w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 w-14 h-14 border-4 border-purple-300 border-b-transparent rounded-full animate-spin opacity-40" style={{ animationDirection: 'reverse' }} />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-5">Loading marks…</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Fetching all active terms</p>
          </div>
        </div>
      )}

      {/* ═══ NO STUDENTS ═══════════════════════════════════════ */}
      {anySelected && !loadingGrid && !hasStudents && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center ring-1 ring-amber-200/60 dark:ring-amber-800/40">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-gray-600 dark:text-gray-400 mt-4">No students found</h3>
            <p className="text-sm text-gray-400 mt-1.5">
              Add students to <strong className="text-gray-600 dark:text-gray-300">{filter.class_name} – {filter.section}</strong> first
            </p>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT: Status Panel + Marks Table ══════════ */}
      {anySelected && !loadingGrid && hasStudents && (
        <>
          {/* ── 1. TERM STATUS PANEL ── */}
          <TermStatusPanel
            grids={grids}
            locks={locks}
            config={config}
            userRole={user.role}
            termList={termList}
          />

          {/* ── 2. Teacher lock warning ── */}
          {user.role !== 'admin' && termList.some(t => locks[`t${t}`]) && (
            <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Some terms are locked</p>
                <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-0.5">
                  Locked terms are read-only for teachers. Contact your administrator to unlock.
                </p>
              </div>
            </div>
          )}

          {/* ── Hints bar: keyboard nav + FIX 4.6 special values ── */}
          <div className="hidden md:flex items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
              <Keyboard className="w-3.5 h-3.5" />
              <span>
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-[10px] border border-gray-200 dark:border-gray-700">Enter</kbd> or{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-[10px] border border-gray-200 dark:border-gray-700">Tab</kbd>{' '}
                to move to next row
              </span>
            </div>
            {/* FIX 4.6: Remind data-entry staff which special values are accepted */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="font-semibold text-gray-500 dark:text-gray-400">Special values:</span>
              {[
                { val: 'AB', tip: 'Absent' },
                { val: '-',  tip: 'Not appeared / exempt' },
                { val: '—',  tip: 'Em-dash (same as -)' },
              ].map(({ val, tip }) => (
                <span key={val} title={tip}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800
                    text-gray-600 dark:text-gray-300 font-mono text-[10px] border border-gray-200 dark:border-gray-700
                    cursor-help ring-0 hover:ring-1 hover:ring-indigo-300 transition-all">
                  {val}
                </span>
              ))}
              <span className="text-gray-400 dark:text-gray-600 text-[10px]">— hover for meaning</span>
            </div>
          </div>

          {/* ── 3. DESKTOP UNIFIED TABLE ── */}
          <div className="hidden md:block rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 z-20">
                  {/* Row 1: Term group banners */}
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest w-14 border-b-2 border-gray-200 dark:border-gray-700 border-r border-gray-100 dark:border-gray-800"
                    >
                      <Hash className="w-3 h-3 inline" />
                    </th>
                    <th
                      rowSpan={2}
                      className="sticky left-[56px] z-30 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[140px] border-b-2 border-gray-200 dark:border-gray-700 border-r-2 border-gray-300 dark:border-gray-600"
                    >
                      Student
                    </th>

                    {termList.map(t => {
                      const theme = TERM_THEME[t]
                      return (
                        <th
                          key={t}
                          colSpan={colsPerTerm}
                          className={`px-2 py-0 text-center border-b border-gray-100 dark:border-gray-800 ${t < maxTerms ? `border-r-2 ${theme.colBorder}` : ''}`}
                        >
                          <div className={`rounded-xl ${theme.headerBg} px-3 py-2.5 my-1.5 mx-0.5`}>
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${theme.dot} ring-2 ring-white dark:ring-gray-900 shadow-sm`} />
                              <span className={`font-black text-xs tracking-tight ${theme.text}`}>T{t}</span>
                              {locks[`t${t}`] && <Lock className="w-3 h-3 text-red-400" />}
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>

                  {/* Row 2: Sub-column headers */}
                  <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b-2 border-gray-200 dark:border-gray-700">
                    {termList.map(t => {
                      const theme = TERM_THEME[t]
                      const max = getMax(t)
                      return (
                        <Fragment key={t}>
                          <th className={`px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest ${!hasInt && t < maxTerms ? `border-r-2 ${theme.colBorder}` : ''}`}>
                            Wrt{max.w ? <span className="normal-case font-medium text-gray-300 dark:text-gray-500"> ({max.w})</span> : ''}
                          </th>
                          {hasInt && (
                            <th className={`px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest ${t < maxTerms ? `border-r-2 ${theme.colBorder}` : ''}`}>
                              Int{max.i ? <span className="normal-case font-medium text-gray-300 dark:text-gray-500"> ({max.i})</span> : ''}
                            </th>
                          )}
                        </Fragment>
                      )
                    })}
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, i) => {
                    const isEven = i % 2 === 0
                    return (
                      <tr
                        key={student.student_id}
                        className={`group transition-colors duration-150 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10
                          ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/20'}`}
                      >
                        {/* Roll */}
                        <td className={`sticky left-0 z-10 px-3 py-[7px] border-r border-gray-100 dark:border-gray-800
                          ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/40'}
                          group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10 transition-colors duration-150`}>
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-400 tabular-nums ring-1 ring-gray-200/50 dark:ring-gray-700/50">
                            {student.roll}
                          </span>
                        </td>

                        {/* Name */}
                        <td className={`sticky left-[56px] z-10 px-3 py-[7px] border-r-2 border-gray-200 dark:border-gray-700
                          ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/40'}
                          group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10 transition-colors duration-150`}>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block truncate max-w-[130px] group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors" title={student.name}>
                            {student.name}
                          </span>
                        </td>

                        {/* Term inputs */}
                        {termList.map(t => {
                          const termKey = `t${t}`
                          const theme = TERM_THEME[t]
                          const row = grids[termKey]?.[i] || {}
                          const editable = isEditable(t)
                          return (
                            <Fragment key={t}>
                              <td className={`px-2 py-[7px] text-center ${!hasInt && t < maxTerms ? `border-r-2 ${theme.colBorder}` : ''}`}>
                                {(() => {
                                  const errKey = `t${t}_${i}_written`
                                  const errMsg = cellErrors[errKey]
                                  return (
                                    <div className="relative group/cell">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        disabled={!editable}
                                        value={row.written ?? ''}
                                        onChange={e => handleCellChange(t, i, 'written', e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey && !hasInt)) {
                                            e.preventDefault()
                                            const next = document.querySelector(`[data-term="${t}"][data-row="${i + 1}"][data-field="written"]`)
                                            if (next) next.focus()
                                          }
                                        }}
                                        data-term={t} data-row={i} data-field="written"
                                        placeholder="—"
                                        className={`w-16 border rounded-xl px-1.5 py-2
                                          text-center text-xs font-bold tabular-nums bg-white dark:bg-gray-800
                                          ${errMsg
                                            ? 'border-red-400 dark:border-red-500 focus:ring-red-400/50'
                                            : `border-gray-200 dark:border-gray-700 ${theme.inputFocus}`}
                                          focus:outline-none focus:ring-2
                                          disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50
                                          transition-all duration-150 hover:border-gray-300 dark:hover:border-gray-600
                                          hover:shadow-sm`}
                                      />
                                      {errMsg && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
                                          hidden group-hover/cell:block pointer-events-none">
                                          <div className="bg-red-600 text-white text-[10px] font-semibold px-2 py-1
                                            rounded-lg shadow-lg whitespace-nowrap">
                                            {errMsg}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2
                                              border-4 border-transparent border-t-red-600" />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </td>
                              {hasInt && (
                                <td className={`px-2 py-[7px] text-center ${t < maxTerms ? `border-r-2 ${theme.colBorder}` : ''}`}>
                                  {(() => {
                                    const errKey = `t${t}_${i}_internal`
                                    const errMsg = cellErrors[errKey]
                                    return (
                                      <div className="relative group/cell">
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          disabled={!editable}
                                          value={row.internal ?? ''}
                                          onChange={e => handleCellChange(t, i, 'internal', e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                                              e.preventDefault()
                                              const next = document.querySelector(`[data-term="${t}"][data-row="${i + 1}"][data-field="written"]`)
                                              if (next) next.focus()
                                            }
                                          }}
                                          data-term={t} data-row={i} data-field="internal"
                                          placeholder="—"
                                          className={`w-16 border rounded-xl px-1.5 py-2
                                            text-center text-xs font-bold tabular-nums bg-white dark:bg-gray-800
                                            ${errMsg
                                              ? 'border-red-400 dark:border-red-500 focus:ring-red-400/50'
                                              : `border-gray-200 dark:border-gray-700 ${theme.inputFocus}`}
                                            focus:outline-none focus:ring-2
                                            disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50
                                            transition-all duration-150 hover:border-gray-300 dark:hover:border-gray-600
                                            hover:shadow-sm`}
                                        />
                                        {errMsg && (
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
                                            hidden group-hover/cell:block pointer-events-none">
                                            <div className="bg-red-600 text-white text-[10px] font-semibold px-2 py-1
                                              rounded-lg shadow-lg whitespace-nowrap">
                                              {errMsg}
                                              <div className="absolute top-full left-1/2 -translate-x-1/2
                                                border-4 border-transparent border-t-red-600" />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </td>
                              )}
                            </Fragment>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>

                {/* ── TFOOT: Save buttons ── */}
<tfoot className="sticky bottom-0 z-20">
  <tr className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700">
    <td className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-r border-gray-100 dark:border-gray-800" />
    <td className="sticky left-[56px] z-30 bg-gray-50 dark:bg-gray-800 px-3 py-3.5 border-r-2 border-gray-300 dark:border-gray-600">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        {students.length} students
      </span>
    </td>

    {termList.map(t => {
      const theme = TERM_THEME[t]
      const editable = isEditable(t)
      const filled = getFilled(t)
      const hasErrors = termHasErrors(t)

      return (
        <td
          key={t}
          colSpan={colsPerTerm}
          className={`px-2 py-3.5 text-center ${t < maxTerms ? `border-r-2 ${theme.colBorder}` : ''}`}
        >
          {!editable ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-red-400 font-semibold">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          ) : hasErrors ? (
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-xs font-bold ring-1 ring-red-200 dark:ring-red-800/40 min-w-[130px] justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
              Fix errors
            </div>
          ) : (
            <button
              onClick={() => handleSave(t)}
              disabled={saving === t}
              className={[
                'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold',
                theme.saveBg,
                'transition-all duration-200',
                'disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97]',
                'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                'min-w-[130px]',
              ].join(' ')}
            >
              {saving === t ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving === t ? 'Saving…' : `Save T${t}`}
            </button>
          )}
        </td>
      )
    })}
  </tr>
</tfoot>
              </table>
            </div>
          </div>

          {/* ── 4. MOBILE: Card-per-student ── */}
          <div className="md:hidden space-y-3">
            {students.map((student, i) => (
              <div
                key={student.student_id}
                className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-[11px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums ring-1 ring-indigo-100 dark:ring-indigo-800/30">
                    {student.roll}
                  </span>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{student.name}</span>
                </div>

                <div className="p-4">
                  {/* Term labels */}
                  <div className={`grid grid-cols-${maxTerms} gap-2 mb-3`}>
                    {termList.map(t => {
                      const theme = TERM_THEME[t]
                      return (
                        <div key={t} className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg ${theme.lightBg}`}>
                          <div className={`w-2 h-2 rounded-full ${theme.dot}`} />
                          <span className={`text-[11px] font-bold ${theme.text}`}>T{t}</span>
                          {locks[`t${t}`] && <Lock className="w-2.5 h-2.5 text-red-400" />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Written */}
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Written</label>
                  <div className={`grid grid-cols-${maxTerms} gap-2 mb-3`}>
                    {termList.map(t => {
                      const theme = TERM_THEME[t]
                      const row = grids[`t${t}`]?.[i] || {}
                      const editable = isEditable(t)
                      return (
                        <input
                          key={t}
                          type="text"
                          inputMode="numeric"
                          disabled={!editable}
                          value={row.written ?? ''}
                          onChange={e => handleCellChange(t, i, 'written', e.target.value)}
                          placeholder="—"
                          className={`w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3
                            text-center text-sm font-bold tabular-nums bg-white dark:bg-gray-800
                            ${theme.inputFocus} focus:outline-none focus:ring-2
                            disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50
                            transition-shadow hover:shadow-sm`}
                        />
                      )
                    })}
                  </div>

                  {/* Internal */}
                  {hasInt && (
                    <>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Internal</label>
                      <div className={`grid grid-cols-${maxTerms} gap-2`}>
                        {termList.map(t => {
                          const theme = TERM_THEME[t]
                          const row = grids[`t${t}`]?.[i] || {}
                          const editable = isEditable(t)
                          return (
                            <input
                              key={t}
                              type="text"
                              inputMode="numeric"
                              disabled={!editable}
                              value={row.internal ?? ''}
                              onChange={e => handleCellChange(t, i, 'internal', e.target.value)}
                              placeholder="—"
                              className={`w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3
                                text-center text-sm font-bold tabular-nums bg-white dark:bg-gray-800
                                ${theme.inputFocus} focus:outline-none focus:ring-2
                                disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50
                                transition-shadow hover:shadow-sm`}
                            />
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Mobile sticky save bar */}
            <div className="sticky bottom-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Save Marks</span>
                <span className="text-[10px] font-bold text-indigo-500 tabular-nums">{overallProgress}% done</span>
              </div>
              <div className={`grid grid-cols-${maxTerms} gap-2.5`}>
                {termList.map(t => {
                  const theme = TERM_THEME[t]
                  const editable = isEditable(t)

                  if (!editable) {
                    return (
                      <div key={t} className="flex items-center justify-center gap-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-[11px] text-red-400 font-semibold ring-1 ring-gray-200/50 dark:ring-gray-700">
                        <Lock className="w-3 h-3" /> T{t}
                      </div>
                    )
                  }
                  return (
                    <button
                      key={t}
                      onClick={() => handleSave(t)}
                      disabled={saving === t}
                      className={`flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-white text-[11px] font-bold
                        ${theme.saveBg} transition-all duration-200
                        disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97]
                        shadow-sm hover:shadow-md`}
                    >
                      {saving === t ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      T{t}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}