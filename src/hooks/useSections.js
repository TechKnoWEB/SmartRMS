// src/hooks/useSections.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// FIX 3.4: Module-level TTL cache shared across all hook instances.
// Survives page navigation. Admin mutations call refresh*() to bust.
const CLASS_CACHE_TTL = 5 * 60 * 1000
const _classCache   = new Map()  // key: school_id
const _sectionCache = new Map()  // key: school_id + class_name

function _cacheGet(map, key) {
  const e = map.get(key)
  if (!e) return null
  if (Date.now() - e.ts > CLASS_CACHE_TTL) { map.delete(key); return null }
  return e.data
}
function _cacheSet(map, key, data) { map.set(key, { data, ts: Date.now() }) }
function _cacheBust(map, key) { map.delete(key) }

/**
 * useSections(className?)
 *
 * Returns distinct sections for the school, optionally filtered by class.
 * Reads from the new `classes` table (sections array column).
 * Falls back to querying students.section if classes table is empty.
 */
export function useSections(className = null) {
  const { user } = useAuth()
  const [sections,        setSections]        = useState([])
  const [sectionsLoading, setSectionsLoading] = useState(false)

  const fetchSections = useCallback(async (bust = false) => {
    if (!user) return
    setSectionsLoading(true)
    const cacheKey = `${user.school_id}_${className || '__all__'}`

    // FIX 3.4: serve from module-level cache when fresh
    if (!bust) {
      const cached = _cacheGet(_sectionCache, cacheKey)
      if (cached) { setSections(cached); setSectionsLoading(false); return }
    } else {
      _cacheBust(_sectionCache, cacheKey)
    }

    let result = []
    if (className) {
      const { data: cls } = await supabase
        .from('classes').select('sections')
        .eq('school_id', user.school_id)
        .eq('class_name', className).single()
      if (cls?.sections?.length) {
        result = [...cls.sections].sort()
      } else {
        const { data } = await supabase.from('students').select('section')
          .eq('school_id', user.school_id)
          .eq('class_name', className).eq('is_active', true)
        result = [...new Set((data || []).map(r => r.section).filter(Boolean))].sort()
      }
    } else {
      const { data: classes } = await supabase.from('classes').select('sections')
        .eq('school_id', user.school_id)
      if (classes?.length) {
        result = [...new Set(classes.flatMap(c => c.sections || []))].sort()
      } else {
        const { data } = await supabase.from('students').select('section')
          .eq('school_id', user.school_id)
        result = [...new Set((data || []).map(r => r.section).filter(Boolean))].sort()
      }
    }

    _cacheSet(_sectionCache, cacheKey, result)
    setSections(result)
    setSectionsLoading(false)
  }, [user, className])

  useEffect(() => { fetchSections() }, [fetchSections])

  const sectionOpts = (placeholder = '-- Section --') => [
    { value: '', label: placeholder },
    ...sections.map(s => ({ value: s, label: `Section ${s}` })),
  ]

  const refreshSections = useCallback(() => fetchSections(true), [fetchSections])
  return { sections, sectionsLoading, sectionOpts, refreshSections }
}

/**
 * useClasses()
 *
 * Returns class names from the `classes` table (authoritative).
 * Falls back to scraping students.class_name if table is empty.
 */
export function useClasses() {
  const { user, getAllowedClasses } = useAuth()
  const [classes,       setClasses]       = useState([])
  const [classesLoading, setClassesLoading] = useState(false)

  const fetchClasses = useCallback(async (bust = false) => {
    if (!user) return
    setClassesLoading(true)
    const cacheKey = user.school_id

    // FIX 3.4: serve from module-level cache when fresh
    if (!bust) {
      const cached = _cacheGet(_classCache, cacheKey)
      if (cached) { setClasses(getAllowedClasses(cached)); setClassesLoading(false); return }
    } else {
      _cacheBust(_classCache, cacheKey)
    }

    const { data } = await supabase
      .from('classes').select('class_name, display_order, sections')
      .eq('school_id', user.school_id)
      .order('display_order', { ascending: true })

    let rawNames
    if (data?.length) {
      rawNames = data.map(r => r.class_name)
    } else {
      const { data: stuData } = await supabase.from('students').select('class_name')
        .eq('school_id', user.school_id)
      rawNames = [...new Set((stuData || []).map(r => r.class_name).filter(Boolean))].sort()
    }

    _cacheSet(_classCache, cacheKey, rawNames)
    setClasses(getAllowedClasses(rawNames))
    setClassesLoading(false)
  }, [user, getAllowedClasses])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const classOpts = (placeholder = '-- Class --') => [
    { value: '', label: placeholder },
    ...classes.map(c => ({ value: c, label: c })),
  ]

  // Call refreshClasses() after any class add/edit/delete to bust the cache
  const refreshClasses = useCallback(() => fetchClasses(true), [fetchClasses])
  return { classes, classesLoading, classOpts, refreshClasses }
}

/**
 * useClassesAdmin()
 *
 * Like useClasses but also returns full class records (with sections array)
 * for use in the Classes management UI in Settings.
 */
export function useClassesAdmin() {
  const { user } = useAuth()
  const [classRecords,  setClassRecords]  = useState([])
  const [classesLoading, setClassesLoading] = useState(false)

  const fetchClasses = useCallback(async () => {
    if (!user) return
    setClassesLoading(true)
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', user.school_id)
      .order('display_order')
    setClassRecords(data || [])
    setClassesLoading(false)
  }, [user])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  return { classRecords, classesLoading, refreshClasses: fetchClasses }
}