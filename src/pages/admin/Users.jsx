// src/pages/admin/Users.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { hashPassword } from '../../lib/security'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { useClasses } from '../../hooks/useSections'
import {
  Plus, Edit2, ShieldOff, ShieldCheck, Lock,
  BookOpen, X, Check, Key, Users as UsersIcon,
  UserPlus, Shield, Clock, Search, ChevronRight,
  Eye, EyeOff, AlertTriangle, CheckCircle2,
  GraduationCap, Pencil, UserCog, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'

// FIX 4.1: Best-effort audit logger
async function logAudit(payload) {
  const { error } = await supabase.from('entry_logs').insert(payload)
  if (error) console.error('[RMS] audit log failed:', error.message, payload)
}

const EMPTY = { user_id: '', name: '', password: '', role: 'teacher', class_access: '', is_active: true }
const roleColor = { admin: 'purple', teacher: 'blue', viewer: 'gray' }

// ── Teacher-Subject Assignment Panel ─────────────────────────
function TeacherSubjectsPanel({ targetUser, schoolId }) {
  const { classes } = useClasses()
  const [selClass,    setSelClass]    = useState('')
  const [subjects,    setSubjects]    = useState([])
  const [assigned,    setAssigned]    = useState([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (!selClass) { setSubjects([]); setAssigned([]); return }
    setLoadingSubs(true)
    Promise.all([
      supabase.from('config').select('subject_name')
        .eq('school_id', schoolId).eq('class_name', selClass).order('display_order'),
      supabase.from('teacher_subjects').select('subject_name')
        .eq('school_id', schoolId).eq('user_id', targetUser.user_id).eq('class_name', selClass),
    ]).then(([{ data: cfg }, { data: ts }]) => {
      setSubjects((cfg || []).map(r => r.subject_name))
      setAssigned((ts || []).map(r => r.subject_name))
      setLoadingSubs(false)
    })
  }, [selClass, schoolId, targetUser])

  const toggle = (sub) => {
    setAssigned(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub])
  }

  const handleSave = async () => {
    setSaving(true)

    // FIX 2.6: Replace non-atomic delete→insert with a two-step upsert + targeted delete.
    // Step 1 — upsert rows that should exist (insert new, ignore already-present).
    // Step 2 — delete only rows that were removed from the assignment list.
    // If step 1 fails we abort before touching deletions, so no data is lost.
    if (assigned.length > 0) {
      const rows = assigned.map(s => ({
        school_id: schoolId, user_id: targetUser.user_id,
        class_name: selClass, subject_name: s,
      }))
      const { error: upsertErr } = await supabase
        .from('teacher_subjects')
        .upsert(rows, { onConflict: 'school_id,user_id,class_name,subject_name', ignoreDuplicates: true })
      if (upsertErr) { toast.error(upsertErr.message); setSaving(false); return }
    }

    // Step 2 — remove subjects that were deselected (those in subjects[] but not in assigned[])
    const removed = subjects.filter(s => !assigned.includes(s))
    if (removed.length > 0) {
      const { error: delErr } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('school_id', schoolId)
        .eq('user_id', targetUser.user_id)
        .eq('class_name', selClass)
        .in('subject_name', removed)
      if (delErr) { toast.error(delErr.message); setSaving(false); return }
    }

    setSaving(false)
    toast.success('Subject assignments saved!')
  }

  const classOpts = [
    { value: '', label: '-- Select Class --' },
    ...classes.map(c => ({ value: c, label: c })),
  ]

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-blue-50/50 to-indigo-50 dark:from-blue-900/20 dark:via-blue-900/15 dark:to-indigo-900/15 border border-blue-200/60 dark:border-blue-800/40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900/40 flex-shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
            Subject assignments for <span className="text-blue-600 dark:text-blue-400">{targetUser.name}</span>
          </p>
          <p className="text-xs text-blue-500/80 dark:text-blue-400/60 mt-0.5">
            If no subjects are assigned, the teacher can access all subjects in their allowed classes.
          </p>
        </div>
      </div>

      <Select label="Select Class" options={classOpts} value={selClass}
        onChange={e => setSelClass(e.target.value)} />

      {selClass && (
        <>
          {loadingSubs ? (
            <div className="flex items-center justify-center h-24">
              <div className="flex flex-col items-center gap-2">
                <div className="h-7 w-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading subjects…</span>
              </div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No subjects configured</p>
              <p className="text-xs text-gray-400 mt-1">
                Add subjects for {selClass} in the configuration first.
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Subjects in {selClass}
                  </p>
                  <div className="flex gap-2">
                    <button className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                      onClick={() => setAssigned([...subjects])}>Select all</button>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <button className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setAssigned([])}>Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {subjects.map(sub => {
                    const checked = assigned.includes(sub)
                    return (
                      <button key={sub} onClick={() => toggle(sub)}
                        className={`
                          flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium text-left
                          transition-all duration-200 group
                          ${checked
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50/50 dark:from-indigo-900/30 dark:to-purple-900/20 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-100 dark:shadow-indigo-900/20'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                          }
                        `}>
                        <div className={`
                          w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200
                          ${checked
                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm'
                            : 'border-2 border-gray-300 dark:border-gray-600 group-hover:border-indigo-300'
                          }
                        `}>
                          {checked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate">{sub}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  {assigned.length === 0 ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>No restrictions — teacher sees all subjects</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span>{assigned.length} of {subjects.length} subject{subjects.length !== 1 ? 's' : ''} assigned</span>
                    </>
                  )}
                </p>
                <Button onClick={handleSave} loading={saving} size="sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save Assignments
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Change Password Modal ─────────────────────────────────────
function ChangePasswordModal({ open, onClose, targetUserId }) {
  const { changePassword } = useAuth()
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [show,    setShow]    = useState(false)

  const reset = () => { setPw(''); setConfirm(''); setSaving(false); setShow(false) }

  const handleSave = async () => {
    if (pw !== confirm) { toast.error('Passwords do not match.'); return }
    if (pw.length < 8)  { toast.error('Minimum 8 characters.'); return }  // FIX 4.4
    setSaving(true)
    const res = await changePassword(targetUserId, pw)
    setSaving(false)
    if (res.success) { toast.success('Password changed!'); reset(); onClose() }
    else toast.error(res.message)
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Change Password" size="sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-200 dark:shadow-amber-900/40">
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Set New Password</h3>
          <p className="text-xs text-gray-400 mt-0.5">For user: <span className="font-semibold text-gray-600 dark:text-gray-300">{targetUserId}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        <Input label="New Password" type={show ? 'text' : 'password'}
          value={pw} onChange={e => setPw(e.target.value)} placeholder="Min. 6 characters" />
        <Input label="Confirm Password" type={show ? 'text' : 'password'}
          value={confirm} onChange={e => setConfirm(e.target.value)} />
        <label className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none group">
          <div className={`
            w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200
            ${show
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm'
              : 'border-2 border-gray-300 dark:border-gray-600 group-hover:border-indigo-300'
            }
          `}>
            {show && <Check className="w-3 h-3 text-white" />}
          </div>
          <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="hidden" />
          Show passwords
        </label>
        {pw && confirm && pw !== confirm && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">Passwords do not match.</p>
          </div>
        )}
        {pw && confirm && pw === confirm && pw.length >= 6 && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-green-600 dark:text-green-400">Passwords match!</p>
          </div>
        )}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
          <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!pw || !confirm}>
            <Lock className="w-3.5 h-3.5" /> Change Password
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Users Page ───────────────────────────────────────────
export default function Users() {
  const { user } = useAuth()
  const [users,         setUsers]         = useState([])
  const [loading,       setLoading]       = useState(false)
  const [modal,         setModal]         = useState({ open: false, mode: 'add', data: { ...EMPTY } })
  const [saving,        setSaving]        = useState(false)
  const [subjectPanel,  setSubjectPanel]  = useState(null)
  const [changePwModal, setChangePwModal] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('user_id,name,role,class_access,is_active,last_login,created_at')
      .eq('school_id', user.school_id)
      .order('created_at')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleSave = async () => {
    setSaving(true)
    const { data: frm } = modal

    const toClassArray = val => {
      if (!val || !String(val).trim()) return null
      return String(val).split(',').map(s => s.trim()).filter(Boolean)
    }

    if (!frm.user_id?.trim()) { toast.error('User ID is required.'); setSaving(false); return }
    if (!frm.name?.trim())    { toast.error('Name is required.');    setSaving(false); return }
    if (modal.mode === 'add' && !frm.password) { toast.error('Password is required.'); setSaving(false); return }
    if (frm.password && frm.password.length < 8) { toast.error('Min 8 characters.'); setSaving(false); return }  // FIX 4.4

    const classAccess = toClassArray(frm.class_access)
    let error

    if (modal.mode === 'add') {
      const hashedPassword = await hashPassword(frm.password)
      const res = await supabase.from('users').insert({
        user_id:      frm.user_id.trim(),
        name:         frm.name.trim(),
        password:     hashedPassword,
        role:         frm.role,
        class_access: classAccess,
        is_active:    frm.is_active,
        school_id:    user.school_id,
      })
      error = res.error
      if (!error) {
        logAudit({ saved_by: user.user_id, school_id: user.school_id,
          action_type: 'USER_CREATE', status: 'Saved',
          notes: `Created user: ${frm.user_id.trim()}` })
      }
    } else {
      const updates = {
        name:         frm.name.trim(),
        role:         frm.role,
        class_access: classAccess,
        is_active:    frm.is_active,
      }
      if (frm.password) updates.password = await hashPassword(frm.password)
      const res = await supabase.from('users').update(updates)
        .eq('user_id', frm.user_id).eq('school_id', user.school_id)
      error = res.error
    }

    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(modal.mode === 'add' ? 'User created!' : 'User updated!')
    setModal(m => ({ ...m, open: false }))
    load()
  }

  const toggleActive = async (u) => {
    const { error } = await supabase.from('users')
      .update({ is_active: !u.is_active })
      .eq('user_id', u.user_id).eq('school_id', user.school_id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(u.is_active ? 'User disabled.' : 'User enabled.')
      logAudit({ saved_by: user.user_id, school_id: user.school_id,
        action_type: u.is_active ? 'USER_DISABLED' : 'USER_ENABLED',
        status: 'Saved', notes: `User: ${u.user_id}` })
      load()
    }
  }

  const roleOpts = [
    { value: 'admin',   label: 'Admin' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'viewer',  label: 'Viewer' },
  ]

  const roleIconMap = { admin: Shield, teacher: GraduationCap, viewer: Eye }
  const roleGradient = {
    admin: 'from-purple-500 to-purple-600',
    teacher: 'from-blue-500 to-blue-600',
    viewer: 'from-gray-400 to-gray-500',
  }

  // Summary counts
  const adminCount = users.filter(u => u.role === 'admin').length
  const teacherCount = users.filter(u => u.role === 'teacher').length
  const activeCount = users.filter(u => u.is_active).length

  return (
    <div className="space-y-6">
      {/* ═══ Page Header — Hero Banner ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 md:p-8 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/30">
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <UserCog className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">User Management</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Manage roles, access, and permissions</p>
            </div>
          </div>

          <Button
            onClick={() => setModal({ open: true, mode: 'add', data: { ...EMPTY } })}
            className="!bg-white !text-indigo-700 hover:!bg-indigo-50 !shadow-lg !shadow-indigo-900/20 !font-semibold !border-0"
          >
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </div>

        {/* Quick stat pills */}
        {users.length > 0 && (
          <div className="relative mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <UsersIcon className="w-4 h-4" />
              <span>{users.length} total users</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <Shield className="w-4 h-4" />
              <span>{adminCount} admin{adminCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <GraduationCap className="w-4 h-4" />
              <span>{teacherCount} teacher{teacherCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeCount} active</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Users Table Card ═══ */}
      <Card>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="h-8 w-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading users…</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200/80 dark:border-gray-700/50">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-800 dark:to-gray-900/80 border-b-2 border-gray-200 dark:border-gray-700">
                  {['User ID','Name','Role','Class Access','Status','Last Login','Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                {users.map((u, i) => {
                  const RoleIcon = roleIconMap[u.role] || UsersIcon
                  const isEven = i % 2 === 0
                  return (
                    <tr key={u.user_id} className={`
                      group transition-all duration-200
                      hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:shadow-sm
                      ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/20'}
                    `}>
                      {/* User ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                          {u.user_id}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleGradient[u.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <span className="text-xs font-bold text-white">
                              {(u.name || '?')[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{u.name}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${roleGradient[u.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                            <RoleIcon className="w-3 h-3 text-white" />
                          </div>
                          <Badge variant={roleColor[u.role] || 'gray'}>{u.role}</Badge>
                        </div>
                      </td>

                      {/* Class Access */}
                      <td className="px-4 py-3">
                        {Array.isArray(u.class_access) && u.class_access.length ? (
                          <div className="flex flex-wrap gap-1">
                            {u.class_access.map(c => (
                              <span key={c} className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-200/60 dark:ring-indigo-800/40">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            All Classes
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-xs font-bold text-red-600 dark:text-red-400">Disabled</span>
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3">
                        {u.last_login ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                              {new Date(u.last_login).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => setModal({ open: true, mode: 'edit', data: {
                              ...u, password: '',
                              class_access: Array.isArray(u.class_access)
                                ? u.class_access.join(', ')
                                : (u.class_access || ''),
                            } })}
                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 flex items-center justify-center transition-all duration-200 hover:scale-110 group/btn"
                            title="Edit User"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500 group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400" />
                          </button>
                          {u.role === 'teacher' && (
                            <button
                              onClick={() => setSubjectPanel(u)}
                              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center transition-all duration-200 hover:scale-110 group/btn"
                              title="Subject Assignments"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-gray-500 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400" />
                            </button>
                          )}
                          <button
                            onClick={() => setChangePwModal(u.user_id)}
                            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 flex items-center justify-center transition-all duration-200 hover:scale-110 group/btn"
                            title="Change Password"
                          >
                            <Key className="w-3.5 h-3.5 text-gray-500 group-hover/btn:text-amber-600 dark:group-hover/btn:text-amber-400" />
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            className={`
                              w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 group/btn
                              ${u.is_active
                                ? 'bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30'
                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                              }
                            `}
                            title={u.is_active ? 'Disable User' : 'Enable User'}
                          >
                            {u.is_active
                              ? <ShieldOff className="w-3.5 h-3.5 text-gray-500 group-hover/btn:text-red-600 dark:group-hover/btn:text-red-400" />
                              : <ShieldCheck className="w-3.5 h-3.5 text-gray-500 group-hover/btn:text-green-600 dark:group-hover/btn:text-green-400" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center shadow-inner">
                          <UsersIcon className="w-7 h-7 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">No users found</p>
                          <p className="text-xs text-gray-400 mt-0.5">Create your first user to get started</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {!loading && users.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between px-1">
            <p className="text-xs text-gray-400 tabular-nums flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="w-3 h-3" />
                {users.length} total
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="inline-flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {activeCount} active
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="inline-flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {users.length - activeCount} disabled
              </span>
            </p>
          </div>
        )}
      </Card>

      {/* ═══ Add / Edit Modal ═══ */}
      <Modal open={modal.open} onClose={() => setModal(m => ({ ...m, open: false }))}
        title={modal.mode === 'add' ? 'Add User' : 'Edit User'} size="md">

        {/* Modal header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center shadow-sm
            ${modal.mode === 'add'
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-200 dark:shadow-indigo-900/40'
              : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200 dark:shadow-amber-900/40'
            }
          `}>
            {modal.mode === 'add'
              ? <UserPlus className="w-6 h-6 text-white" />
              : <Pencil className="w-5 h-5 text-white" />
            }
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white">
              {modal.mode === 'add' ? 'Create New User' : 'Update User Details'}
            </h3>
            <p className="text-xs text-gray-400">
              {modal.mode === 'add' ? 'Set up a new user account with role and access' : 'Modify the user information below'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="User ID" value={modal.data.user_id} disabled={modal.mode === 'edit'}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, user_id: e.target.value } }))} />
          <Input label="Full Name" value={modal.data.name}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
          <Input label={modal.mode === 'edit' ? 'New Password (blank = keep)' : 'Password'}
            type="password" value={modal.data.password}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, password: e.target.value } }))} />
          <Select label="Role" options={roleOpts} value={modal.data.role}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, role: e.target.value } }))} />
          <Input label="Class Access (comma-sep, blank=all)" className="col-span-2"
            placeholder="e.g. Class 9,Class 10" value={modal.data.class_access}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, class_access: e.target.value } }))} />
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            {modal.mode === 'add'
              ? <><UserPlus className="w-4 h-4" /> Create User</>
              : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>
            }
          </Button>
        </div>
      </Modal>

      {/* ═══ Teacher Subject Assignments Modal ═══ */}
      <Modal open={!!subjectPanel} onClose={() => setSubjectPanel(null)}
        title="Teacher Subject Assignments" size="lg">
        {subjectPanel && (
          <TeacherSubjectsPanel targetUser={subjectPanel} schoolId={user.school_id}
            onClose={() => setSubjectPanel(null)} />
        )}
      </Modal>

      {/* ═══ Change Password Modal ═══ */}
      <ChangePasswordModal open={!!changePwModal} onClose={() => setChangePwModal(null)}
        targetUserId={changePwModal} />
    </div>
  )
}