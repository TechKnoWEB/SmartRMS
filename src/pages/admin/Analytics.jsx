// src/pages/admin/Analytics.jsx
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { buildStudentResult, rankComparator } from '../../utils/grades'
import { useClasses, useSections } from '../../hooks/useSections'
import Card from '../../components/ui/Card'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, RadialBarChart, RadialBar,
} from 'recharts'
import {
  RefreshCw, TrendingUp, Users, UserCheck, UserX,
  BarChart3, PieChart as PieIcon, Trophy, Award,
  GraduationCap, BookOpen, Target, Sparkles,
  ChevronRight, ArrowUpRight, Star, Zap, Search,
} from 'lucide-react'

const COLORS = ['#4f46e5', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2']

/* ─── Custom Recharts Tooltip ─── */
const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 px-4 py-3 text-sm">
      <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500 dark:text-gray-400">{entry.name}:</span>
          <span className="font-bold text-gray-800 dark:text-gray-200">
            {entry.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Stat Card Component ─── */
const StatCard = ({ icon: Icon, label, value, subtitle, accentBg, accentText, accentRing, delay = 0 }) => (
  <div
    className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-default"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Background accent glow */}
    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${accentBg} opacity-20 blur-2xl group-hover:opacity-30 group-hover:scale-125 transition-all duration-500`} />

    <div className="relative flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <p className={`text-3xl font-black ${accentText} tabular-nums leading-none`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{subtitle}</p>
        )}
      </div>
      <div className={`flex items-center justify-center w-11 h-11 rounded-2xl ${accentBg} bg-opacity-10 dark:bg-opacity-20 ${accentRing} ring-1 ring-opacity-20`}>
        <Icon className={`w-5 h-5 ${accentText}`} />
      </div>
    </div>

    {/* Bottom accent line */}
    <div className={`absolute bottom-0 left-0 right-0 h-1 ${accentBg} opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
  </div>
)

/* ─── Chart Card Wrapper ─── */
const ChartCard = ({ icon: Icon, title, description, children, className = '' }) => (
  <div className={`rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${className}`}>
    <div className="px-6 pt-5 pb-2 flex items-center gap-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
        <Icon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <div className="px-4 pb-5">
      {children}
    </div>
  </div>
)


export default function Analytics() {
  const { user } = useAuth()
  const { classOpts } = useClasses()

  const [filter,  setFilter]  = useState({ class_name: '', section: '' })
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  // Dynamic sections for selected class
  const { sectionOpts } = useSections(filter.class_name)

  // FIX 3.2: Cache TTL — reuse analytics_cache if computed within last 10 minutes
  const CACHE_TTL_MS = 10 * 60 * 1000

  const loadAnalytics = async (forceRefresh = false) => {
    if (!filter.class_name || !filter.section) return
    setLoading(true)

    // ── FIX 3.2: Check analytics_cache before recomputing ──────────────────
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('analytics_cache')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('class_name', filter.class_name)
        .eq('section', filter.section)
        .maybeSingle()

      if (cached) {
        const age = Date.now() - new Date(cached.computed_at).getTime()
        if (age < CACHE_TTL_MS) {
          // Reconstruct the UI data shape from cache
          // FIX 3b: subject_stats = { chart: [...], grades: [...] }
          const _stats = cached.subject_stats || {}
          const subjectChartData = (_stats.chart || []).map(s => ({
            name: s.name, avg: s.avg, pass: s.pass, fail: s.fail,
          }))
          const gradeData = (_stats.grades || []).filter(d => d.count > 0)

          setData({
            results:          null,   // full per-student results not cached — only aggregates
            subjectChartData,
            gradeData,
            passed:           cached.passed_students,
            failed:           cached.failed_students,
            total:            cached.total_students,
            avg:              Math.round(cached.avg_percentage ?? 0),
            top:              cached.top_scorer_id ? { student: { id: cached.top_scorer_id }, percentage: cached.top_percentage } : null,
            fromCache:        true,
            cacheAge:         Math.round(age / 60000),
          })
          setLoading(false)
          return
        }
      }
    }

    // ── Full recompute ──────────────────────────────────────────────────────
    // FIX 3.1: select only columns needed by buildStudentResult — not select('*')
    const [{ data: students }, { data: cfgRows }] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, roll, class_name, section, father_name, mother_name, dob, admission_no')
        .eq('class_name', filter.class_name)
        .eq('section', filter.section)
        .eq('school_id', user.school_id),
      supabase
        .from('config')
        .select('subject_name, has_internal, divisor, term_names, max_t1, max_t1_int, max_t2, max_t2_int, max_t3, max_t3_int, display_order')
        .eq('class_name', filter.class_name)
        .eq('school_id', user.school_id)
        .order('display_order'),
    ])

    if (!students?.length || !cfgRows?.length) {
      setData(null); setLoading(false); return
    }

    // FIX 3.1: select only the 5 columns buildStudentResult actually reads
    const studentIds = students.map(s => s.id)
    const { data: allMarks } = await supabase
      .from('marks')
      .select('student_id, subject_name, term, written, internal')
      .eq('school_id', user.school_id)
      .in('student_id', studentIds)

    const marksByStudent = {}
    ;(allMarks || []).forEach(m => {
      if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = []
      marksByStudent[m.student_id].push(m)
    })

    const results = students.map(stu =>
      buildStudentResult(stu, cfgRows, marksByStudent[stu.id] || [])
    )

    results.sort(rankComparator)
    results.forEach((r, i) => { r.rank = i + 1; r.total_students = results.length })

    const subjectStats = {}
    cfgRows.forEach(c => {
      subjectStats[c.subject_name] = { pass: 0, fail: 0, total: 0, sum: 0 }
    })
    results.forEach(r => {
      r.subjects.forEach(s => {
        if (!subjectStats[s.subject_name]) return
        subjectStats[s.subject_name].total++
        subjectStats[s.subject_name].sum += s.subject_percentage
        if (s.subject_pass) subjectStats[s.subject_name].pass++
        else subjectStats[s.subject_name].fail++
      })
    })

    const subjectChartData = Object.entries(subjectStats).map(([name, d]) => ({
      name: name.length > 10 ? name.substring(0, 10) + '…' : name,
      avg:  d.total > 0 ? Math.round(d.sum / d.total) : 0,
      pass: d.pass,
      fail: d.fail,
    }))

    const passed    = results.filter(r => r.pass).length
    const gradeData = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D']
      .map(g => ({ name: g, count: results.filter(r => r.grade === g).length }))
      .filter(d => d.count > 0)

    const avgPct = results.length
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0

    const computed = {
      results, subjectChartData, gradeData,
      passed,
      failed:    results.length - passed,
      total:     results.length,
      avg:       avgPct,
      top:       results[0] || null,
      fromCache: false,
    }
    setData(computed)

    // ── FIX 3.2: Write analytics_cache (best-effort, non-blocking) ─────────
    const top = results[0]
    supabase
      .from('analytics_cache')
      .upsert({
        school_id:       user.school_id,
        class_name:      filter.class_name,
        section:         filter.section,
        total_students:  results.length,
        passed_students: passed,
        failed_students: results.length - passed,
        pass_percentage: results.length ? Math.round((passed / results.length) * 100) : 0,
        avg_percentage:  avgPct,
        top_scorer_id:   top?.student?.id   || null,
        top_percentage:  top?.percentage     || null,
        // FIX 3b: grade_dist is NOT a real column — embed gradeData
        // inside subject_stats JSONB as { chart: [...], grades: [...] }
        subject_stats:   { chart: subjectChartData, grades: gradeData },
        computed_at:     new Date().toISOString(),
      }, { onConflict: 'school_id,class_name,section' })
      .then(({ error }) => {
        if (error) console.error('[RMS] analytics_cache write failed:', error.message)
      })

    setLoading(false)
  }

  /* ── Pass rate for radial gauge ── */
  const passRate = data ? Math.round((data.passed / data.total) * 100) : 0
  const radialData = data ? [{ name: 'Pass Rate', value: passRate, fill: '#4f46e5' }] : []

  return (
    <div className="space-y-6">
      {/* ─── HERO HEADER ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 dark:from-indigo-800 dark:via-indigo-900 dark:to-purple-900 px-6 sm:px-8 py-7">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute top-4 right-20 w-2 h-2 bg-white/20 rounded-full" />
        <div className="absolute bottom-6 right-40 w-1.5 h-1.5 bg-white/15 rounded-full" />

        <div className="relative flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Analytics
            </h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              Performance insights & grade distribution
            </p>
          </div>
        </div>
      </div>

      {/* ─── FILTER CARD ─────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm p-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="min-w-[160px]">
            <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1.5">
              Class
            </label>
            <Select
              options={classOpts()}
              value={filter.class_name}
              onChange={e => setFilter({ class_name: e.target.value, section: '' })}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 mb-1.5">
              Section
            </label>
            <Select
              options={sectionOpts()}
              value={filter.section}
              onChange={e => setFilter(f => ({ ...f, section: e.target.value }))}
              disabled={!filter.class_name}
            />
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <Button
              onClick={() => loadAnalytics(false)}
              loading={loading}
              disabled={!filter.class_name || !filter.section}
              className="!rounded-xl !px-5 !py-2.5 !font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Load Analytics'}
            </Button>
            {/* FIX 3.2: Show cache status + force-refresh option */}
            {data?.fromCache && (
              <button
                onClick={() => loadAnalytics(true)}
                className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                Cached {data.cacheAge}m ago · Refresh now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── DATA SECTION ────────────────────────────────── */}
      {data ? (
        <>
          {/* ── Stat Cards ──────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Total Students"
              value={data.total}
              subtitle="enrolled in section"
              accentBg="bg-indigo-500"
              accentText="text-indigo-600 dark:text-indigo-400"
              accentRing="ring-indigo-500"
              delay={0}
            />
            <StatCard
              icon={UserCheck}
              label="Passed"
              value={data.passed}
              subtitle={`${passRate}% pass rate`}
              accentBg="bg-emerald-500"
              accentText="text-emerald-600 dark:text-emerald-400"
              accentRing="ring-emerald-500"
              delay={50}
            />
            <StatCard
              icon={UserX}
              label="Failed"
              value={data.failed}
              subtitle={`${100 - passRate}% fail rate`}
              accentBg="bg-red-500"
              accentText="text-red-600 dark:text-red-400"
              accentRing="ring-red-500"
              delay={100}
            />
            <StatCard
              icon={TrendingUp}
              label="Class Average"
              value={`${data.avg}%`}
              subtitle="overall percentage"
              accentBg="bg-purple-500"
              accentText="text-purple-600 dark:text-purple-400"
              accentRing="ring-purple-500"
              delay={150}
            />
          </div>

          {/* ── Charts Row 1 ────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-5">
            <ChartCard
              icon={BarChart3}
              title="Subject-wise Average %"
              description="Average percentage scored per subject"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.subjectChartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Bar
                    dataKey="avg"
                    name="Average"
                    fill="#4f46e5"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              icon={PieIcon}
              title="Grade Distribution"
              description="Breakdown of final grades across students"
            >
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.gradeData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {data.gradeData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]
                      return (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 px-4 py-3 text-sm">
                          <p className="font-bold text-gray-900 dark:text-white">
                            Grade {d.name}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            {d.value} student{d.value !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Subject Pass vs Fail ────────────────────── */}
          <ChartCard
            icon={Target}
            title="Subject Pass vs Fail"
            description="Comparative pass and fail counts for each subject"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.subjectChartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar dataKey="pass" name="Pass" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="fail" name="Fail" fill="#dc2626" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Top Performer ───────────────────────────── */}
          {data.top && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-700/40 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-900/10 dark:via-gray-800 dark:to-orange-900/10 shadow-sm hover:shadow-md transition-shadow duration-300">
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-amber-300/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-orange-300/10 rounded-full blur-2xl" />

              <div className="relative px-6 py-5 flex items-center gap-5 flex-wrap">
                {/* Trophy icon */}
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                  <Trophy className="w-8 h-8 text-white" />
                </div>

                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] uppercase tracking-widest font-bold text-amber-600 dark:text-amber-400">
                      Top Performer
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3" fill="currentColor" /> Rank #1
                    </span>
                  </div>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {data.top.student.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Roll {data.top.student.roll}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {data.top.percentage}%
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-800">
                      Grade {data.top.grade}
                    </span>
                    {data.top.d_count > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md ring-1 ring-red-100 dark:ring-red-800">
                          {data.top.d_count} D-grade subject{data.top.d_count > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mini radial score */}
                <div className="hidden sm:flex flex-col items-center gap-1">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="5" className="dark:stroke-gray-700" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke="#f59e0b" strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${(data.top.percentage / 100) * 175.93} 175.93`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-amber-600 dark:text-amber-400">
                      {data.top.percentage}%
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">Score</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Quick Insights Row ──────────────────────── */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Quick Insights</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Highest Subject */}
              {data.subjectChartData.length > 0 && (() => {
                const best = [...data.subjectChartData].sort((a, b) => b.avg - a.avg)[0]
                const worst = [...data.subjectChartData].sort((a, b) => a.avg - b.avg)[0]
                return (
                  <>
                    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 px-4 py-3">
                      <ArrowUpRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-500 font-bold">Best Subject</p>
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{best.name} — {best.avg}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/40 px-4 py-3">
                      <Target className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-500 font-bold">Needs Attention</p>
                        <p className="text-sm font-bold text-red-800 dark:text-red-300">{worst.name} — {worst.avg}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/40 px-4 py-3">
                      <Zap className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-500 font-bold">Subjects Tracked</p>
                        <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">{data.subjectChartData.length} subjects</p>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </>
      ) : !loading ? (
        /* ── Empty State ────────────────────────────────── */
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Search className="w-8 h-8 text-indigo-300 dark:text-indigo-700" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center">
                <BarChart3 className="w-3 h-3 text-indigo-500" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 font-semibold">
                Select a class & section
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-xs">
                Choose a class and section above, then click <strong>Load Analytics</strong> to view performance insights.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Loading State ──────────────────────────────── */
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex flex-col items-center justify-center h-52 gap-3">
            <div className="relative">
              <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 h-10 w-10 border-4 border-purple-300 border-b-transparent rounded-full animate-spin opacity-40" style={{ animationDirection: 'reverse' }} />
            </div>
            <p className="text-sm text-gray-400 font-medium">Loading analytics…</p>
          </div>
        </div>
      )}
    </div>
  )
}