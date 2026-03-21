// src/hooks/useStudents.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// FIX 4.1: Best-effort audit logger
async function logAudit(payload) {
  const { error } = await supabase.from('entry_logs').insert(payload)
  if (error) console.error('[RMS] audit log failed:', error.message, payload)
}

export function useStudents() {
  const { user, canAccessClass } = useAuth()
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(false)

  // ── Fetch ─────────────────────────────────────────────────
  const fetchStudents = useCallback(async (className, section) => {
    if (!className) return []
    if (!canAccessClass(className)) return []
    setLoading(true)
    let q = supabase
      .from('students').select('*')
      .eq('class_name', className)
      .eq('school_id', user.school_id)
      .order('roll')
    if (section) q = q.eq('section', section)
    const { data } = await q
    setStudents(data || [])
    setLoading(false)
    return data || []
  }, [user, canAccessClass])

  // ── Add ───────────────────────────────────────────────────
  const addStudent = useCallback(async (payload) => {
    if (!canAccessClass(payload.class_name))
      return { success: false, message: 'Access denied.' }
    const { error } = await supabase.from('students').insert({
      ...payload, school_id: user.school_id,
    })
    if (error) return { success: false, message: error.message }
    logAudit({ saved_by: user.user_id, school_id: user.school_id,
      action_type: 'STUDENT_ADD', class_name: payload.class_name, status: 'Saved' })
    return { success: true }
  }, [user, canAccessClass])

  // ── Update ────────────────────────────────────────────────
  const updateStudent = useCallback(async (id, payload) => {
    if (!canAccessClass(payload.class_name))
      return { success: false, message: 'Access denied.' }
    const { error } = await supabase.from('students').update(payload).eq('id', id)
    if (error) return { success: false, message: error.message }
    logAudit({ saved_by: user.user_id, school_id: user.school_id,
      action_type: 'STUDENT_UPDATE', class_name: payload.class_name, status: 'Saved' })
    return { success: true }
  }, [user, canAccessClass])

  // ── Delete ────────────────────────────────────────────────
  const deleteStudent = useCallback(async (id, className) => {
    if (className && !canAccessClass(className))
      return { success: false, message: 'Access denied.' }

    // Count marks first (for cascade info)
    const { count: marksCount } = await supabase
      .from('marks').select('*', { count: 'exact', head: true })
      .eq('student_id', id)

    const { error } = await supabase.from('students').delete().eq('id', id)
    if (error) return { success: false, message: error.message }

    logAudit({ saved_by: user.user_id, school_id: user.school_id,
      action_type: 'STUDENT_DELETE', class_name: className, status: 'Saved',
      notes: `${marksCount || 0} marks records also deleted` })

    return { success: true, marksDeleted: marksCount || 0 }
  }, [user, canAccessClass])

  // ── Bulk import ───────────────────────────────────────────
  const bulkImport = useCallback(async (studentsArr) => {
    const blocked = studentsArr.find(s => !canAccessClass(s.class_name))
    if (blocked)
      return { success: false, message: `Access denied for class: ${blocked.class_name}` }

    const rows = studentsArr.map(s => ({ ...s, school_id: user.school_id }))
    const { error } = await supabase.from('students').insert(rows)
    if (error) return { success: false, message: error.message }

    logAudit({ saved_by: user.user_id, school_id: user.school_id,
      action_type: 'STUDENT_ADD', status: 'Saved',
      notes: `Bulk import: ${rows.length} students` })

    return { success: true, count: rows.length }
  }, [user, canAccessClass])

  // ── Bulk Delete ───────────────────────────────────────────
  const bulkDelete = useCallback(async (studentIds, className) => {
    if (className && !canAccessClass(className))
      return { success: false, message: 'Access denied.' }
    if (!studentIds || studentIds.length === 0)
      return { success: false, message: 'No students selected.' }

    const { error } = await supabase
      .from('students').delete().in('id', studentIds)
      .eq('school_id', user.school_id)
    if (error) return { success: false, message: error.message }

    logAudit({ saved_by: user.user_id, school_id: user.school_id,
      action_type: 'STUDENT_DELETE', class_name: className, status: 'Saved',
      notes: `Bulk delete: ${studentIds.length} students` })

    return { success: true, count: studentIds.length }
  }, [user, canAccessClass])

  // ── Marks count (for delete cascade preview) ──────────────
  const getMarksCount = useCallback(async (studentId) => {
    const { count } = await supabase
      .from('marks').select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
    return count || 0
  }, [])

  return {
    students, loading,
    fetchStudents, addStudent, updateStudent,
    deleteStudent, bulkImport, bulkDelete, getMarksCount,
  }
}
