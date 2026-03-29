// src/pages/admin/BulkPromotion.jsx
// Bulk Promotion: promotes all (or selected) students from one class/section
// to a target class/section, reassigning roll numbers sequentially by academic rank.

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useClasses, useSections } from '../../hooks/useSections'
import { buildStudentResult, rankComparator } from '../../utils/grades'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import {
  ArrowRight, GraduationCap, Users, CheckCircle2,
  AlertTriangle, RefreshCw, ChevronRight, Loader2,
  ArrowUpCircle, Hash, UserCheck, UserX, Info,
  Trophy, MoveRight, Undo2, ShieldAlert, Database,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Constants ──────────────────────────────────────────────────
const UPSERT_CHUNK_SIZE = 100 // max rows per upsert to avoid payload limits
const HISTORY_TABLE     = 'promotion_history'
const STUDENTS_TABLE    = 'students'
const MARKS_TABLE       = 'marks'
const CONFIG_TABLE      = 'config'
const LOGS_TABLE        = 'entry_logs'

// ── Helpers ────────────────────────────────────────────────────

/** Fire-and-forget audit logger — never blocks the main flow */
async function logAudit(payload) {
  try {
    const { error } = await supabase.from(LOGS_TABLE).insert(payload)
    if (error) console.error('[RMS] audit log failed:', error.message)
  } catch (e) {
    console.error('[RMS] audit log exception:', e)
  }
}

/** Split an array into chunks of `size` */
function chunk(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

/**
 * Fetch the current maximum roll number in a target section.
 * Returns 0 if the section is empty.
 */
async function fetchMaxRoll(schoolId, className, section) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select('roll')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .eq('section', section)
    .eq('is_active', true)
    .order('roll', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[RMS] fetchMaxRoll error:', error.message)
    return 0
  }
  return data?.[0]?.roll ?? 0
}

/**
 * Verify that no active student in the target section already occupies
 * any roll number within [startRoll, startRoll + count - 1].
 * Returns the list of conflicting roll numbers.
 */
async function findRollConflicts(schoolId, className, section, startRoll, count) {
  const endRoll = startRoll + count - 1
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select('roll')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .eq('section', section)
    .eq('is_active', true)
    .gte('roll', startRoll)
    .lte('roll', endRoll)

  if (error) {
    console.error('[RMS] findRollConflicts error:', error.message)
    return []
  }
  return (data || []).map(r => r.roll)
}

/**
 * Save a snapshot of each student's current state before promotion
 * so the operation can be reversed later.
 */
async function savePromotionHistory(students, batchId, schoolId, userId) {
  const rows = students.map(s => ({
    batch_id:           batchId,
    student_id:         s.id,
    school_id:          schoolId,
    previous_class:     s.prev_class,
    previous_section:   s.prev_section,
    previous_roll:      s.prev_roll,
    new_class:          s.new_class,
    new_section:        s.new_section,
    new_roll:           s.new_roll,
    promoted_by:        userId,
    promoted_at:        new Date().toISOString(),
    is_reversed:        false,
  }))

  const batches = chunk(rows, UPSERT_CHUNK_SIZE)
  for (const batch of batches) {
    const { error } = await supabase.from(HISTORY_TABLE).insert(batch)
    if (error) console.error('[RMS] history save failed:', error.message)
  }
}

// ── Small info chip ───────────────────────────────────────────
function InfoChip({ icon: Icon, label, value, accent = 'indigo' }) {
  const colors = {
    indigo:  'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800/40',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/40',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/40',
    red:     'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-800/40',
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ring-1 ${colors[accent]}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div>
        <p className="text-[9px] uppercase tracking-wider font-bold opacity-60">{label}</p>
        <p className="text-xs font-bold leading-none mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ── Conflict resolution modal ─────────────────────────────────
function ConflictModal({ conflicts, onAutoFix, onCancel, targetInfo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Roll Number Conflict</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {targetInfo.class} – {targetInfo.section} already has students at these rolls
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The following roll numbers are already occupied:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conflicts.map(r => (
              <span key={r} className="px-2 py-0.5 text-xs font-bold rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800/40">
                #{r}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <strong>Auto-fix</strong> will start roll numbers after the current highest roll in the target section.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} className="!rounded-xl text-sm">
            Cancel
          </Button>
          <Button onClick={onAutoFix} className="!rounded-xl text-sm bg-amber-600 hover:bg-amber-700">
            <RefreshCw className="w-3.5 h-3.5" /> Auto-Fix & Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function BulkPromotion() {
  const { user } = useAuth()
  const { classOpts } = useClasses()

  // Source filters
  const [srcClass,   setSrcClass]   = useState('')
  const [srcSection, setSrcSection] = useState('')
  const { sectionOpts: srcSectionOpts } = useSections(srcClass)

  // Target filters
  const [tgtClass,   setTgtClass]   = useState('')
  const [tgtSection, setTgtSection] = useState('')
  const { sectionOpts: tgtSectionOpts } = useSections(tgtClass)

  // Students & selection
  const [students,    setStudents]    = useState([])
  const [selected,    setSelected]    = useState(new Set())
  const [loading,     setLoading]     = useState(false)
  const [promoting,   setPromoting]   = useState(false)
  const [startRoll,   setStartRoll]   = useState('1')
  const [autoRoll,    setAutoRoll]    = useState(true) // auto-detect start roll
  const [result,      setResult]      = useState(null)
  const [step,        setStep]        = useState('config') // config | preview | done
  const [batchId,     setBatchId]     = useState(null)

  // Rank map: student_id → { rank, percentage, hasMarks }
  const [resultMap, setResultMap] = useState({})

  // Conflict resolution
  const [conflicts,   setConflicts]   = useState([])
  const [showConflict, setShowConflict] = useState(false)

  // Error details per student (for granular reporting)
  const [errorDetails, setErrorDetails] = useState([])

  // Abort controller for cancellable fetches
  const abortRef = useRef(null)

  // ── Fetch students + compute academic ranks ─────────────────
  const fetchStudents = useCallback(async () => {
    // Abort any in-flight fetch
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (!srcClass || !srcSection) {
      setStudents([]); setSelected(new Set()); setResultMap({}); return
    }
    setLoading(true)

    try {
      const { data, error: fetchErr } = await supabase
        .from(STUDENTS_TABLE)
        .select('id,name,roll,father_name,admission_no,class_name,section')
        .eq('class_name', srcClass)
        .eq('section', srcSection)
        .eq('school_id', user.school_id)
        .eq('is_active', true)
        .order('roll')

      // If aborted, bail silently
      if (controller.signal.aborted) return

      if (fetchErr) {
        toast.error('Failed to load students: ' + fetchErr.message)
        setLoading(false)
        return
      }

      const studs = data || []
      setStudents(studs)
      setSelected(new Set(studs.map(s => s.id)))

      // ── Compute academic ranks from marks ──────────────
      if (studs.length > 0) {
        const [{ data: cfgRows, error: cfgErr }, { data: allMarks, error: marksErr }] =
          await Promise.all([
            supabase
              .from(CONFIG_TABLE)
              .select('*')
              .eq('class_name', srcClass)
              .eq('school_id', user.school_id)
              .order('display_order'),
            supabase
              .from(MARKS_TABLE)
              .select('student_id,subject_name,term,written,internal')
              .in('student_id', studs.map(s => s.id))
              .eq('school_id', user.school_id),
          ])

        if (controller.signal.aborted) return

        if (cfgErr) console.warn('[RMS] config fetch warning:', cfgErr.message)
        if (marksErr) console.warn('[RMS] marks fetch warning:', marksErr.message)

        if (cfgRows?.length) {
          // Group marks by student — O(n) single pass
          const marksByStudent = {}
          ;(allMarks || []).forEach(m => {
            if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = []
            marksByStudent[m.student_id].push(m)
          })

          // Build result per student
          const resultList = studs.map(stu => {
            const mRows = marksByStudent[stu.id] || []
            return {
              student_id: stu.id,
              hasMarks:   mRows.length > 0,
              ...buildStudentResult(
                { ...stu, class_name: srcClass, section: srcSection },
                cfgRows,
                mRows,
              ),
            }
          })

          // Sort: fewest fails → highest percentage
          const sorted = [...resultList].sort(rankComparator)

          const rMap = {}
          sorted.forEach((r, idx) => {
            rMap[r.student_id] = {
              rank:       idx + 1,
              percentage: r.percentage,
              hasMarks:   r.hasMarks,
            }
          })
          setResultMap(rMap)
        } else {
          setResultMap({})
        }
      } else {
        setResultMap({})
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[RMS] fetchStudents error:', err)
        toast.error('An unexpected error occurred while loading students.')
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [srcClass, srcSection, user.school_id])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [])

  // ── Auto-detect starting roll when target changes ───────────
  useEffect(() => {
    if (!autoRoll || !tgtClass || !tgtSection) return
    let cancelled = false

    ;(async () => {
      const maxRoll = await fetchMaxRoll(user.school_id, tgtClass, tgtSection)
      if (!cancelled) setStartRoll(String(maxRoll + 1))
    })()

    return () => { cancelled = true }
  }, [tgtClass, tgtSection, autoRoll, user.school_id])

  // ── Selection helpers ───────────────────────────────────────
  const toggleAll = () => {
    if (selected.size === students.length) setSelected(new Set())
    else setSelected(new Set(students.map(s => s.id)))
  }

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Derived data ────────────────────────────────────────────
  const hasRanks = Object.keys(resultMap).length > 0

  const selectedStudents = students
    .filter(s => selected.has(s.id))
    .sort((a, b) => {
      const ra = resultMap[a.id]?.rank ?? Infinity
      const rb = resultMap[b.id]?.rank ?? Infinity
      return ra - rb
    })

  const canPreview =
    srcClass && srcSection && tgtClass && tgtSection && selected.size > 0

  const startRollNum = parseInt(startRoll) || 1

  const previewRows = selectedStudents.map((s, idx) => ({
    ...s,
    newRoll: startRollNum + idx,
    rank:    resultMap[s.id]?.rank       ?? null,
    pct:     resultMap[s.id]?.percentage ?? null,
  }))

  // ── Preview handler (with conflict detection) ───────────────
  const handlePreview = async () => {
    if (!canPreview) return
    if (srcClass === tgtClass && srcSection === tgtSection) {
      toast.error('Source and target class/section are the same.')
      return
    }

    // Check for roll conflicts in target section
    const conflicting = await findRollConflicts(
      user.school_id, tgtClass, tgtSection,
      startRollNum, selected.size,
    )

    if (conflicting.length > 0) {
      setConflicts(conflicting)
      setShowConflict(true)
      return
    }

    setStep('preview')
  }

  // Auto-fix: bump start roll past all existing students
  const handleAutoFixConflict = async () => {
    const maxRoll = await fetchMaxRoll(user.school_id, tgtClass, tgtSection)
    setStartRoll(String(maxRoll + 1))
    setShowConflict(false)
    setConflicts([])
    setStep('preview')
  }

  // ── Promote handler (chunked upsert + history + granular errors) ─
  const handlePromote = async () => {
    if (!canPreview) return
    setPromoting(true)
    setErrorDetails([])

    const newBatchId = crypto.randomUUID()
    setBatchId(newBatchId)

    let successCount = 0
    let failCount    = 0
    const errors     = []

    // Build update rows, carrying previous state for undo
    const updateRows = selectedStudents.map((s, idx) => ({
      id:         s.id,
      school_id:  user.school_id,
      class_name: tgtClass,
      section:    tgtSection,
      roll:       startRollNum + idx,
      updated_at: new Date().toISOString(),
      // metadata for history (not sent to students table)
      _prev_class:   s.class_name || srcClass,
      _prev_section: s.section    || srcSection,
      _prev_roll:    s.roll,
      _name:         s.name,
    }))

    // Chunk to avoid payload limits
    const batches = chunk(updateRows, UPSERT_CHUNK_SIZE)

    for (const batch of batches) {
      // Strip meta fields before sending to DB
      const dbRows = batch.map(({ _prev_class, _prev_section, _prev_roll, _name, ...rest }) => rest)

      const { error: batchErr } = await supabase
        .from(STUDENTS_TABLE)
        .upsert(dbRows, { onConflict: 'id' })

      if (batchErr) {
        failCount += batch.length
        batch.forEach(s => errors.push({
          studentId: s.id,
          name:      s._name,
          error:     batchErr.message,
        }))
      } else {
        successCount += batch.length
      }
    }

    // Save promotion history for undo capability
    if (successCount > 0) {
      const historyStudents = updateRows
        .filter(r => !errors.find(e => e.studentId === r.id))
        .map(r => ({
          id:           r.id,
          prev_class:   r._prev_class,
          prev_section: r._prev_section,
          prev_roll:    r._prev_roll,
          new_class:    tgtClass,
          new_section:  tgtSection,
          new_roll:     r.roll,
        }))

      await savePromotionHistory(historyStudents, newBatchId, user.school_id, user.user_id)
    }

    // Audit log
    await logAudit({
      saved_by:    user.user_id,
      school_id:   user.school_id,
      action_type: 'STUDENT_UPDATE',
      class_name:  tgtClass,
      section:     tgtSection,
      status:      failCount > 0 ? 'PARTIAL_ERROR' : 'Saved',
      notes: [
        `Bulk promotion [${newBatchId}]:`,
        `${successCount}/${updateRows.length} students`,
        `from ${srcClass}-${srcSection} → ${tgtClass}-${tgtSection}`,
        failCount > 0 ? `| ${failCount} failed` : '',
      ].join(' ').trim(),
    })

    setErrorDetails(errors)
    setResult({ successCount, failCount, total: updateRows.length })
    setStep('done')
    setPromoting(false)

    if (successCount > 0) toast.success(`${successCount} student(s) promoted successfully!`)
    if (failCount > 0)    toast.error(`${failCount} student(s) failed to promote.`)
  }

  // ── Undo last promotion ─────────────────────────────────────
  const handleUndo = async () => {
    if (!batchId) return
    setPromoting(true)

    const { data: historyRows, error: histErr } = await supabase
      .from(HISTORY_TABLE)
      .select('*')
      .eq('batch_id', batchId)
      .eq('school_id', user.school_id)
      .eq('is_reversed', false)

    if (histErr || !historyRows?.length) {
      toast.error('Could not find promotion history to reverse.')
      setPromoting(false)
      return
    }

    // Restore each student to their previous class/section/roll
    const restoreRows = historyRows.map(h => ({
      id:         h.student_id,
      school_id:  user.school_id,
      class_name: h.previous_class,
      section:    h.previous_section,
      roll:       h.previous_roll,
      updated_at: new Date().toISOString(),
    }))

    const batches = chunk(restoreRows, UPSERT_CHUNK_SIZE)
    let undoneCount = 0

    for (const batch of batches) {
      const { error } = await supabase
        .from(STUDENTS_TABLE)
        .upsert(batch, { onConflict: 'id' })

      if (!error) undoneCount += batch.length
    }

    // Mark history as reversed
    if (undoneCount > 0) {
      await supabase
        .from(HISTORY_TABLE)
        .update({ is_reversed: true })
        .eq('batch_id', batchId)
        .eq('school_id', user.school_id)
    }

    await logAudit({
      saved_by:    user.user_id,
      school_id:   user.school_id,
      action_type: 'STUDENT_UPDATE',
      class_name:  srcClass,
      section:     srcSection,
      status:      'Reversed',
      notes: `Undo promotion [${batchId}]: ${undoneCount} students restored to ${srcClass}-${srcSection}`,
    })

    setPromoting(false)
    toast.success(`${undoneCount} student(s) restored to ${srcClass} – ${srcSection}`)
    reset()
  }

  // ── Full reset ──────────────────────────────────────────────
  const reset = () => {
    setSrcClass(''); setSrcSection('')
    setTgtClass(''); setTgtSection('')
    setStudents([]); setSelected(new Set())
    setStartRoll('1'); setAutoRoll(true)
    setResult(null); setStep('config')
    setResultMap({}); setBatchId(null)
    setConflicts([]); setShowConflict(false)
    setErrorDetails([])
  }

  // ══════════════════════════════════════════════════════════════
  // ██  RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Conflict resolution modal */}
      {showConflict && (
        <ConflictModal
          conflicts={conflicts}
          targetInfo={{ class: tgtClass, section: tgtSection }}
          onAutoFix={handleAutoFixConflict}
          onCancel={() => { setShowConflict(false); setConflicts([]) }}
        />
      )}

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-6 sm:px-8 py-7">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <ArrowUpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Bulk Promotion</h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              Move students to the next class with rank-based roll numbers
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* STEP: DONE                                          */}
      {/* ════════════════════════════════════════════════════ */}
      {step === 'done' && result ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm p-10 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto ring-4 ring-emerald-100 dark:ring-emerald-900/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Promotion Complete</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Students moved from <strong>{srcClass} – {srcSection}</strong> → <strong>{tgtClass} – {tgtSection}</strong>
            </p>
            {batchId && (
              <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 font-mono">
                Batch: {batchId}
              </p>
            )}
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <InfoChip icon={UserCheck} label="Promoted"       value={result.successCount} accent="emerald" />
            {result.failCount > 0 && (
              <InfoChip icon={UserX}   label="Failed"         value={result.failCount}    accent="red" />
            )}
            <InfoChip icon={Users}     label="Total Selected" value={result.total}        accent="indigo" />
          </div>

          {/* Granular error details */}
          {errorDetails.length > 0 && (
            <div className="text-left max-w-sm mx-auto mt-4">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Failed Students
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {errorDetails.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/10 ring-1 ring-red-200 dark:ring-red-800/40">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{e.name}</span>
                    <span className="text-red-500 text-[10px] truncate max-w-[180px]">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap mt-2">
            {batchId && result.successCount > 0 && (
              <Button
                variant="secondary"
                onClick={handleUndo}
                loading={promoting}
                className="!rounded-xl text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300"
              >
                <Undo2 className="w-4 h-4" /> Undo Promotion
              </Button>
            )}
            <Button onClick={reset} className="!rounded-xl">
              <RefreshCw className="w-4 h-4" /> Promote Another Batch
            </Button>
          </div>
        </div>
      ) : step === 'preview' ? (
        /* ══════════════════════════════════════════════════ */
        /* STEP: PREVIEW                                     */
        /* ══════════════════════════════════════════════════ */
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-indigo-50/40 dark:from-violet-900/20 dark:to-indigo-900/10 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                    <MoveRight className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Promotion Preview</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {previewRows.length} students will be promoted
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                    {srcClass} – {srcSection}
                  </span>
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                    {tgtClass} – {tgtSection}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    {['Rank', 'Student Name', "Father's Name", 'Old Roll', '%', 'New Roll'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {previewRows.map(s => (
                    <tr key={s.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10">
                      <td className="px-4 py-2.5">
                        {s.rank != null ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-black text-xs ring-1 ring-amber-200 dark:ring-amber-800/40">
                            <Trophy className="w-3 h-3" />#{s.rank}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">
                        {s.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                        {s.father_name || '—'}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-xs text-gray-400 font-mono">
                        {s.roll}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-xs text-gray-500 dark:text-gray-400">
                        {s.pct != null ? `${s.pct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-black text-xs ring-1 ring-indigo-200 dark:ring-indigo-800/40">
                          <Hash className="w-3 h-3" />{s.newRoll}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex gap-3 justify-between">
            <Button variant="secondary" className="!rounded-xl" onClick={() => setStep('config')}>
              ← Back
            </Button>
            <Button
              onClick={handlePromote}
              loading={promoting}
              className="!rounded-xl bg-violet-600 hover:bg-violet-700"
            >
              <ArrowUpCircle className="w-4 h-4" /> Confirm & Promote {previewRows.length} Students
            </Button>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════ */
        /* STEP: CONFIG                                      */
        /* ══════════════════════════════════════════════════ */
        <div className="space-y-5">
          {/* Source + Target selectors */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-gray-50/40 dark:from-gray-800/60 dark:to-gray-800/20 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-500" /> Promotion Settings
              </h3>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                {/* Source */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    From (Source)
                  </p>
                  <Select
                    label="Class"
                    options={classOpts()}
                    value={srcClass}
                    onChange={e => { setSrcClass(e.target.value); setSrcSection('') }}
                  />
                  <Select
                    label="Section"
                    options={srcSectionOpts()}
                    value={srcSection}
                    onChange={e => setSrcSection(e.target.value)}
                    disabled={!srcClass}
                  />
                </div>
                {/* Arrow divider */}
                <div className="flex items-center justify-center pt-7 md:pt-10">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center ring-2 ring-indigo-200 dark:ring-indigo-800/50">
                    <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                {/* Target */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    To (Target)
                  </p>
                  <Select
                    label="Class"
                    options={classOpts()}
                    value={tgtClass}
                    onChange={e => { setTgtClass(e.target.value); setTgtSection('') }}
                  />
                  <Select
                    label="Section"
                    options={tgtSectionOpts()}
                    value={tgtSection}
                    onChange={e => setTgtSection(e.target.value)}
                    disabled={!tgtClass}
                  />
                </div>
              </div>

              {/* Roll config */}
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRoll}
                      onChange={e => {
                        setAutoRoll(e.target.checked)
                        if (!e.target.checked) setStartRoll('1')
                      }}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <Database className="w-4 h-4 text-gray-400" />
                    Auto-detect starting roll
                  </label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {autoRoll
                      ? 'Starts after the highest roll in the target section'
                      : 'Manually set the starting roll number below'}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Starting Roll Number
                    </label>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="1"
                      value={startRoll}
                      onChange={e => {
                        setStartRoll(e.target.value)
                        if (autoRoll) setAutoRoll(false) // manual override disables auto
                      }}
                      placeholder="1"
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Roll 1 → best academic rank, then ascending
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Student list */}
          {srcClass && srcSection && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-indigo-50/40 dark:from-indigo-900/20 dark:to-indigo-900/5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Students — {srcClass} / {srcSection}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {selected.size} of {students.length} selected
                    </p>
                  </div>
                </div>
                {students.length > 0 && (
                  <button
                    onClick={toggleAll}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    {selected.size === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32 gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  <p className="text-sm text-gray-400">Loading students…</p>
                </div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-sm text-gray-400">No active students in this class/section.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selected.size === students.length && students.length > 0}
                            onChange={toggleAll}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                        </th>
                        {['Roll', 'Name', "Father's Name", 'Rank', '%'].map(h => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {students.map(s => {
                        const r = resultMap[s.id]
                        return (
                          <tr
                            key={s.id}
                            onClick={() => toggleOne(s.id)}
                            className={`cursor-pointer transition-colors ${
                              selected.has(s.id)
                                ? 'bg-indigo-50/60 dark:bg-indigo-900/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <td className="px-4 py-2.5">
                              <input
                                type="checkbox"
                                checked={selected.has(s.id)}
                                onChange={() => {}}
                                className="rounded border-gray-300 text-indigo-600 pointer-events-none"
                              />
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-gray-500 text-xs font-mono">
                              {s.roll}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-200">
                              {s.name}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                              {s.father_name || '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              {r?.rank != null ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                                  #{r.rank}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-xs text-gray-400">
                              {r?.percentage != null ? `${r.percentage.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selected.size > 0 && tgtClass && tgtSection && (
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex gap-3 flex-wrap">
                    <InfoChip icon={UserCheck} label="Selected"   value={selected.size}  accent="indigo" />
                    <InfoChip icon={Hash}      label="Start Roll" value={startRollNum}    accent="emerald" />
                  </div>
                  <Button
                    onClick={handlePreview}
                    disabled={!canPreview}
                    className="!rounded-xl"
                  >
                    Preview Promotion <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Warning: no marks data */}
          {students.length > 0 && !hasRanks && !loading && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No marks found for this class. Roll numbers will be assigned in current roll order
                until marks are entered.
              </p>
            </div>
          )}

          {/* Warning: target not selected */}
          {srcClass && srcSection && (!tgtClass || !tgtSection) && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Select a target class and section to continue.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}