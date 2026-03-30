// src/pages/admin/Results.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { buildStudentResult, rankComparator } from '../../utils/grades'
import { useClasses, useSections } from '../../hooks/useSections'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ReportCard from '../../components/results/ReportCard'
import StudentProgressView from '../../components/results/StudentProgressView'
import { exportResultsToExcel } from '../../utils/exportExcel'
import { exportBulkPDF, downloadReportCardPDF, printReportCard } from '../../utils/exportPDF'
import {
  Download,
  FileText,
  Eye,
  Lock,
  Unlock,
  Printer,
  Loader2,
  ShieldAlert,
  Trophy,
  Users,
  TrendingUp,
  Award,
  BarChart3,
  Search,
  GraduationCap,
  BookOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Best-effort audit logger
async function logAudit(payload) {
  const { error } = await supabase.from('entry_logs').insert(payload)
  if (error) console.error('[RMS] audit log failed:', error.message, payload)
}

/* ─── tiny rank-medal helper ─── */
const RankBadge = ({ rank }) => {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-white text-xs font-black shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30 ring-2 ring-amber-200 dark:ring-amber-700">
        #{rank}
      </span>
    )
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 text-white text-xs font-black shadow-lg shadow-gray-200/50 dark:shadow-gray-800/30 ring-2 ring-gray-300 dark:ring-gray-600">
        #{rank}
      </span>
    )
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 text-white text-xs font-black shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 ring-2 ring-orange-300 dark:ring-orange-700">
        #{rank}
      </span>
    )
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-black">
      #{rank}
    </span>
  )
}

