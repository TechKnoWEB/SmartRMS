// src/pages/register/RegisterSchool.jsx
//
// Public 2-step school registration form.
// Hashes the admin password (PBKDF2) client-side before inserting into
// school_registrations. A super admin approves via /superadmin.

import { useState } from 'react'
import { supabase }      from '../../lib/supabase'
import { hashPassword }  from '../../lib/security'
import {
  GraduationCap, School, User, Mail, Phone, MapPin,
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle,
  Loader2, ArrowRight, ArrowLeft, ShieldCheck, BookOpen, Sparkles, Hash,
} from 'lucide-react'

const SESSIONS = ['2025-26','2026-27', '2027-28', '2028-29']

const EMPTY = {
  school_name: '', tagline: '', address: '', school_code: '',
  academic_session: '2025-26', contact_email: '', contact_phone: '',
  admin_user_id: '', admin_name: '', password: '', confirm: '',
}

function Inp({ icon: Icon, error, ...rest }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />}
      <input {...rest}
        className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
          ${error ? 'border-red-300 dark:border-red-700 focus:ring-red-400/30' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-400/30 focus:border-indigo-400'}`} />
    </div>
  )
}

function Field({ label, required, hint, err, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !err && <p className="text-[11px] text-gray-400">{hint}</p>}
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  )
}

