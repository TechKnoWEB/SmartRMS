// src/hooks/useMarks.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// FIX 4.1: Best-effort audit logger — never throws, always surfaces errors.
async function logAudit(payload) {
  const { error } = await supabase.from('entry_logs').insert(payload)
  if (error) console.error('[RMS] audit log failed:', error.message, payload)
}

export function useMarks() {
  const { user, canAccessClass } = useAuth()
  const [marks,   setMarks]   = useState([])
  const [loading, setLoading] = useState(false)

  // ── Fetch marks + students ────────────────────────────────
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
      .eq('school_id', user.school_id)   // FIX 2.3: scope to this school
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

  // ── Save marks — single batch upsert (FIX 1.5: was N+1 loop) ─
  const saveMarks = useCallback(async ({ className, section, subjectName, term, marksArr }) => {
    if (!canAccessClass(className))
      return { success: false, message: 'Access denied.' }

    // Build the full batch payload in one pass
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

    const { error } = await supabase
      .from('marks')
      .upsert(batch, { onConflict: 'student_id,school_id,subject_name,term' })

    if (error)
      return { success: false, message: error.message }

    const changedCells = batch.length

    // FIX 4.1: logAudit surfaces errors instead of silently swallowing them
    logAudit({
      saved_by:    user.user_id,
      school_id:   user.school_id,
      action_type: 'MARKS_SAVE',
      class_name:  className,
      section,
      subject:     subjectName,
      term:        Number(term),
      status:      'MODIFIED',
      notes:       `${changedCells} cells saved`,
    })

    return { success: true, changedCells }
  }, [user, canAccessClass])

  // ── Fetch all terms at once (dynamic 1–4 based on school max_terms) ─
  // Single student fetch + single marks fetch filtered by school_id.
  // Returns { t1: [...], t2: [...], t3: [...], t4: [...] } grids (t4 empty if unused).
  const fetchMarksAllTerms = useCallback(async (className, section, subjectName) => {
    const emptyResult = { t1: [], t2: [], t3: [], t4: [] }
    if (!canAccessClass(className)) return emptyResult

    // Fetch school max_terms so we only fetch what's configured
    const { data: schoolData } = await supabase
      .from('schools').select('max_terms')
      .eq('id', user.school_id).single()
    const maxTerms = Math.min(schoolData?.max_terms || 3, 4)
    const termList = Array.from({ length: maxTerms }, (_, i) => i + 1)

    // 1 query: students
    const { data: students } = await supabase
      .from('students').select('id,name,roll')
      .eq('class_name', className).eq('section', section)
      .eq('school_id', user.school_id).order('roll')

    if (!students?.length) return emptyResult

    // 1 query: marks for all active terms
    const { data: allMarks } = await supabase
      .from('marks')
      .select('student_id,term,written,internal')
      .in('student_id', students.map(s => s.id))
      .eq('school_id', user.school_id)
      .eq('subject_name', subjectName)
      .in('term', termList)

    // Index by student+term for O(1) lookup
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

  return { marks, loading, fetchMarks, fetchMarksAllTerms, saveMarks }
}