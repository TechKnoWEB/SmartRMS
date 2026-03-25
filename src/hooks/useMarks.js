// src/hooks/useMarks.js
import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from './useOnlineStatus'
import toast from 'react-hot-toast'

// Best-effort audit logger — never throws, always surfaces errors.
async function logAudit(payload) {
  const { error } = await supabase.from('entry_logs').insert(payload)
  if (error) console.error('[RMS] audit log failed:', error.message, payload)
}

// Shared upsert so both saveMarks and the queue drain use identical logic.
async function upsertBatch(batch) {
  return supabase
    .from('marks')
    .upsert(batch, { onConflict: 'student_id,school_id,subject_name,term' })
}

export function useMarks() {
  const { user, canAccessClass } = useAuth()
  const isOnline = useOnlineStatus()

  const [marks,   setMarks]   = useState([])
  const [loading, setLoading] = useState(false)

  // Queue of { batch, auditPayload } objects accumulated while offline
  const saveQueueRef   = useRef([])
  const [queuedCount, setQueuedCount] = useState(0)

  // ── Drain queue when connection is restored ──────────────────
  useEffect(() => {
    if (!isOnline || saveQueueRef.current.length === 0) return

    const items = [...saveQueueRef.current]
    saveQueueRef.current = []
    setQueuedCount(0)

    ;(async () => {
      let synced = 0
      for (const { batch, auditPayload } of items) {
        const { error } = await upsertBatch(batch)
        if (!error) {
          synced++
          logAudit(auditPayload)
        } else {
          console.error('[RMS] queue drain failed:', error.message)
        }
      }
      if (synced > 0) {
        toast.success(
          `${synced} queued save${synced > 1 ? 's' : ''} synced successfully.`,
          { id: 'queue-sync' },
        )
      }
    })()
  }, [isOnline])

  // ── Fetch marks + students ───────────────────────────────────
  const fetchMarks = useCallback(async (className, section, subjectName, term) => {
    if (!canAccessClass(className)) {
      setMarks([]); setLoading(false); return []
    }
    setLoading(true)

    const { data: students } = await supabase
      .from('students').select('id,name,roll')
      .eq('class_name', className).eq('section', section)
      .eq('school_id', user.school_id).order('roll')

    const { data: existing } = await supabase
      .from('marks').select('*')
      .in('student_id', (students || []).map(s => s.id))
      .eq('school_id', user.school_id)
      .eq('subject_name', subjectName).eq('term', term)

    const mMap = {}
    ;(existing || []).forEach(m => { mMap[m.student_id] = m })

    const grid = (students || []).map(stu => ({
      student_id: stu.id, name: stu.name, roll: stu.roll,
      written:  mMap[stu.id] ? (mMap[stu.id].written  || '') : '',
      internal: mMap[stu.id] ? (mMap[stu.id].internal || '') : '',
    }))
    setMarks(grid)
    setLoading(false)
    return grid
  }, [user, canAccessClass])

  // ── Save marks — single batch upsert; queued when offline ───
  const saveMarks = useCallback(async ({ className, section, subjectName, term, marksArr }) => {
    if (!canAccessClass(className))
      return { success: false, message: 'Access denied.' }

    const batch = marksArr.map(row => ({
      student_id:   row.student_id,
      subject_name: subjectName,
      term:         Number(term),
      class_name:   className,
      section,
      school_id:    user.school_id,
      written:      row.written  === '' ? null : row.written,
      internal:     row.internal === '' ? null : row.internal,
    }))

    const auditPayload = {
      saved_by:    user.user_id,
      school_id:   user.school_id,
      action_type: 'MARKS_SAVE',
      class_name:  className,
      section,
      subject:     subjectName,
      term:        Number(term),
      status:      'MODIFIED',
      notes:       `${batch.length} cells saved`,
    }

    // ── Offline: queue and return immediately ─────────────────
    if (!isOnline) {
      saveQueueRef.current = [...saveQueueRef.current, { batch, auditPayload }]
      setQueuedCount(saveQueueRef.current.length)
      return { success: true, queued: true, changedCells: batch.length }
    }

    // ── Online: normal upsert ─────────────────────────────────
    const { error } = await upsertBatch(batch)
    if (error) return { success: false, message: error.message }

    logAudit(auditPayload)
    return { success: true, changedCells: batch.length }
  }, [user, canAccessClass, isOnline])

  // ── Fetch all terms at once (dynamic 1–4 based on school max_terms) ─
  const fetchMarksAllTerms = useCallback(async (className, section, subjectName) => {
    const emptyResult = { t1: [], t2: [], t3: [], t4: [] }
    if (!canAccessClass(className)) return emptyResult

    const { data: schoolData } = await supabase
      .from('schools').select('max_terms')
      .eq('id', user.school_id).single()
    const maxTerms = Math.min(schoolData?.max_terms || 3, 4)
    const termList = Array.from({ length: maxTerms }, (_, i) => i + 1)

    const { data: students } = await supabase
      .from('students').select('id,name,roll')
      .eq('class_name', className).eq('section', section)
      .eq('school_id', user.school_id).order('roll')

    if (!students?.length) return emptyResult

    const { data: allMarks } = await supabase
      .from('marks')
      .select('student_id,term,written,internal')
      .in('student_id', students.map(s => s.id))
      .eq('school_id', user.school_id)
      .eq('subject_name', subjectName)
      .in('term', termList)

    const mMap = {}
    ;(allMarks || []).forEach(m => {
      if (!mMap[m.student_id]) mMap[m.student_id] = {}
      mMap[m.student_id][m.term] = m
    })

    const makeGrid = (term) =>
      students.map(stu => ({
        student_id: stu.id, name: stu.name, roll: stu.roll,
        written:  mMap[stu.id]?.[term]?.written  ?? '',
        internal: mMap[stu.id]?.[term]?.internal ?? '',
      }))

    const result = { t1: makeGrid(1), t2: makeGrid(2), t3: makeGrid(3), t4: [] }
    if (maxTerms >= 4) result.t4 = makeGrid(4)
    return result
  }, [user, canAccessClass])

  return { marks, loading, fetchMarks, fetchMarksAllTerms, saveMarks, isOnline, queuedCount }
}
