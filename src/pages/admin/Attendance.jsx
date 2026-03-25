// src/pages/admin/Attendance.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useClasses, useSections } from '../../hooks/useSections'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import {
  Calendar, Users, Save, Info, Percent,
  RefreshCw, TrendingUp, TrendingDown, Loader2,
  AlertTriangle, Hash, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── helpers (unchanged) ─────────────────────────────────── */

async function logAudit(payload) {
  const { error } = await supabase.from('entry_logs').insert(payload)
  if (error) console.error('[RMS] audit log failed:', error.message)
}

function calcPct(present, total) {
  const p = parseInt(present)
  const t = parseInt(total)
  if (!t || t <= 0 || isNaN(p) || isNaN(t) || p < 0) return null
  return Math.min(100, Math.round((p / t) * 1000) / 10)
}

function pctTheme(pct) {
  if (pct === null)
    return { bar: 'bg-gray-200 dark:bg-gray-700', track: 'bg-gray-100 dark:bg-gray-800', txt: 'text-gray-400' }
  if (pct >= 75)
    return { bar: 'bg-emerald-500', track: 'bg-emerald-50 dark:bg-emerald-900/20', txt: 'text-emerald-700 dark:text-emerald-300' }
  if (pct >= 50)
    return { bar: 'bg-amber-400', track: 'bg-amber-50 dark:bg-amber-900/20', txt: 'text-amber-700 dark:text-amber-300' }
  return { bar: 'bg-red-400', track: 'bg-red-50 dark:bg-red-900/20', txt: 'text-red-600 dark:text-red-400' }
}

