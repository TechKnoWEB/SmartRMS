import React from 'react'
import { downloadReportCardPDF, printReportCard } from '../../utils/exportPDF'
import Button from '../ui/Button'
import {
  Download, Printer, Trophy, Award, TrendingUp, BookOpen,
  User, Hash, Calendar, CheckCircle, XCircle, Star,
  GraduationCap, SquareUser, Shield, CalendarDays
} from 'lucide-react'

/* ── tiny bar ───────────────────────────────────────────────────────────────── */
function ProgressBar({ value, max = 100, color = 'indigo', height = 'h-2', showLabel = false }) {
  const pct = Math.min((value / max) * 100, 100)
  const grad = {
    indigo: 'from-indigo-500 to-violet-500',
    emerald: 'from-emerald-400 to-teal-500',
    amber: 'from-amber-400 to-orange-500',
    red: 'from-red-400 to-rose-500',
    blue: 'from-blue-400 to-cyan-500',
  }
  const bg = {
    indigo: 'bg-indigo-50', emerald: 'bg-emerald-50',
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
  }
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 ${height} rounded-full ${bg[color]} overflow-hidden`}>
        <div className={`${height} rounded-full bg-gradient-to-r ${grad[color]}`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-[10px] font-bold text-slate-500 tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>}
    </div>
  )
}

/* ── mark display ───────────────────────────────────────────────────────────── */
function Mk({ v }) {
  if (v === 'AB' || (typeof v === 'string' && v.toUpperCase() === 'AB'))
    return <span className="inline-flex items-center justify-center rounded-md bg-red-50 px-1.5 py-0.5 font-bold text-red-500 text-[10px] ring-1 ring-red-100">AB</span>
  if (!v || v === '—' || v === '-') return <span className="text-slate-300 text-[11px]">—</span>
  return <span className="tabular-nums font-medium">{v}</span>
}

/* ── grade badge ────────────────────────────────────────────────────────────── */
function GradeBadge({ grade, size = 'sm' }) {
  const c = {
    'A+': 'from-emerald-50 to-teal-50 text-emerald-700 ring-emerald-200',
    A: 'from-emerald-50 to-green-50 text-emerald-600 ring-emerald-200',
    'B+': 'from-blue-50 to-indigo-50 text-blue-700 ring-blue-200',
    B: 'from-blue-50 to-sky-50 text-blue-600 ring-blue-200',
    'C+': 'from-amber-50 to-yellow-50 text-amber-700 ring-amber-200',
    C: 'from-amber-50 to-orange-50 text-amber-600 ring-amber-200',
    D: 'from-red-50 to-rose-50 text-red-600 ring-red-200',
  }
  const s = { sm: 'px-2.5 py-1 text-[10px]', md: 'px-3 py-1.5 text-xs', lg: 'px-4 py-2 text-sm' }
  return (
    <span className={`inline-flex items-center justify-center rounded-lg font-black ring-1 bg-gradient-to-br ${s[size]} ${c[grade] || 'from-slate-50 to-slate-100 text-slate-600 ring-slate-200'}`}>
      {grade}
    </span>
  )
}

/* ── stat card ──────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, subValue, accent, status, progress }) {
  let box = 'bg-white ring-slate-100', ic = 'bg-slate-50 ring-slate-100', icC = 'text-slate-500', vC = 'text-slate-900'
  if (status === 'pass') { box = 'bg-gradient-to-br from-emerald-50/80 to-teal-50/50 ring-emerald-100'; ic = 'bg-emerald-100 ring-emerald-200'; icC = 'text-emerald-600'; vC = 'text-emerald-700' }
  else if (status === 'fail') { box = 'bg-gradient-to-br from-red-50/80 to-rose-50/50 ring-red-100'; ic = 'bg-red-100 ring-red-200'; icC = 'text-red-500'; vC = 'text-red-600' }
  else if (accent) { box = 'bg-gradient-to-br from-indigo-50/80 to-violet-50/50 ring-indigo-100'; ic = 'bg-indigo-100 ring-indigo-200'; icC = 'text-indigo-600'; vC = 'text-indigo-700' }
  return (
    <div className={`group relative flex flex-col items-center gap-1.5 rounded-2xl p-4 print:p-3 ring-1 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${box}`}>
      <div className={`flex h-9 w-9 print:h-7 print:w-7 items-center justify-center rounded-xl ${ic} ring-1 transition-transform group-hover:scale-110`}>
        <Icon className={`h-4 w-4 print:h-3 print:w-3 ${icC}`} />
      </div>
      <span className="text-[10px] print:text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <span className={`text-lg print:text-sm font-black leading-none tracking-tight ${vC}`}>{value}</span>
      {subValue && <span className="text-[10px] print:text-[8px] text-slate-400 font-medium">{subValue}</span>}
      {progress !== undefined && <div className="w-full mt-1"><ProgressBar value={progress} color={status === 'pass' ? 'emerald' : status === 'fail' ? 'red' : accent ? 'indigo' : 'blue'} height="h-1.5" /></div>}
    </div>
  )
}

/* ── subject perf bar ───────────────────────────────────────────────────────── */
function SubjectPerformanceIndicator({ percentage }) {
  const p = parseFloat(percentage)
  return <ProgressBar value={p} color={p < 33 ? 'red' : p < 50 ? 'amber' : p < 75 ? 'blue' : 'emerald'} height="h-1" />
}

/* ── info chip ──────────────────────────────────────────────────────────────── */
function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="group min-w-0 rounded-xl bg-white px-3 py-2.5 print:px-2 print:py-2 ring-1 ring-slate-100 hover:ring-slate-200 transition-all hover:shadow-sm hover:-translate-y-px">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="flex h-5 w-5 print:h-4 print:w-4 shrink-0 items-center justify-center rounded-md bg-slate-50 ring-1 ring-slate-100">
          <Icon className="h-2.5 w-2.5 text-slate-400" />
        </div>
        <span className="text-[9px] print:text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400 truncate">{label}</span>
      </div>
      <span className="block text-[13px] print:text-[11px] font-bold text-slate-800 truncate leading-tight">{value}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function ReportCard({ result, school, showActions = true, allowDownload = true }) {
  if (!result) return null
  const { student, subjects, grand_total, grand_max, percentage, grade, result_status, pass, rank, total_students, term_names, attendance_pct } = result
  const tn = term_names || ['Term 1', 'Term 2', 'Term 3']
  const anyInt = subjects.some(s => s.has_internal)

  // ── Set to true if you want the divisor (÷) column visible ──
  const showDivisor = false

  const infoItems = [
    { icon: User, label: 'Student Name', value: student.name },
    { icon: GraduationCap, label: 'Class & Section', value: `${student.class_name} — ${student.section}` },
    { icon: Hash, label: 'Roll No.', value: student.roll },
    { icon: SquareUser, label: 'BSP ID', value: `${student.admission_no}`},
  ]

  // Column headers for internal layout (without ÷ when hidden)
  const intHeaders = ['Raw', ...(showDivisor ? ['÷'] : []), 'Final', 'Max', '%', 'Grade']
  // colSpan for Grand Total label row
  const gtLabelSpan = anyInt ? (tn.length * 3 + 1) : (tn.length + 1)

  return (
    <div className="space-y-0">
      {/* action bar */}
      {showActions && (
        <div className="flex flex-wrap items-center gap-2 justify-between mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
            <span className="text-sm font-bold text-slate-700">Student Report Card</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => printReportCard(result, school)}>
              <Printer className="w-4 h-4" /> Print
            </Button>
            {allowDownload && (
              <Button size="sm" onClick={() => downloadReportCardPDF(result, school)} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700">
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── A4 card ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl print:rounded-none overflow-hidden ring-1 ring-slate-200/80 shadow-xl shadow-slate-200/50 print:shadow-none print:ring-0
                      print:w-[210mm] print:min-h-[297mm] print:max-h-[297mm] print:mx-auto print:overflow-hidden print:text-[11px]">

        <div className="h-1.5 print:h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* ── header ── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgb(99 102 241) 1px,transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-100/40 to-violet-100/30 blur-2xl print:hidden" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-tr from-violet-100/30 to-indigo-100/20 blur-2xl print:hidden" />

          <div className="relative px-6 py-7 sm:px-10 print:px-6 print:py-4 text-center">
            <div className="mx-auto mb-3 print:mb-2 flex h-14 w-14 print:h-10 print:w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/50 ring-4 ring-white print:shadow-md">
              <Shield className="h-7 w-7 print:h-5 print:w-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl print:text-xl font-black tracking-tight text-slate-900">{school?.school_name || 'School Name'}</h1>
            {(school?.tagline || school?.academic_session) && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                {school.tagline && <span className="text-xs print:text-[10px] font-medium text-slate-500 italic">{school.tagline}</span>}
                {school.tagline && school.academic_session && <span className="h-4 w-px bg-slate-200 hidden sm:block" />}
                {school.academic_session && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] print:text-[9px] font-semibold text-indigo-600 ring-1 ring-indigo-100">
                    <Calendar className="h-3 w-3 print:h-2.5 print:w-2.5" /> Session {school.academic_session}
                  </span>
                )}
              </div>
            )}
            <div className="mt-4 print:mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-50 to-slate-100/80 px-5 py-2 print:px-3 print:py-1 text-[11px] print:text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 ring-1 ring-slate-200/60">
              <BookOpen className="h-3.5 w-3.5 print:h-2.5 print:w-2.5 text-indigo-400" />
              Progress Report Card
            </div>
          </div>
        </div>

        {/* ── student info ── */}
<div className="border-y border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-50/30 px-6 py-4 sm:px-10 print:px-4 print:py-2.5">
  <div className="grid grid-cols-4 gap-2 print:gap-1.5">
    {infoItems.map(i => <InfoChip key={i.label} {...i} />)}
  </div>
</div>

        {/* ── rank ── */}
        {rank && (
          <div className="flex items-center gap-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/80 via-yellow-50/60 to-amber-50/40 px-6 py-3.5 sm:px-10 print:px-6 print:py-2">
            <div className="relative">
              <div className="flex h-10 w-10 print:h-8 print:w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/50 ring-2 ring-white">
                <Trophy className="h-5 w-5 print:h-4 print:w-4 text-white" />
              </div>
              {rank <= 3 && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white">
                  <Star className="h-2.5 w-2.5 text-white fill-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl print:text-lg font-black text-amber-900">#{rank}</span>
                <span className="text-xs print:text-[10px] font-semibold text-amber-700">Class Rank</span>
              </div>
              {total_students && (
                <div className="mt-1 flex items-center gap-2">
                  <ProgressBar value={total_students - rank + 1} max={total_students} color="amber" height="h-1.5" />
                  <span className="text-[10px] print:text-[8px] font-bold text-amber-600 whitespace-nowrap">Top {((rank / total_students) * 100).toFixed(0)}% of {total_students}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── legend ── */}
        {anyInt && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-slate-100 bg-white px-6 py-2.5 sm:px-10 print:px-6 print:py-1.5 text-[11px] print:text-[9px] text-slate-500">
            <span className="text-[9px] print:text-[7px] font-bold uppercase tracking-wider text-slate-400 mr-1">Legend:</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-indigo-500 to-violet-500" /><span className="font-medium">Written</span></span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-amber-400 to-orange-500" /><span className="font-medium">Internal</span></span>
            <span className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center rounded bg-red-50 px-1 py-0.5 text-[9px] font-bold text-red-500 ring-1 ring-red-100">AB</span><span className="font-medium">= Absent</span></span>
            <span className="ml-auto hidden sm:flex items-center gap-1 text-[10px] print:text-[8px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Pass threshold: 33%</span>
          </div>
        )}

        {/* ── marks table ── */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-xs print:text-[10px] border-collapse">
            <thead>
              {anyInt ? (
                <>
                  <tr className="bg-gradient-to-b from-slate-50 to-slate-100/50">
                    <th rowSpan={2} className="border-b-2 border-r border-slate-200 px-4 py-3 print:px-2 print:py-1.5 text-left text-[11px] print:text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 min-w-[8rem] print:min-w-0">
                      <div className="flex items-center gap-1.5"><BookOpen className="h-3 w-3 print:h-2.5 print:w-2.5 text-slate-400" />Subject</div>
                    </th>
                    {tn.map((t, i) => (
                      <th key={i} colSpan={3} className="border-b border-r border-slate-200 px-2 py-2.5 print:px-1 print:py-1 text-center text-[11px] print:text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-gradient-to-b from-indigo-50/50 to-indigo-50/30">
                        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400 print:h-1 print:w-1" />{t}</span>
                      </th>
                    ))}
                    {intHeaders.map(h => (
                      <th key={h} rowSpan={2} className="border-b-2 border-r border-slate-200 px-2 py-3 print:px-1 print:py-1.5 text-center text-[10px] print:text-[8px] font-bold uppercase tracking-wider text-slate-500 last:border-r-0">{h}</th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/30">
                    {tn.map((_, i) => (
                      <React.Fragment key={i}>
                        <th className="border-b-2 border-r border-slate-200 px-1 py-1.5 print:py-1 text-center text-[9px] print:text-[7px] font-bold text-indigo-500 uppercase tracking-wider">Wrt</th>
                        <th className="border-b-2 border-r border-slate-200 px-1 py-1.5 print:py-1 text-center text-[9px] print:text-[7px] font-bold text-amber-600 uppercase tracking-wider">Int</th>
                        <th className="border-b-2 border-r border-slate-200 px-1 py-1.5 print:py-1 text-center text-[9px] print:text-[7px] font-bold text-slate-500 uppercase tracking-wider">Sub</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </>
              ) : (
                <tr className="bg-gradient-to-b from-slate-50 to-slate-100/50">
                  <th className="border-b-2 border-r border-slate-200 px-4 py-3 print:px-2 print:py-1.5 text-left text-[11px] print:text-[9px] font-black uppercase tracking-[0.08em] text-slate-700 min-w-[8rem] print:min-w-0">
                    <div className="flex items-center gap-1.5"><BookOpen className="h-3 w-3 print:h-2.5 print:w-2.5 text-slate-400" />Subject</div>
                  </th>
                  {tn.map((t, i) => (
                    <th key={i} className="border-b-2 border-r border-slate-200 px-3 py-3 print:px-1.5 print:py-1.5 text-center text-[11px] print:text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-gradient-to-b from-indigo-50/50 to-indigo-50/30">
                      <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400 print:h-1 print:w-1" />{t}</span>
                    </th>
                  ))}
                  {['Total', 'Max', '%', 'Grade'].map(h => (
                    <th key={h} className="border-b-2 border-r border-slate-200 px-3 py-3 print:px-1.5 print:py-1.5 text-center text-[10px] print:text-[8px] font-bold uppercase tracking-wider text-slate-500 last:border-r-0">{h}</th>
                  ))}
                </tr>
              )}
            </thead>

            <tbody>
              {subjects.map((sub, idx) => {
                const isAbsent = sub.terms.some(t => t.written_display === 'AB' || t.internal_display === 'AB')
                return (
                  <tr key={sub.subject_name}
                    className={`group transition-colors ${isAbsent ? 'bg-red-50/40 hover:bg-red-50/60' : idx % 2 === 0 ? 'bg-white hover:bg-indigo-50/20' : 'bg-slate-50/30 hover:bg-indigo-50/20'}`}>
                    <td className={`border-b border-r border-slate-100 px-4 py-2.5 print:px-2 print:py-1.5 text-[12px] print:text-[10px] ${isAbsent ? 'bg-red-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{sub.subject_name}</span>
                        <div className="mt-1 w-20 print:w-16"><SubjectPerformanceIndicator percentage={sub.subject_percentage} /></div>
                      </div>
                    </td>

                    {anyInt ? (
                      <>
                        {sub.terms.map(tm => (
                          <React.Fragment key={tm.term}>
                            <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px]"><Mk v={tm.written_display} /></td>
                            <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px]">{sub.has_internal ? <Mk v={tm.internal_display} /> : <span className="text-slate-200">—</span>}</td>
                            <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px] font-bold text-slate-700">{tm.total}</td>
                          </React.Fragment>
                        ))}
                        <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px] tabular-nums font-medium">{sub.raw_total.toFixed(1)}</td>
                        {/* ── divisor column (controlled by showDivisor) ── */}
                        {showDivisor && (
                          <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px] text-slate-300">{sub.divisor}</td>
                        )}
                        <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px] font-black text-slate-900">{sub.final_total.toFixed(1)}</td>
                        <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px] text-slate-400 font-medium">{sub.final_max.toFixed(1)}</td>
                        <td className="border-b border-r border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center text-[12px] print:text-[10px] tabular-nums font-bold">
                          <span className={sub.subject_percentage >= 75 ? 'text-emerald-600' : sub.subject_percentage >= 50 ? 'text-blue-600' : sub.subject_percentage >= 33 ? 'text-amber-600' : 'text-red-600'}>{sub.subject_percentage.toFixed(1)}%</span>
                        </td>
                        <td className="border-b border-slate-100 px-2 py-2.5 print:px-1 print:py-1 text-center"><GradeBadge grade={sub.subject_grade} /></td>
                      </>
                    ) : (
                      <>
                        {sub.terms.map(tm => (
                          <td key={tm.term} className="border-b border-r border-slate-100 px-3 py-2.5 print:px-1.5 print:py-1 text-center text-[12px] print:text-[10px]"><Mk v={tm.written_display} /></td>
                        ))}
                        <td className="border-b border-r border-slate-100 px-3 py-2.5 print:px-1.5 print:py-1 text-center text-[12px] print:text-[10px] font-black text-slate-900 tabular-nums">{sub.final_total.toFixed(1)}</td>
                        <td className="border-b border-r border-slate-100 px-3 py-2.5 print:px-1.5 print:py-1 text-center text-[12px] print:text-[10px] text-slate-400 tabular-nums font-medium">{sub.final_max.toFixed(1)}</td>
                        <td className="border-b border-r border-slate-100 px-3 py-2.5 print:px-1.5 print:py-1 text-center text-[12px] print:text-[10px] tabular-nums font-bold">
                          <span className={sub.subject_percentage >= 75 ? 'text-emerald-600' : sub.subject_percentage >= 50 ? 'text-blue-600' : sub.subject_percentage >= 33 ? 'text-amber-600' : 'text-red-600'}>{sub.subject_percentage.toFixed(1)}%</span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 print:px-1.5 print:py-1 text-center"><GradeBadge grade={sub.subject_grade} /></td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>

            <tfoot>
              <tr className="bg-gradient-to-b from-slate-50 to-slate-100/50">
                <td colSpan={gtLabelSpan} className="border-t-2 border-r border-slate-300 px-4 py-3 print:px-2 print:py-1.5 text-right text-[11px] print:text-[9px] font-black uppercase tracking-[0.1em] text-slate-700">
                  <div className="flex items-center justify-end gap-2"><span className="h-1.5 w-6 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500" />Grand Total</div>
                </td>
                {anyInt && (
                  <>
                    {/* Raw total in footer */}
                    <td className="border-t-2 border-r border-slate-300 px-2 py-3 print:px-1 print:py-1.5 text-center text-[12px] print:text-[10px] font-bold text-slate-700 tabular-nums">{grand_total.toFixed(1)}</td>
                    {/* ── divisor footer cell ── */}
                    {showDivisor && (
                      <td className="border-t-2 border-r border-slate-300 px-2 py-3 print:px-1 print:py-1.5 text-center text-slate-300">—</td>
                    )}
                  </>
                )}
                <td className="border-t-2 border-r border-slate-300 px-2 py-3 print:px-1 print:py-1.5 text-center text-sm print:text-[11px] font-black text-indigo-700 tabular-nums">{grand_total.toFixed(1)}</td>
                <td className="border-t-2 border-r border-slate-300 px-2 py-3 print:px-1 print:py-1.5 text-center text-[12px] print:text-[10px] text-slate-500 tabular-nums font-medium">{grand_max.toFixed(1)}</td>
                <td className="border-t-2 border-r border-slate-300 px-2 py-3 print:px-1 print:py-1.5 text-center text-sm print:text-[11px] font-black tabular-nums">
                  <span className={percentage >= 75 ? 'text-emerald-600' : percentage >= 50 ? 'text-blue-600' : percentage >= 33 ? 'text-amber-600' : 'text-red-600'}>{percentage.toFixed(1)}%</span>
                </td>
                <td className="border-t-2 border-slate-300 px-3 py-3 print:px-1 print:py-1.5 text-center"><GradeBadge grade={grade} size="lg" /></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── summary stats ── */}
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 py-5 sm:px-10 print:px-6 print:py-3">
          <div className="mb-3 print:mb-2 flex items-center gap-2">
            <div className="h-1 w-6 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <span className="text-[10px] print:text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400">Performance Summary</span>
          </div>
          <div className={`grid gap-3 print:gap-2 grid-cols-2 print:grid-cols-${attendance_pct != null ? 5 : 4} ${attendance_pct != null ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
            <StatCard icon={BookOpen} label="Total Score" value={`${grand_total.toFixed(1)} / ${grand_max.toFixed(1)}`} />
            <StatCard icon={TrendingUp} label="Percentage" value={`${percentage.toFixed(1)}%`} accent progress={percentage} />
            <StatCard icon={Award} label="Grade" value={grade} accent />
            <StatCard icon={pass ? CheckCircle : XCircle} label="Result" value={result_status} status={pass ? 'pass' : 'fail'} />
            {attendance_pct != null && (
              <StatCard
                icon={CalendarDays}
                label="Attendance"
                value={`${attendance_pct.toFixed(1)}%`}
                status={attendance_pct >= 85 ? 'pass' : attendance_pct < 60 ? 'fail' : undefined}
                accent={attendance_pct >= 60 && attendance_pct < 85}
                progress={attendance_pct}
              />
            )}
          </div>

        </div>

        {/* ── signature ── */}
        <div className="border-t border-slate-100 bg-white px-8 pb-8 pt-4 sm:px-10 print:px-6 print:pb-4 print:pt-3">
          <div className="grid grid-cols-3 gap-8 print:gap-4">
            {['Class Teacher', 'Guardian / Parent', 'Principal'].map(sig => (
              <div key={sig} className="flex flex-col items-center">
                <div className="h-20 print:h-14 w-full" />
                <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <span className="mt-2 print:mt-1.5 text-[11px] print:text-[9px] font-bold text-slate-500 tracking-wide">{sig}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-1.5 print:h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      </div>

      <div className="mt-4 text-center print:hidden">
        <span className="text-[10px] text-slate-400 font-medium">This is a computer-generated report card. For any discrepancies, please contact the school administration.</span>
      </div>
    </div>
  )
}