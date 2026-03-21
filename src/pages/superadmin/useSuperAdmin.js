// src/pages/superadmin/useSuperAdmin.js
// Custom hook that owns all super admin data: creds, schools, regs,
// platformStats, loading state, and the load() function.
// The main dashboard and every tab get their data from here.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { callApi } from './saConstants'

export function useSuperAdmin() {
  const [creds,         setCreds]         = useState(null)
  const [regs,          setRegs]          = useState([])
  const [schools,       setSchools]       = useState([])
  const [platformStats, setPlatformStats] = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [initialLoad,   setInitialLoad]   = useState(true)
  const [err,           setErr]           = useState('')
  const [lastRefresh,   setLastRefresh]   = useState(null)
  const [notifConfigured, setNotifConfigured] = useState(false)

  /* ── Notification status check ─────────────────────────────── */
  const checkNotifStatus = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('notification_settings')
        .select('admin_email, notify_new_registration')
        .eq('id', 1)
        .single()
      setNotifConfigured(!!(data?.admin_email && data?.notify_new_registration))
    } catch {
      setNotifConfigured(false)
    }
  }, [])

  /* ── Main data load ─────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!creds) return
    setLoading(true)
    setErr('')
    try {
      const [r1, r2, r3] = await Promise.all([
        supabase.from('school_registrations').select('*').order('created_at', { ascending: false }),
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        callApi('/stats/platform', creds).catch(() => null),
      ])
      if (r1.error) throw r1.error
      if (r2.error) throw r2.error
      setRegs(r1.data    || [])
      setSchools(r2.data || [])
      if (r3) setPlatformStats(r3)
      setLastRefresh(new Date())
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [creds])

  /* ── Auto-load on creds set, then poll every 30s ────────────── */
  useEffect(() => {
    if (!creds) return
    load()
    checkNotifStatus()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [creds, load, checkNotifStatus])

  /* ── Derived counts ─────────────────────────────────────────── */
  const counts = useMemo(() => ({
    pending:      regs.filter(r => r.status === 'pending').length,
    approved:     regs.filter(r => r.status === 'approved').length,
    rejected:     regs.filter(r => r.status === 'rejected').length,
    total:        regs.length,
    active:       schools.filter(s => s.is_active).length,
    inactive:     schools.filter(s => !s.is_active).length,
    totalSchools: schools.length,
    expiring:     schools.filter(s =>
      s.plan_expires_at &&
      new Date(s.plan_expires_at) < new Date(Date.now() + 7 * 86400000) &&
      new Date(s.plan_expires_at) > new Date()
    ).length,
    expired: schools.filter(s =>
      s.plan_expires_at && new Date(s.plan_expires_at) < new Date()
    ).length,
  }), [regs, schools])

  return {
    // Auth
    creds, setCreds,
    // Data
    regs, schools, platformStats, counts,
    // Status
    loading, initialLoad, err, setErr,
    lastRefresh,
    notifConfigured, setNotifConfigured, checkNotifStatus,
    // Actions
    load,
  }
}