/* ─── percentage mini-bar ─── */
const PercentBar = ({ value }) => {
  const color =
    value >= 80
      ? 'from-emerald-400 to-emerald-600'
      : value >= 60
        ? 'from-indigo-400 to-indigo-600'
        : value >= 40
          ? 'from-amber-400 to-amber-600'
          : 'from-red-400 to-red-600'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-12 text-right text-gray-700 dark:text-gray-300">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

/* ─── stat card used in the summary strip ─── */
const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div
    className={`group relative flex items-center gap-3 px-5 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden`}
  >
    {/* subtle accent glow */}
    <div
      className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${accent}`}
    />
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-xl ${accent} bg-opacity-10 dark:bg-opacity-20`}
    >
      <Icon className={`w-5 h-5 ${accent.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 leading-none mb-1">
        {label}
      </p>
      <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{value}</p>
    </div>
  </div>
)

/* ====================================================================== */
export default function Results() {
  const { user, can, isAdmin } = useAuth()
  const { classOpts } = useClasses()

  const [filter, setFilter] = useState({ class_name: '', section: '' })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [published, setPublished] = useState(false)
  const [locks, setLocks] = useState({})
  const [school, setSchool] = useState(null)
  const [selected, setSelected] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab]   = useState('report')  // 'report' | 'progress'
  const [modalMode, setModalMode] = useState('full')    // 'full' (tabs) | 'progress' (progress only)
  const [bulkProg, setBulkProg] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { sectionOpts } = useSections(filter.class_name)

  useEffect(() => {
    supabase
      .from('schools')
      .select('*')
      .eq('id', user.school_id)
      .single()
      .then(({ data }) => setSchool(data))
  }, [user])

  const loadResults = async () => {
    if (!filter.class_name || !filter.section) return
    setLoading(true)

    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('class_name', filter.class_name)
      .eq('section', filter.section)
      .eq('school_id', user.school_id)
      .order('roll')

    const { data: cfgRows } = await supabase
      .from('config')
      .select('*')
      .eq('class_name', filter.class_name)
      .eq('school_id', user.school_id)
      .order('display_order')

    if (!students?.length || !cfgRows?.length) {
      setResults([])
      setLoading(false)
      return
    }

    const studentIds = students.map((s) => s.id)
    const [{ data: allMarks }, { data: gradingCfg }, { data: schoolRow }] = await Promise.all([
      supabase.from('marks').select('*').in('student_id', studentIds).eq('school_id', user.school_id),
      supabase.from('grading_config').select('*').eq('school_id', user.school_id),
      supabase.from('schools').select('pass_mark').eq('id', user.school_id).single(),
    ])

    const resultOptions = {
      passMark: schoolRow?.pass_mark ?? 25,
      gradeBands: gradingCfg?.length ? gradingCfg : null,
    }

    const marksByStudent = {}
    ;(allMarks || []).forEach((m) => {
      if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = []
      marksByStudent[m.student_id].push(m)
    })

    const built = students.map((stu) =>
      buildStudentResult(stu, cfgRows, marksByStudent[stu.id] || [], resultOptions),
    )
    built.sort(rankComparator)
    built.forEach((r, i) => {
      r.rank = i + 1
      r.total_students = built.length
    })

    const [{ data: pub }, { data: lock }] = await Promise.all([
      supabase
        .from('publish_settings')
        .select('*')
        .eq('class_name', filter.class_name)
        .eq('section', filter.section)
        .eq('school_id', user.school_id)
        .single(),
      supabase
        .from('term_locks')
        .select('*')
        .eq('class_name', filter.class_name)
        .eq('section', filter.section)
        .eq('school_id', user.school_id)
        .single(),
    ])

    setPublished(pub ? pub.is_published : false)
    setLocks(lock || {})
    setResults(built)
    setLoading(false)
  }

  useEffect(() => {
    setResults([])
    loadResults()
  }, [filter])

  /* ── Publish toggle ──────────────────────────────────── */
  const togglePublish = async () => {
    if (!can('publish')) return
    const next = !published
    const { error } = await supabase.from('publish_settings').upsert(
      {
        class_name: filter.class_name,
        section: filter.section,
        school_id: user.school_id,
        is_published: next,
        show_ranks: true,
        allow_download: true,
        published_at: next ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'school_id,class_name,section' },
    )
    if (error) {
      toast.error(error.message)
    } else {
      setPublished(next)
      toast.success(next ? 'Results published!' : 'Results unpublished.')
      logAudit({
        saved_by: user.user_id,
        school_id: user.school_id,
        action_type: next ? 'PUBLISH' : 'UNPUBLISH',
        class_name: filter.class_name,
        section: filter.section,
        status: 'Saved',
      })
    }
  }

  /* ── Term lock / unlock — ADMIN ONLY ──────────────── */
  const toggleLock = async (term) => {
    if (!can('lock_terms')) {
      toast.error('Only administrators can lock or unlock terms.')
      return
    }
    const key  = `t${term}_lock`
    const next = !locks[key]

    const efUrl = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')
      + '/functions/v1/toggle-term-lock'

    try {
      const res = await fetch(efUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:    user.user_id,
          school_id:  user.school_id,
          class_name: filter.class_name,
          section:    filter.section,
          term,
          lock: next,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setLocks((l) => ({ ...l, [key]: next }))
      toast.success(`Term ${term} ${next ? 'locked' : 'unlocked'}.`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleBulkPDF = async () => {
    if (!results.length) return
    setBulkProg({ done: 0, total: results.length })
    await exportBulkPDF(results, school, (done, total) => setBulkProg({ done, total }))
    setTimeout(() => setBulkProg(null), 1500)
  }

  const pct = bulkProg ? Math.round((bulkProg.done / bulkProg.total) * 100) : 0
  const anyLocked = locks.t1_lock || locks.t2_lock || locks.t3_lock

  /* ── derived stats ────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!results.length) return null
    const total = results.length
    const passed = results.filter((r) => r.pass).length
    const avg = results.reduce((s, r) => s + r.percentage, 0) / total
    const topName = results[0]?.student?.name || '—'
    return { total, passed, passRate: ((passed / total) * 100).toFixed(1), avg: avg.toFixed(1), topName }
  }, [results])

  /* ── filtered results (local search) ──────────────── */
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return results
    const q = searchTerm.toLowerCase()
    return results.filter(
      (r) =>
        r.student.name.toLowerCase().includes(q) ||
        String(r.student.roll).includes(q),
    )
  }, [results, searchTerm])

  /* ================================================================== */
  return (
    <div className="space-y-6">
      {/* ─── HERO HEADER ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-6 sm:px-8 py-7">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-purple-400/10 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          {/* left */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Results
              </h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                Manage and publish student results
              </p>
            </div>
          </div>

          {/* right: action buttons */}
          {results.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {can('write') && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20 backdrop-blur-sm"
                  onClick={() =>
                    exportResultsToExcel(results, filter.class_name, filter.section)
                  }
                >
                  <Download className="w-4 h-4" /> Excel
                </Button>
              )}
              {can('write') && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20 backdrop-blur-sm"
                  onClick={handleBulkPDF}
                  loading={!!bulkProg}
                >
                  <FileText className="w-4 h-4" />
                  {bulkProg
                    ? `Building… ${bulkProg.done}/${bulkProg.total}`
                    : 'Bulk PDF'}
                </Button>
              )}
              {can('publish') && (
                <Button
                  size="sm"
                  className={
                    published
                      ? '!bg-red-500 !text-white hover:!bg-red-600 !border-0'
                      : '!bg-white !text-indigo-700 hover:!bg-indigo-50 !border-0 font-bold'
                  }
                  onClick={togglePublish}
                >
                  {published ? 'Unpublish' : '🚀 Publish Results'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── BULK PROGRESS BAR ──────────────────────────── */}
      {bulkProg && (
        <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing report cards… {bulkProg.done} / {bulkProg.total}
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-indigo-200 dark:bg-indigo-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="text-xs text-indigo-500 mt-2 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Done — print dialog opening now.
            </p>
          )}
        </div>
      )}

      {/* ─── FILTERS CARD ───────────────────────────────── */}
      <Card className="!rounded-2xl !shadow-sm !border-gray-200/80 dark:!border-gray-700/60">
        <div className="flex gap-3 flex-wrap items-end mb-0">
          <div className="min-w-[160px]">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
              Class
            </label>
            <Select
              options={classOpts()}
              value={filter.class_name}
              onChange={(e) =>
                setFilter({ class_name: e.target.value, section: '' })
              }
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-1.5">
              Section
            </label>
            <Select
              options={sectionOpts()}
              value={filter.section}
              onChange={(e) =>
                setFilter((f) => ({ ...f, section: e.target.value }))
              }
              disabled={!filter.class_name}
            />
          </div>

          {filter.class_name && filter.section && (
            <div className="flex items-center gap-2.5 ml-auto flex-wrap">
              <div className="hidden sm:flex items-center gap-1 mr-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold">
                  Terms
                </span>
              </div>

              {[1, 2, 3].map((t) => {
                const isLocked = locks[`t${t}_lock`]

                if (isAdmin()) {
                  return (
                    <button
                      key={t}
                      onClick={() => toggleLock(t)}
                      title={
                        isLocked
                          ? `Click to unlock Term ${t}`
                          : `Click to lock Term ${t}`
                      }
                      className={`
                        group/lock relative flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-xl border-2 font-bold
                        transition-all duration-200 cursor-pointer select-none
                        hover:scale-[1.06] active:scale-95
                        shadow-md hover:shadow-lg
                        ${isLocked
                          ? 'bg-gradient-to-b from-red-50 to-red-100 border-red-300 text-red-700 hover:from-red-100 hover:to-red-150 hover:border-red-400 shadow-red-200/60 hover:shadow-red-300/60 dark:from-red-900/40 dark:to-red-900/60 dark:border-red-600 dark:text-red-300 dark:shadow-red-900/40 dark:hover:border-red-500'
                          : 'bg-gradient-to-b from-white to-gray-50 border-gray-250 text-gray-600 hover:from-gray-50 hover:to-gray-100 hover:border-gray-350 shadow-gray-200/60 hover:shadow-gray-300/60 dark:from-gray-800 dark:to-gray-850 dark:border-gray-600 dark:text-gray-300 dark:shadow-gray-900/40 dark:hover:border-gray-500'
                        }
                      `}
                    >
                      {/* inner highlight line at top */}
                      <span className={`absolute inset-x-0 top-0 h-[2px] rounded-t-xl ${
                        isLocked
                          ? 'bg-gradient-to-r from-transparent via-red-400/50 to-transparent'
                          : 'bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-gray-600/50'
                      }`} />
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 group-hover/lock:animate-[wiggle_0.3s_ease-in-out] drop-shadow-sm" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 drop-shadow-sm" />
                      )}
                      T{t}
                    </button>
                  )
                }

                // Non-admin: read-only badge style (not a button)
                return (
                  <span
                    key={t}
                    title={isLocked ? `Term ${t} is locked` : `Term ${t} is open`}
                    className={`
                      relative flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-xl border-2 font-bold
                      cursor-default select-none shadow-sm
                      ${isLocked
                        ? 'bg-gradient-to-b from-red-50 to-red-100/80 border-red-200 text-red-400 dark:from-red-900/20 dark:to-red-900/30 dark:border-red-800 dark:text-red-500 shadow-red-100/40 dark:shadow-red-900/20'
                        : 'bg-gradient-to-b from-gray-50 to-gray-100/80 border-gray-200 text-gray-400 dark:from-gray-800 dark:to-gray-850 dark:border-gray-700 shadow-gray-100/40 dark:shadow-gray-900/20'
                      }
                    `}
                  >
                    <span className={`absolute inset-x-0 top-0 h-[2px] rounded-t-xl ${
                      isLocked
                        ? 'bg-gradient-to-r from-transparent via-red-300/30 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-gray-200/50 to-transparent dark:via-gray-600/30'
                    }`} />
                    {isLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                    T{t}
                  </span>
                )
              })}

              <div className="w-px h-7 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

              <Badge
                variant={published ? 'green' : 'gray'}
                className="!rounded-xl !px-3 !py-1.5"
              >
                {published ? '✓ Published' : 'Not Published'}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* ── Teacher lock info banner ──────────────────── */}
      {!isAdmin() && filter.class_name && filter.section && anyLocked && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Some terms are locked by an administrator. Contact admin to unlock.
          </p>
        </div>
      )}

      {/* ─── STATS STRIP ────────────────────────────────── */}
      {stats && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label="Total Students"
            value={stats.total}
            accent="bg-indigo-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Pass Rate"
            value={`${stats.passRate}%`}
            accent="bg-emerald-500"
          />
          <StatCard
            icon={BarChart3}
            label="Class Average"
            value={`${stats.avg}%`}
            accent="bg-purple-500"
          />
          <StatCard
            icon={Award}
            label="Top Rank"
            value={stats.topName}
            accent="bg-amber-500"
          />
        </div>
      )}

      {/* ─── MAIN RESULTS TABLE ─────────────────────────── */}
      {loading ? (
        <Card className="!rounded-2xl">
          <div className="flex flex-col items-center justify-center h-52 gap-3">
            <div className="relative">
              <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 h-10 w-10 border-4 border-purple-300 border-b-transparent rounded-full animate-spin animate-reverse opacity-40" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Loading results…</p>
          </div>
        </Card>
      ) : results.length > 0 ? (
        <Card className="!rounded-2xl !p-0 overflow-hidden !shadow-sm !border-gray-200/80 dark:!border-gray-700/60">
          {/* search bar inside table card */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <GraduationCap className="w-4 h-4" />
              <span>
                Showing{' '}
                <strong className="text-gray-900 dark:text-white">
                  {filtered.length}
                </strong>{' '}
                {filtered.length === 1 ? 'student' : 'students'}
                {searchTerm && (
                  <span className="text-gray-400"> matching "{searchTerm}"</span>
                )}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or roll…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-56 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-t border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-900/50">
                  {[
                    'Rank',
                    'Roll',
                    'Name',
                    'Total',
                    'Percentage',
                    'Grade',
                    'D Subj',
                    'Result',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-gray-800">
                {filtered.map((r, idx) => (
                  <tr
                    key={r.student.id}
                    className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors duration-150"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <td className="px-5 py-3.5">
                      <RankBadge rank={r.rank} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-mono font-bold text-gray-600 dark:text-gray-300">
                        {r.student.roll}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                        {r.student.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="tabular-nums text-gray-600 dark:text-gray-300">
                        {r.grand_total.toFixed(1)}
                        <span className="text-gray-300 dark:text-gray-600">
                          /{r.grand_max.toFixed(1)}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <PercentBar value={r.percentage} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-800">
                        {r.grade}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.d_count > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 dark:bg-red-900/20 text-xs font-black text-red-500 ring-1 ring-red-200 dark:ring-red-800">
                          {r.d_count}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={r.pass ? 'green' : 'red'}
                        className="!rounded-lg !font-bold"
                      >
                        {r.result_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        {/* Eye — Report Card (full modal, larger) */}
                        <button
                          className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-150 hover:scale-110 active:scale-95"
                          title="View Report Card"
                          onClick={() => {
                            setSelected({ result: r, school })
                            setModalTab('report')
                            setModalMode('full')
                            setModalOpen(true)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Print */}
                        <button
                          className="p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-150 hover:scale-110 active:scale-95"
                          title="Print"
                          onClick={() => printReportCard(r, school)}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {/* Progress — progress-only modal */}
                        <button
                          className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-150 hover:scale-110 active:scale-95"
                          title="Student Progress"
                          onClick={() => {
                            setSelected({ result: r, school })
                            setModalTab('progress')
                            setModalMode('progress')
                            setModalOpen(true)
                          }}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* bottom bar */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between text-xs text-gray-400">
            <span>
              Class {filter.class_name} — Section {filter.section}
            </span>
            <span className="tabular-nums">
              {results.filter((r) => r.pass).length} passed ·{' '}
              {results.filter((r) => !r.pass).length} failed
            </span>
          </div>
        </Card>
      ) : filter.class_name && filter.section ? (
        <Card className="!rounded-2xl">
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 font-semibold">
                No results found
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                No students or configuration found for this selection.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="!rounded-2xl">
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Search className="w-8 h-8 text-indigo-300 dark:text-indigo-700" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center">
                <span className="text-[10px] text-indigo-500">?</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 font-semibold">
                Select a class & section
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Choose a class and section above to view results.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ─── STUDENT DETAIL MODAL ───────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected?.result?.student?.name || 'Student Detail'}
        subtitle={selected ? `${selected.result.student.class_name} — ${selected.result.student.section} · Roll ${selected.result.student.roll}` : ''}
        size={modalMode === 'full' ? '3xl' : '2xl'}
      >
        {selected && (
          <>
            {/* Tab bar — only shown in full mode */}
            {modalMode === 'full' && (
              <div className="flex gap-1 p-1 mb-6 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
                {[
                  { key: 'report',   label: 'Report Card', icon: FileText },
                  { key: 'progress', label: 'Progress',    icon: TrendingUp },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setModalTab(key)}
                    className={[
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150',
                      modalTab === key
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                    ].join(' ')}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab content */}
            {modalMode === 'full' && modalTab === 'report' && (
              <ReportCard
                result={selected.result}
                school={selected.school}
                showActions
              />
            )}
            {(modalMode === 'progress' || modalTab === 'progress') && (
              <StudentProgressView result={selected.result} />
            )}
          </>
        )}
      </Modal>
    </div>
  )
}