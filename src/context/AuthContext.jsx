// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, setSessionSchool } from '../lib/supabase'
import { verifyPassword, hashPassword, INACTIVITY_MS,
         canAccessClass as _canAccessClass, filterAllowedClasses } from '../lib/security'

const AuthContext = createContext(null)

const KEY_USER   = 'rms_user'
const KEY_SCHOOL = 'rms_school'
const KEY_EXPIRY = 'rms_session_expiry'

// ─── DB-persisted rate limiting constants ────────────────────
// LOGIN_MAX / LOGIN_LOCK mirror the DB values; the DB is the
// authoritative store — these are only used for the UI countdown.
const LOGIN_MAX  = 5
const LOGIN_LOCK = 5 * 60 * 1000   // 5 minutes in ms

// ── DB rate-limit helpers ────────────────────────────────────
// All reads/writes go to the login_attempts table so limits
// survive page refreshes, new tabs, and non-browser clients.

async function _getLockRecord(userId) {
  if (!supabase) return null
  const { data } = await supabase
    .from('login_attempts')
    .select('attempt_count,locked_until,last_attempt_at')
    .eq('user_id', userId)
    .maybeSingle()
  return data || null
}

async function _recordFailedAttempt(userId) {
  // Upsert: increment count; set locked_until if threshold reached
  const { data: existing } = await supabase
    .from('login_attempts')
    .select('attempt_count')
    .eq('user_id', userId)
    .maybeSingle()

  const count = (existing?.attempt_count ?? 0) + 1
  const lockedUntil = count >= LOGIN_MAX
    ? new Date(Date.now() + LOGIN_LOCK).toISOString()
    : null

  await supabase.from('login_attempts').upsert(
    {
      user_id:        userId,
      attempt_count:  count,
      locked_until:   lockedUntil,
      last_attempt_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return { count, lockedUntil }
}

async function _clearLockRecord(userId) {
  if (!supabase) return
  await supabase.from('login_attempts').delete().eq('user_id', userId)
}

// FIX 2.5: _clearSession moved to module scope — it only touches
// sessionStorage (no React state), so it never needs to be inside the
// component and cannot become stale across renders.
function _clearSession() {
  sessionStorage.removeItem(KEY_USER)
  sessionStorage.removeItem(KEY_SCHOOL)
  sessionStorage.removeItem(KEY_EXPIRY)
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [school,  setSchool]  = useState(null)
  const [loading, setLoading] = useState(true)
  const inactivityTimer       = useRef(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(KEY_USER)
    const sch    = sessionStorage.getItem(KEY_SCHOOL)
    const expiry = sessionStorage.getItem(KEY_EXPIRY)
    if (stored && expiry && Date.now() < parseInt(expiry)) {
      const parsedUser   = JSON.parse(stored)
      const parsedSchool = sch ? JSON.parse(sch) : null
      setUser(parsedUser)
      if (parsedSchool) setSchool(parsedSchool)
      // Re-establish Postgres session school on page reload so RLS
      // school-scoped policies resolve correctly without a fresh login.
      if (parsedSchool?.school_code) {
        setSessionSchool(parsedSchool.school_code).catch(() => {})
      }
    } else {
      _clearSession()
    }
    setLoading(false)
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(() => {
      _clearSession()
      setUser(null)
      setSchool(null)
      window.location.href = '/login?reason=timeout'
    }, INACTIVITY_MS)
  }, [])

  useEffect(() => {
    if (!user) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      return
    }
    const events  = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    const handler = () => {
      sessionStorage.setItem(KEY_EXPIRY, String(Date.now() + INACTIVITY_MS))
      resetInactivityTimer()
    }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetInactivityTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [user, resetInactivityTimer])

  // dise_code is optional. When provided (multi-school login), only the user
  // belonging to that specific school is matched — avoids ambiguity when two
  // schools share the same user_id.
  const login = useCallback(async (userId, password, dise_code = null) => {
    // ── 1. Check DB-persisted lock record ──────────────────
    const lockRec = await _getLockRecord(userId)
    if (lockRec?.locked_until) {
      const remaining = new Date(lockRec.locked_until).getTime() - Date.now()
      if (remaining > 0) {
        const secs = Math.ceil(remaining / 1000)
        return {
          success: false,
          message: `Too many failed attempts. Try again in ${secs}s.`,
          rateLimited: true,
        }
      }
      await _clearLockRecord(userId)
    }

    // ── 2. Fetch matching users ────────────────────────────
    // If dise_code is given: resolve it to a school UUID first, then
    // filter users to that school only — eliminates cross-school ambiguity.
    // If no dise_code: fetch all users with this user_id and match by password.
    let userRows = []
    if (dise_code) {
      // Resolve DISE → school UUID
      const { data: schoolRow } = await supabase
        .from('schools')
        .select('id')
        .eq('school_code', dise_code)
        .eq('is_active', true)
        .single()

      if (schoolRow) {
        const { data } = await supabase
          .from('users')
          .select('user_id,name,role,school_id,class_access,is_active,password')
          .eq('user_id', userId)
          .eq('school_id', schoolRow.id)
        userRows = data || []
      }
    } else {
      const { data } = await supabase
        .from('users')
        .select('user_id,name,role,school_id,class_access,is_active,password')
        .eq('user_id', userId)
      userRows = data || []
    }

    // ── 3. Find match by password verification ─────────────
    let userRow = null
    for (const row of userRows) {
      if (row.is_active && await verifyPassword(password, row.password)) {
        userRow = row
        break
      }
    }

    if (!userRow) {
      const { count, lockedUntil } = await _recordFailedAttempt(userId)
      const attemptsLeft = Math.max(0, LOGIN_MAX - count)
      return {
        success: false,
        message: lockedUntil
          ? `Account locked for 5 minutes after ${LOGIN_MAX} failed attempts.`
          : `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
      }
    }

    // ── 4. FIX 1.2: Upgrade plain-text password on first login ──
    // If the stored hash is not PBKDF2 format, re-hash and save it
    // immediately so the account is secured going forward.
    if (userRow.password && !userRow.password.startsWith('pbkdf2$')) {
      const upgraded = await hashPassword(password)
      await supabase
        .from('users')
        .update({ password: upgraded })
        .eq('user_id', userId)
    }

    // ── 5. Clear lock record on successful login ───────────
    await _clearLockRecord(userId)

    // ── 6. Load school ─────────────────────────────────────
    const { data: schoolRow } = await supabase
      .from('schools').select('*').eq('id', userRow.school_id).single()

    // ── 6a. Establish Postgres session school BEFORE any RLS-gated
    //        query runs. This sets app.school_id so all school-scoped
    //        policies resolve correctly for the lifetime of this session.
    if (schoolRow?.school_code) {
      const ok = await setSessionSchool(schoolRow.school_code)
      if (!ok) {
        return { success: false, message: 'School session could not be established. Contact support.' }
      }
    }

    // FIX 4.2: last_login update — best-effort, non-blocking, but errors surfaced
    supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) console.error('[RMS] last_login update failed:', error.message)
      })

    // ── 7. Persist session ────────────────────────────────
    const expiry = Date.now() + INACTIVITY_MS
    const { password: _pw, ...safeUser } = userRow
    sessionStorage.setItem(KEY_USER,   JSON.stringify(safeUser))
    sessionStorage.setItem(KEY_SCHOOL, JSON.stringify(schoolRow || {}))
    sessionStorage.setItem(KEY_EXPIRY, String(expiry))

    setUser(safeUser)
    setSchool(schoolRow || null)
    resetInactivityTimer()
    return { success: true, user: safeUser }
  }, [resetInactivityTimer])

  const logout = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    _clearSession()
    setUser(null)
    setSchool(null)
  }, [])

  const changePassword = useCallback(async (userId, newPassword) => {
    if (newPassword.length < 8)   // FIX 4.4: raised from 6 to 8 (NIST minimum)
      return { success: false, message: 'Password must be at least 8 characters.' }
    const new_hash = await hashPassword(newPassword)
    const { error } = await supabase.from('users').update({ password: new_hash }).eq('user_id', userId)
    if (error) return { success: false, message: error.message }
    return { success: true }
  }, [])

  // SECURITY FIX: Added 'lock_terms' as an admin-only permission.
  // Previously, the code used can('write') to gate term locking,
  // but 'write' is also granted to teachers. Now lock_terms is
  // exclusively in the admin permission set.
  const can = useCallback((action) => {
    if (!user) return false
    const perms = {
      admin:   ['read', 'write', 'delete', 'publish', 'manage_users', 'analytics', 'lock_terms'],
      teacher: ['read', 'write'],
      viewer:  ['read'],
    }
    return (perms[user.role] || []).includes(action)
  }, [user])

  // SECURITY FIX: Centralized admin check helper. Use can('lock_terms') or
  // isAdmin() for admin-only actions to avoid scattered user.role === 'admin' checks.
  const isAdmin = useCallback(() => {
    return user?.role === 'admin'
  }, [user])

  // FIX 4.3: Delegate to canonical security.js implementations — no duplication.
  const canAccessClass  = useCallback((className)   => _canAccessClass(user, className), [user])
  const getAllowedClasses = useCallback((allClasses) => filterAllowedClasses(user, allClasses), [user])

  return (
    <AuthContext.Provider value={{
      user, school, loading,
      login, logout, changePassword,
      can, isAdmin,
      canAccessClass, getAllowedClasses,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)