function PctBar({ pct }) {
  const { bar, track, txt } = pctTheme(pct)
  if (pct === null) return <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className={`flex-1 h-1.5 rounded-full ${track} overflow-hidden`}>
        <div className={`h-full rounded-full ${bar} transition-all duration-400`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-black tabular-nums w-10 text-right ${txt}`}>{pct.toFixed(1)}%</span>
    </div>
  )
}

function DayCell({ value, onChange, disabled, max, placeholder }) {
  const num     = parseInt(value)
  const invalid = value !== '' && value !== null && (isNaN(num) || num < 0 || (max !== undefined && num > max))
  return (
    <input
      type="number"
      min="0"
      max={max}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder || '—'}
      className={[
        'w-16 text-center text-sm border rounded-lg px-2 py-1.5',
        'focus:outline-none focus:ring-2 transition-all tabular-nums',
        disabled
          ? 'bg-gray-50 dark:bg-gray-800 text-gray-300 cursor-not-allowed border-gray-100 dark:border-gray-700'
          : invalid
            ? 'border-red-300 bg-red-50 dark:bg-red-900/10 focus:ring-red-400/50 text-red-700 dark:text-red-400'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-teal-400/50 focus:border-teal-400 text-gray-800 dark:text-gray-200',
      ].join(' ')}
    />
  )
}

/* ── Main Component ──────────────────────────────────────── */

export default function Attendance() {
  const { user, can } = useAuth()
  const { classOpts } = useClasses()
  const [selClass,     setSelClass]     = useState('')
  const [selSection,   setSelSection]   = useState('')
  const { sectionOpts } = useSections(selClass)

  const [students,     setStudents]     = useState([])
  const [rowMap,       setRowMap]       = useState({})
  const [loading,      setLoading]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [dirty,        setDirty]        = useState(false)
  const [academicYear, setAcademicYear] = useState('')
  const [hasDayCols,   setHasDayCols]   = useState(true)
  const [globalTotal,  setGlobalTotal]  = useState('')

  useEffect(() => {
    supabase.from('schools').select('academic_session').eq('id', user.school_id).single()
      .then(({ data }) => setAcademicYear(data?.academic_session || ''))
  }, [user.school_id])

  const fetchData = useCallback(async () => {
    if (!selClass || !selSection) { setStudents([]); setRowMap({}); return }
    setLoading(true)

    const { data: studs } = await supabase
      .from('students').select('id,name,roll,father_name')
      .eq('class_name', selClass).eq('section', selSection)
      .eq('school_id', user.school_id).eq('is_active', true).order('roll')

    const ids = (studs || []).map(s => s.id)
    let attRows = []
    let hasDays = true

    if (ids.length > 0) {
      const { data: withDays, error: dErr } = await supabase
        .from('attendance')
        .select('id,student_id,attendance_pct,present_days,total_days,academic_year')
        .in('student_id', ids).eq('school_id', user.school_id)

      if (dErr && dErr.message?.includes('present_days')) {
        hasDays = false
        const { data: pctOnly } = await supabase
          .from('attendance')
          .select('id,student_id,attendance_pct,academic_year')
          .in('student_id', ids).eq('school_id', user.school_id)
        attRows = pctOnly || []
      } else {
        attRows = withDays || []
      }
    }

    setHasDayCols(hasDays)

    const attByStudent = {}
    attRows.forEach(a => { attByStudent[a.student_id] = a })

    const rm = {}
    ;(studs || []).forEach(s => {
      const a = attByStudent[s.id]
      if (a) {
        const p = a.present_days != null ? String(a.present_days) : ''
        const t = a.total_days   != null ? String(a.total_days)   : ''
        rm[s.id] = {
          present:   p,
          total:     t,
          pct:       (p && t) ? calcPct(p, t) : (a.attendance_pct ?? null),
          dbId:      a.id,
          legacyPct: (!p && !t && a.attendance_pct != null) ? a.attendance_pct : null,
        }
      } else {
        rm[s.id] = { present: '', total: '', pct: null, dbId: null, legacyPct: null }
      }
    })

    setStudents(studs || [])
    setRowMap(rm)
    setDirty(false)
    setGlobalTotal('')
    setLoading(false)
  }, [selClass, selSection, user.school_id])

  useEffect(() => { fetchData() }, [fetchData])

  const applyGlobalTotal = (val) => {
    setGlobalTotal(val)
    setRowMap(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(id => {
        const row = { ...next[id], total: val }
        row.pct = calcPct(row.present, val)
        next[id] = row
      })
      return next
    })
    if (val !== '') setDirty(true)
  }

  const updateRow = (id, field, val) => {
    setRowMap(prev => {
      const row = { ...prev[id], [field]: val }
      row.pct = calcPct(row.present, row.total)
      return { ...prev, [id]: row }
    })
    setDirty(true)
  }

  const rowError = (row) => {
    if (!row) return null
    const p = parseInt(row.present)
    const t = parseInt(row.total)
    if (row.present === '' && row.total === '') return null
    if (row.present !== '' && (isNaN(p) || p < 0))  return 'Invalid present days'
    if (row.total   !== '' && (isNaN(t) || t <= 0))  return 'Total must be > 0'
    if (row.present !== '' && row.total === '') return 'Enter total working days'
    if (row.total   !== '' && row.present === '') return 'Enter days present'
    if (p > t) return `Present (${p}) exceeds Total (${t})`
    return null
  }

  const handleSave = async () => {
    const errStudents = students.filter(s => rowError(rowMap[s.id]))
    if (errStudents.length > 0) {
      toast.error(`Fix errors for: ${errStudents.map(s => s.name).join(', ')}`)
      return
    }

    setSaving(true)
    const upsertRows = students
      .filter(s => {
        const r = rowMap[s.id]
        return r && (r.present !== '' || r.total !== '' || r.legacyPct !== null)
      })
      .map(s => {
        const r = rowMap[s.id]
        const p   = r.present !== '' ? parseInt(r.present) : null
        const t   = r.total   !== '' ? parseInt(r.total)   : null
        const pct = (p !== null && t !== null) ? calcPct(r.present, r.total) : r.legacyPct
        return {
          ...(r.dbId ? { id: r.dbId } : {}),
          student_id:     s.id,
          school_id:      user.school_id,
          class_name:     selClass,
          section:        selSection,
          academic_year:  academicYear,
          present_days:   p,
          total_days:     t,
          attendance_pct: pct,
          updated_at:     new Date().toISOString(),
        }
      })

    if (!upsertRows.length) {
      toast('Nothing to save.', { icon: 'ℹ️' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('attendance')
      .upsert(upsertRows, { onConflict: 'student_id,school_id,academic_year' })

    setSaving(false)
    if (error) { toast.error(error.message); return }

    toast.success(`Attendance saved for ${upsertRows.length} student${upsertRows.length !== 1 ? 's' : ''}!`)
    setDirty(false)
    await logAudit({
      saved_by: user.user_id, school_id: user.school_id,
      action_type: 'MARKS_SAVE', class_name: selClass, section: selSection,
      status: 'Saved', notes: `Attendance (days) saved for ${upsertRows.length} students`,
    })
    fetchData()
  }

  const stats = useMemo(() => {
    const pcts = students.map(s => rowMap[s.id]?.pct ?? rowMap[s.id]?.legacyPct).filter(p => p !== null && !isNaN(p))
    if (!pcts.length) return null
    const avg  = pcts.reduce((a, b) => a + b, 0) / pcts.length
    const low  = pcts.filter(p => p < 75).length
    const high = pcts.filter(p => p >= 75).length
    return { avg: avg.toFixed(1), low, high, total: pcts.length }
  }, [students, rowMap])

  const hasAnyError = students.some(s => rowError(rowMap[s.id]))
  const editable    = can('write')

  /* ─────────────────────── JSX ─────────────────────────── */

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ═══ 1. HERO HEADER ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-6 sm:px-8 py-7">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Attendance</h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                Enter days present &amp; total working days — % calculated automatically
              </p>
            </div>
          </div>
          {academicYear && (
            <span className="text-xs font-medium text-white/60 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
              Session: {academicYear}
            </span>
          )}
        </div>
      </div>

      {/* ═══ 2. FILTERS ═══ */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm p-5">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="min-w-[170px]">
            <Select label="Class" options={classOpts()} value={selClass}
              onChange={e => { setSelClass(e.target.value); setSelSection('') }} />
          </div>
          <div className="min-w-[160px]">
            <Select label="Section" options={sectionOpts()} value={selSection}
              onChange={e => setSelSection(e.target.value)} disabled={!selClass} />
          </div>
          {selClass && selSection && (
            <Button variant="secondary" size="sm" onClick={fetchData} className="!rounded-xl mb-0.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          )}

          {/* Stats badges */}
          {stats && (
            <div className="ml-auto flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{stats.total} entered</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Avg {stats.avg}%</span>
              </div>
              {stats.low > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{stats.low} below 75%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 3. GLOBAL TOTAL DAYS — prominent standalone card ═══ */}
      {selClass && selSection && hasDayCols && editable && students.length > 0 && !loading && (
        <div className="rounded-2xl bg-gradient-to-r from-teal-50/80 to-emerald-50/50 dark:from-teal-900/15 dark:to-emerald-900/10 ring-1 ring-teal-200/60 dark:ring-teal-800/40 shadow-sm px-5 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Total Working Days
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Enter once — applies to <strong>all {students.length} students</strong> below
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={globalTotal}
                onChange={e => applyGlobalTotal(e.target.value)}
                placeholder="e.g. 248"
                className={[
                  'w-28 text-center text-sm font-semibold border rounded-xl px-3 py-2.5',
                  'focus:outline-none focus:ring-2 transition-all tabular-nums',
                  'border-teal-300 dark:border-teal-700 bg-white dark:bg-gray-800',
                  'text-gray-800 dark:text-gray-200',
                  'focus:ring-teal-400/50 focus:border-teal-500',
                  'placeholder-gray-300 dark:placeholder-gray-600',
                ].join(' ')}
              />
              {globalTotal && parseInt(globalTotal) > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-100/80 dark:bg-teal-900/30 px-3 py-1.5 rounded-lg whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Applied to all
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 4. MIGRATION NOTICE ═══ */}
      {selClass && selSection && !hasDayCols && !loading && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Run migration 015</strong> to enable days-based attendance entry.
            Existing percentages are still visible below in read-only mode.
          </p>
        </div>
      )}

      
      {/* ═══ 5. TIP ═══ */}
      {/*
      {selClass && selSection && hasDayCols && !loading && students.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-teal-50/60 dark:bg-teal-900/10 border border-teal-200/60 dark:border-teal-800/30">
          <Info className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-teal-700 dark:text-teal-400 leading-relaxed">
            Enter <strong>Days Present</strong> per student. Use the <strong>Total Working Days</strong> field
            above to set the same total for everyone, or override individually per row.
            The <strong>%</strong> column updates live. Rows marked "legacy" had their %
            entered manually — add day counts to convert them.
          </p>
        </div>
      )}
      */}

      {/* ═══ 6. TABLE ═══ */}
      {selClass && selSection && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm overflow-hidden">

          {/* Table header bar */}
          <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-emerald-50/40 dark:from-teal-900/20 dark:to-emerald-900/10 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Percent className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {selClass} — Section {selSection}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {students.length} student{students.length !== 1 ? 's' : ''}
                  {globalTotal && parseInt(globalTotal) > 0
                    ? ` · ${globalTotal} total working days`
                    : ` · ${academicYear || 'current'} session`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasAnyError && (
                <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Fix errors before saving
                </div>
              )}
              {editable && dirty && !hasAnyError && (
                <Button onClick={handleSave} loading={saving} size="sm" className="!rounded-xl">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </Button>
              )}
            </div>
          </div>

          {/* Table body */}
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-3">
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              <p className="text-sm text-gray-400">Loading students…</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <Users className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-400">No active students found in this class / section.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12">
                        Roll
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                        Father's Name
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                        Days Present
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                        Total Days
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-44">
                        % (Auto-calc)
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {students.map(s => {
                      const row       = rowMap[s.id] || { present: '', total: '', pct: null, dbId: null, legacyPct: null }
                      const err       = rowError(row)
                      const pctToShow = row.pct !== null ? row.pct : row.legacyPct
                      const isLegacy  = row.legacyPct !== null && row.present === '' && row.total === ''

                      return (
                        <tr
                          key={s.id}
                          className={[
                            'transition-colors',
                            err
                              ? 'bg-red-50/40 dark:bg-red-900/5'
                              : 'hover:bg-teal-50/20 dark:hover:bg-teal-900/5',
                          ].join(' ')}
                        >
                          <td className="px-4 py-3 tabular-nums text-gray-400 text-xs font-mono">
                            {s.roll}
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                              {s.name}
                            </p>
                            {err && (
                              <p className="text-[10px] text-red-500 font-medium mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />{err}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell">
                            {s.father_name || '—'}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {hasDayCols ? (
                              <DayCell
                                value={row.present}
                                onChange={val => updateRow(s.id, 'present', val)}
                                disabled={!editable}
                                max={row.total !== '' ? parseInt(row.total) : undefined}
                                placeholder="0"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">n/a</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {hasDayCols ? (
                              <DayCell
                                value={row.total}
                                onChange={val => updateRow(s.id, 'total', val)}
                                disabled={!editable}
                                placeholder="0"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">n/a</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {pctToShow !== null ? (
                              <div className="flex flex-col gap-0.5">
                                <PctBar pct={pctToShow} />
                                {isLegacy && (
                                  <span className="text-[9px] text-gray-400 italic pl-0.5">legacy entry</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 dark:text-gray-600">Not entered</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {editable && (
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Info className="w-3 h-3 flex-shrink-0" />
                      Formula: (Present ÷ Total) × 100, rounded to 1 decimal. Syncs to report cards.
                    </p>
                    {stats && (
                      <p className="text-[10px] text-gray-400 pl-[18px]">
                        {stats.high} at ≥75% · {stats.low} below 75% · Class avg {stats.avg}%
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSave}
                    loading={saving}
                    disabled={!dirty || hasAnyError}
                    size="sm"
                    className="!rounded-xl flex-shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Attendance
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ 7. EMPTY STATE ═══ */}
      {!selClass && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
            <Calendar className="w-7 h-7 text-teal-300 dark:text-teal-700" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a class</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
            Choose a class and section above to manage attendance records.
          </p>
        </div>
      )}
    </div>
  )
}