export default function RegisterSchool() {
  const [form,    setForm]    = useState(EMPTY)
  const [errs,    setErrs]    = useState({})
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const [apiErr,  setApiErr]  = useState('')

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: '' })) }

  const v1 = () => {
    const e = {}
    if (!form.school_name.trim())  e.school_name = 'School name required.'
    if (!form.school_code.trim())  e.school_code = 'DISE code required.'
    else if (!/^\d{11,12}$/.test(form.school_code.trim())) e.school_code = 'Must be 11 digits.'
    if (!form.contact_email.trim()) e.contact_email = 'Contact email required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = 'Invalid email.'
    return e
  }

  const v2 = () => {
    const e = {}
    if (!form.admin_name.trim())    e.admin_name = 'Full name required.'
    if (!form.admin_user_id.trim()) e.admin_user_id = 'User ID required.'
    else if (!/^[a-zA-Z0-9_.\-]{3,30}$/.test(form.admin_user_id))
      e.admin_user_id = 'Letters, numbers, _ . - only (3–30 chars).'
    if (form.password.length < 8)  e.password = 'Minimum 8 characters.'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  const next = () => {
    const e = v1(); if (Object.keys(e).length) { setErrs(e); return }
    setStep(2)
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = v2(); if (Object.keys(e).length) { setErrs(e); return }
    setLoading(true); setApiErr('')
    try {
      const hash = await hashPassword(form.password)
      const { error } = await supabase.from('school_registrations').insert({
        school_name:        form.school_name.trim(),
        tagline:            form.tagline.trim() || null,
        address:            form.address.trim() || null,
        school_code:        form.school_code.trim(),
        academic_session:   form.academic_session,
        contact_email:      form.contact_email.trim().toLowerCase(),
        contact_phone:      form.contact_phone.trim() || null,
        admin_user_id:      form.admin_user_id.trim().toLowerCase(),
        admin_name:         form.admin_name.trim(),
        admin_password_hash: hash,
        status:             'pending',
      })
      if (error) throw error
      setDone(true)
    } catch (err) {
      setApiErr(err.message || 'Submission failed.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success ───────────────────────────────────────────────
  if (done) return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <div className="text-center max-w-md">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-400/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Registration Submitted!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong className="text-gray-800 dark:text-gray-200">{form.school_name}</strong> is pending review.
          You'll hear at <strong>{form.contact_email}</strong> once approved.
        </p>
        <a href="/login"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all">
          <ArrowRight className="w-4 h-4" />Back to Login
        </a>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700 px-10 py-12 relative overflow-hidden flex-shrink-0">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
        </div>
        <div className="relative z-10 text-white">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6 shadow-inner">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black leading-tight mb-4">Register Your<br /><span className="text-indigo-200">School</span></h2>
          <p className="text-sm text-white/70 leading-relaxed mb-8">Manage student results, generate report cards, and share with parents — all in one place.</p>
          {[
            { icon: ShieldCheck, text: 'Secure, school-isolated data' },
            { icon: BookOpen,    text: 'Full marks & report card management' },
            { icon: Sparkles,    text: 'Instant parent-facing result portal' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-white/80 mb-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>{text}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === s ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : step > s ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                  {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-xs font-bold ${step === s ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
                  {s === 1 ? 'School Info' : 'Admin Account'}
                </span>
                {s < 2 && <div className={`w-10 h-0.5 rounded ${step > s ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-gray-950/50 p-6 sm:p-8">

            {step === 1 ? (
              <>
                <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">School Information</h2>
                <p className="text-sm text-gray-400 mb-6">Tell us about your school</p>
                <div className="space-y-4">
                  <Field label="School Name" required err={errs.school_name}>
                    <Inp icon={School} type="text" placeholder="e.g. St. Xavier's High School"
                      value={form.school_name} onChange={e => set('school_name', e.target.value)} error={errs.school_name} />
                  </Field>
                  <Field label="DISE Code" required hint="11-digit code from the UDISE portal" err={errs.school_code}>
                    <Inp icon={Hash} type="text" placeholder="e.g. 27150100101"
                      value={form.school_code} onChange={e => set('school_code', e.target.value.replace(/\D/g, ''))} error={errs.school_code} maxLength={12} />
                  </Field>
                  <Field label="Tagline / Motto" hint="Optional — shown on report cards">
                    <Inp icon={Sparkles} type="text" placeholder="e.g. Excellence in Education"
                      value={form.tagline} onChange={e => set('tagline', e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Contact Email" required err={errs.contact_email}>
                      <Inp icon={Mail} type="email" placeholder="principal@school.edu"
                        value={form.contact_email} onChange={e => set('contact_email', e.target.value)} error={errs.contact_email} />
                    </Field>
                    <Field label="Phone" hint="Optional">
                      <Inp icon={Phone} type="tel" placeholder="+91 98765 43210"
                        value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Address" required>
                    <Inp icon={MapPin} type="text" placeholder="123 School Road, City"
                      value={form.address} onChange={e => set('address', e.target.value)} />
                  </Field>
                  <Field label="Academic Session" required>
                    <select value={form.academic_session} onChange={e => set('academic_session', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400">
                      {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <button onClick={next}
                  className="mt-7 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all">
                  Next: Admin Account <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <form onSubmit={submit}>
                <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">Admin Account</h2>
                <p className="text-sm text-gray-400 mb-6">These credentials will log in to RMS</p>
                <div className="space-y-4">
                  <Field label="Full Name" required err={errs.admin_name}>
                    <Inp icon={User} type="text" placeholder="e.g. Rajesh Kumar"
                      value={form.admin_name} onChange={e => set('admin_name', e.target.value)} error={errs.admin_name} />
                  </Field>
                  <Field label="Login User ID" required hint="Letters, numbers, _ . - (3–30 chars)" err={errs.admin_user_id}>
                    <Inp icon={User} type="text" placeholder="e.g. admin_stxavier"
                      value={form.admin_user_id} onChange={e => set('admin_user_id', e.target.value.toLowerCase())} error={errs.admin_user_id} />
                  </Field>
                  <Field label="Password" required hint="Minimum 8 characters" err={errs.password}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input type={showPw ? 'text' : 'password'} value={form.password}
                        onChange={e => set('password', e.target.value)} placeholder="••••••••"
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          errs.password ? 'border-red-300 focus:ring-red-400/30' : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-400/30 focus:border-indigo-400'}`} />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm Password" required err={errs.confirm}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input type={showPw ? 'text' : 'password'} value={form.confirm}
                        onChange={e => set('confirm', e.target.value)} placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
                    </div>
                  </Field>
                </div>
                {apiErr && (
                  <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600 dark:text-red-400">{apiErr}</p>
                  </div>
                )}
                <div className="mt-7 flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                    <ArrowLeft className="w-4 h-4" />Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {loading ? 'Submitting…' : 'Submit Registration'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">
            Already have an account?
            <a href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}