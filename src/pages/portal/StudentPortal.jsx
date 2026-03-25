import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { buildStudentResult, rankComparator } from '../../utils/grades'
import ReportCard from '../../components/results/ReportCard'
import SchoolSearch from '../../components/ui/SchoolSearch'
import { HIDE_SCHOOL_LIST } from '../../config'
import {
  Search, GraduationCap, ArrowLeft, ShieldCheck, Loader2,
  ChevronDown, AlertCircle, BookOpen, Users, Hash, Sparkles,
  Calendar, Award, Heart, Building2,
} from 'lucide-react'

const RATE_MAX    = 10
const RATE_WINDOW = 10

// Server-side rate check via Edge Function (fail-open so portal stays usable)
async function checkRateServer(identifier, schoolId) {
  try {
    const base = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '') + '/functions/v1'
    const res = await fetch(`${base}/rms-api/portal/rate-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, school_id: schoolId }),
    })
    if (!res.ok) return { allowed: true }
    return res.json()
  } catch {
    return { allowed: true } // fail-open on network error
  }
}



// ── Inline school picker shown when /portal is visited without ?school= ──
function SchoolPicker({ onSelect }) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(!HIDE_SCHOOL_LIST)
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (HIDE_SCHOOL_LIST) return   // skip bulk fetch in secure mode
    supabase
      .from('schools')
      .select('school_name, school_code, tagline, academic_session')
      .eq('is_active', true)
      .order('school_name')
      .then(({ data }) => { setSchools(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = schools.filter(s =>
    !query ||
    s.school_name.toLowerCase().includes(query.toLowerCase()) ||
    s.school_code.includes(query)
  )

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4">
      {/* Background dots */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Student Result Portal</h1>
          <p className="mt-1.5 text-sm text-slate-500">Select your school to check results</p>
        </div>

        {/* School selector */}
        <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
          {HIDE_SCHOOL_LIST ? (
            <SchoolSearch
              onSelect={onSelect}
              placeholder="Enter your school name or school code to search…"
            />
          ) : (
            <div className="relative" ref={ref}>
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all
                  ${open
                    ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-white'
                    : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-white'}`}
              >
                <Building2 className={`w-5 h-5 flex-shrink-0 transition-colors ${open ? 'text-indigo-500' : 'text-slate-400'}`} />
                {loading
                  ? <span className="flex-1 text-sm text-slate-400 flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
                      Loading schools…
                    </span>
                  : <span className="flex-1 text-sm text-slate-400">Select your school…</span>
                }
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="absolute z-20 top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search school name or School code…"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 rounded-lg border border-transparent focus:outline-none focus:border-indigo-400 text-slate-900 placeholder-slate-400"
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {schools.filter(s =>
                      !query ||
                      s.school_name.toLowerCase().includes(query.toLowerCase()) ||
                      s.school_code.includes(query)
                    ).length === 0
                      ? <p className="text-center text-sm text-slate-400 py-8">No schools found</p>
                      : schools.filter(s =>
                          !query ||
                          s.school_name.toLowerCase().includes(query.toLowerCase()) ||
                          s.school_code.includes(query)
                        ).map(s => (
                          <button
                            key={s.school_code}
                            type="button"
                            onClick={() => onSelect(s.school_code)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-indigo-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{s.school_name}</p>
                              <p className="text-[11px] font-mono text-slate-400">{s.school_code}</p>
                            </div>
                          </button>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-[11px] text-slate-400">
            Or use the direct link your school provided
          </p>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3 w-3" />
          Secure · No login required
        </p>
      </div>
    </div>
  )
}

// ── Main Portal ──────────────────────────────────────────────
export default function StudentPortal() {
  const [diseCode,  setDiseCode]  = useState(() => new URLSearchParams(window.location.search).get('school') || '')
  const [school,    setSchool]    = useState(null)
  const [schoolId,  setSchoolId]  = useState(null)
  const [classes,   setClasses]   = useState([])
  const [sections,  setSections]  = useState([])
  const [form,      setForm]      = useState({ class_name: '', section: '', roll: '' })
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [mounted,   setMounted]   = useState(false)
  const [resolving, setResolving] = useState(false)

  const step = !form.class_name ? 0 : !form.section ? 1 : 2

  // When user picks a school from the picker, update URL so it's shareable
  const handleSchoolPick = (code) => {
    const url = new URL(window.location.href)
    url.searchParams.set('school', code)
    window.history.replaceState({}, '', url.toString())
    setDiseCode(code)
  }

  // Resolve DISE code → school row + published classes
  useEffect(() => {
    setMounted(true)
    if (!diseCode) return  // show picker instead

    // Validate format
    if (!/^\d{11,12}$/.test(diseCode)) {
      setError(`Invalid school code "${diseCode}". Expected 11 or 12 digits.`)
      return
    }

    setResolving(true)
    setError('')
    setSchool(null)
    setSchoolId(null)
    setClasses([])
    setForm({ class_name: '', section: '', roll: '' })

    supabase
      .from('schools')
      .select('id, school_name, tagline, academic_session, school_code')
      .eq('school_code', diseCode)
      .eq('is_active', true)
      .single()
      .then(({ data: schoolRow, error: schoolErr }) => {
        if (schoolErr || !schoolRow) {
          setError('School not found or inactive. Please check the link.')
          setResolving(false)
          return
        }
        setSchool(schoolRow)
        setSchoolId(schoolRow.id)

        supabase
          .from('publish_settings')
          .select('class_name')
          .eq('school_id', schoolRow.id)
          .eq('is_published', true)
          .then(({ data }) => {
            if (data?.length) {
              const sorted = [...new Set(data.map(r => r.class_name))].sort((a, b) => {
                const na = parseInt(a), nb = parseInt(b)
                return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b)
              })
              setClasses(sorted)
            }
            setResolving(false)
          })
      })
  }, [diseCode])

  // Fetch sections when class changes
  useEffect(() => {
    if (!form.class_name || !schoolId) { setSections([]); return }
    supabase
      .from('students')
      .select('section')
      .eq('class_name', form.class_name)
      .eq('school_id', schoolId)
      .then(({ data }) => {
        setSections([...new Set(data?.map(r => r.section) || [])].sort())
      })
  }, [form.class_name, schoolId])



  const handleSearch = async (e) => {
    e.preventDefault()
    setError(''); setResult(null)
    const { class_name, section, roll } = form
    if (!class_name || !section || !roll) { setError('Please complete all fields.'); return }
    if (!schoolId) { setError('School not identified. Please select a school first.'); return }

    setLoading(true)
    try {
      const rate = await checkRateServer(`${schoolId}_${class_name}_${section}_${roll}`, schoolId)
      if (!rate.allowed) throw new Error(`Too many attempts. Retry in ${rate.resetMinutes ?? RATE_WINDOW}m.`)

      const { data: pub } = await supabase
        .from('publish_settings').select('*')
        .eq('school_id', schoolId)
        .eq('class_name', class_name).eq('section', section.toUpperCase())
        .eq('is_published', true).single()
      if (!pub) throw new Error('Results for this class are not published yet.')

      const { data: students } = await supabase
        .from('students').select('*')
        .eq('school_id', schoolId)
        .eq('class_name', class_name).eq('section', section.toUpperCase())
        .eq('roll', parseInt(roll))
      if (!students?.length) throw new Error('Student not found. Check your roll number.')

      const stu = students[0]
      const [{ data: cfgRows }, { data: mRows }] = await Promise.all([
        supabase.from('config').select('*')
          .eq('school_id', schoolId)
          .eq('class_name', class_name).order('display_order'),
        supabase.from('marks').select('*')
          .eq('school_id', schoolId)
          .eq('student_id', stu.id),
      ])
      if (!cfgRows?.length) throw new Error('Result configuration missing.')

      const built = buildStudentResult(stu, cfgRows, mRows || [])
      built.show_ranks     = pub.show_ranks
      built.allow_download = pub.allow_download

      if (pub.show_ranks) {
        const { data: allStudents } = await supabase
          .from('students').select('*')
          .eq('school_id', schoolId)
          .eq('class_name', class_name).eq('section', section.toUpperCase())

        const { data: allMarks } = await supabase
          .from('marks').select('*')
          .eq('school_id', schoolId)
          .in('student_id', (allStudents || []).map(s => s.id))

        const marksByStudent = {}
        ;(allMarks || []).forEach(m => {
          if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = []
          marksByStudent[m.student_id].push(m)
        })

        const all = (allStudents || []).map(s =>
          buildStudentResult(s, cfgRows, marksByStudent[s.id] || [])
        )
        all.sort(rankComparator)
        const me = all.find(r => r.student.id === stu.id)
        if (me) {
          built.rank           = all.indexOf(me) + 1
          built.total_students = all.length
        }
      }

      setResult({ result: built, school })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── No school in URL → show picker ─────────────────────────
  if (!diseCode) {
    return <SchoolPicker onSelect={handleSchoolPick} />
  }

  // ── Result view ─────────────────────────────────────────────
  if (result) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h1 className="truncate text-lg font-bold text-slate-800">
                {school?.school_name || 'Result Portal'}
              </h1>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:flex">
              <Calendar className="h-3.5 w-3.5" />
              <span>Session {school?.academic_session || '2026-27'}</span>
            </div>
          </div>
        </nav>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => { setResult(null); setError('') }}
                className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Back
              </button>
              <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium ring-1 ring-indigo-100">
                <Award className="h-4 w-4 text-indigo-500" />
                <span className="text-indigo-700">{result.result.student?.name}</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
              <ReportCard
                result={result.result}
                school={result.school}
                showActions
                allowDownload={result.result.allow_download !== false}
              />
            </div>
          </div>
        </main>
      </div>
    )
  }

  const formReady = form.class_name && form.section && form.roll

  // ── Search view ─────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Navbar */}
      <nav className="z-50 w-full border-b border-slate-100 bg-white px-4">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <h1 className="truncate text-base font-bold text-slate-800">
              {resolving ? 'Loading…' : school?.school_name || 'Result Portal'}
            </h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 sm:flex">
            <Calendar className="h-3 w-3" />
            <span>{school?.academic_session || '2025-26'}</span>
          </div>
        </div>
      </nav>

      <div className="relative flex flex-1 flex-col lg:flex-row overflow-hidden">

        {/* Left panel — branding */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 lg:flex">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-violet-100/40 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.015]"
              style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>
          <div className={`relative z-10 max-w-md px-12 transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-indigo-100/80 ring-1 ring-indigo-100/50">
              <GraduationCap className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
              Student<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Result Portal
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              Access your academic results instantly. View grades, download report cards, and track your performance.
            </p>
            <div className="mt-8 flex items-center gap-3">
              {[
                { icon: <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />, label: 'Online' },
                { icon: <ShieldCheck className="h-3 w-3 text-indigo-400" />, label: 'Secure' },
                { icon: <Sparkles className="h-3 w-3 text-amber-400" />, label: 'Instant' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-100">
                  {icon} {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 lg:max-w-lg lg:border-l lg:border-slate-100 lg:px-10 overflow-y-auto">
          <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>

            {/* Header */}
            <div className="mb-6 text-center lg:mb-8 lg:text-left">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 lg:mx-0">
                <Search className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 lg:text-2xl">Find Your Result</h3>
              <p className="mt-1.5 text-sm text-slate-400">
                {school ? `${school.school_name}` : 'Select class, section & roll number'}
              </p>
            </div>

            {/* Resolving spinner */}
            {resolving && (
              <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 mb-4">
                <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                <span className="text-sm text-indigo-600 font-medium">Loading school data…</span>
              </div>
            )}

            {/* Hard error (invalid code / school not found) */}
            {error && !schoolId && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-xs font-semibold text-red-600">{error}</p>
                  <button
                    onClick={() => {
                      const url = new URL(window.location.href)
                      url.searchParams.delete('school')
                      window.history.replaceState({}, '', url.toString())
                      setDiseCode('')
                      setError('')
                    }}
                    className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                  >
                    ← Pick a different school
                  </button>
                </div>
              </div>
            )}

            {/* Progress steps */}
            {schoolId && (
              <div className="mb-6 flex items-center justify-center gap-1.5 lg:justify-start">
                {[0, 1, 2].map(s => (
                  <div key={s}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      step > s ? 'w-10 bg-indigo-500' : step === s ? 'w-10 bg-indigo-300' : 'w-6 bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}

            {schoolId && (
              <form onSubmit={handleSearch} className="space-y-4">

                {/* Class */}
                <div className="relative">
                  <BookOpen className={`absolute left-3.5 top-3 h-4 w-4 transition-colors ${form.class_name ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <select
                    value={form.class_name}
                    onChange={e => setForm({ class_name: e.target.value, section: '', roll: '' })}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition-all hover:border-indigo-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>

                {/* Section */}
                <div className={`relative transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
                  <Users className={`absolute left-3.5 top-3 h-4 w-4 transition-colors ${form.section ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <select
                    value={form.section}
                    onChange={e => setForm(f => ({ ...f, section: e.target.value, roll: '' }))}
                    disabled={!form.class_name}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition-all hover:border-indigo-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Section</option>
                    {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>

                {/* Roll Number */}
                <div className={`relative transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
                  <Hash className={`absolute left-3.5 top-3 h-4 w-4 transition-colors ${form.roll ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <input
                    type="number"
                    placeholder="Roll Number"
                    value={form.roll}
                    onChange={e => setForm(f => ({ ...f, roll: e.target.value }))}
                    disabled={!form.section}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition-all hover:border-indigo-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Search error */}
                {error && schoolId && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/60 px-3.5 py-3"
                    style={{ animation: 'shake .3s ease' }}>
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-xs font-medium leading-relaxed text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !formReady}
                  className={`group relative mt-2 w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold transition-all duration-300 ${
                    formReady && !loading
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25 active:scale-[0.98]'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  {formReady && !loading && (
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
                      : <><Search className="h-4 w-4" /> Get Result</>}
                  </span>
                </button>
              </form>
            )}

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400 lg:justify-start">
              <ShieldCheck className="h-3 w-3" />
              <span>Secure · {RATE_MAX} lookups per {RATE_WINDOW} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="z-50 w-full border-t border-slate-100 bg-white px-4">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between">
          <p className="flex items-center gap-1 text-[10px] text-slate-400">
            Made with <Heart className="h-2.5 w-2.5 text-rose-400" /> for students | <strong>Developed by TeamR.</strong>
          </p>
          <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </footer>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          25%      { transform: translateX(-4px) }
          75%      { transform: translateX(4px) }
        }
      `}</style>
    </div>
  )
}
