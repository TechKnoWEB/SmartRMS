import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import ForgotPasswordModal from '../components/ForgotPasswordModal'
import {
  GraduationCap, Eye, EyeOff, ArrowRight, Lock, User,
  AlertTriangle, Clock, BookOpen, Shield, CheckCircle2,
  ChevronDown, Building2, ShieldCheck, UserPlus, Search,
  Users, ExternalLink, Info, BarChart3, FileText,
  Globe, ClipboardList, Boxes,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   ROLE CONFIGURATION
   ═══════════════════════════════════════════════════════════════ */
const ROLES = [
  {
    id: 'staff',
    label: 'Staff Login',
    shortLabel: 'Staff',
    icon: Users,
    description: 'Admin & Teacher access',
    gradient: 'from-primary-600 to-primary-700',
    hoverGradient: 'hover:from-primary-700 hover:to-primary-800',
    bgLight: 'bg-primary-50 dark:bg-primary-900/15',
    borderLight: 'border-primary-200 dark:border-primary-800/40',
    textColor: 'text-primary-600 dark:text-primary-400',
    ringColor: 'ring-primary-500/20',
    accentDot: 'bg-primary-500',
  },
  {
    id: 'results',
    label: 'Result Portal',
    shortLabel: 'Results',
    icon: BookOpen,
    description: 'Check student results',
    gradient: 'from-emerald-600 to-teal-600',
    hoverGradient: 'hover:from-emerald-700 hover:to-teal-700',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/15',
    borderLight: 'border-emerald-200 dark:border-emerald-800/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    ringColor: 'ring-emerald-500/20',
    accentDot: 'bg-emerald-500',
  },
  {
    id: 'register',
    label: 'Register School',
    shortLabel: 'Register',
    icon: UserPlus,
    description: 'New school signup',
    gradient: 'from-blue-600 to-indigo-600',
    hoverGradient: 'hover:from-blue-700 hover:to-indigo-700',
    bgLight: 'bg-blue-50 dark:bg-blue-900/15',
    borderLight: 'border-blue-200 dark:border-blue-800/40',
    textColor: 'text-blue-600 dark:text-blue-400',
    ringColor: 'ring-blue-500/20',
    accentDot: 'bg-blue-500',
  },
  {
    id: 'superadmin',
    label: 'Super Admin',
    shortLabel: 'Super',
    icon: Shield,
    description: 'Platform management',
    gradient: 'from-violet-600 to-purple-600',
    hoverGradient: 'hover:from-violet-700 hover:to-purple-700',
    bgLight: 'bg-violet-50 dark:bg-violet-900/15',
    borderLight: 'border-violet-200 dark:border-violet-800/40',
    textColor: 'text-violet-600 dark:text-violet-400',
    ringColor: 'ring-violet-500/20',
    accentDot: 'bg-violet-500',
  },
]

/* ═══════════════════════════════════════════════════════════════
   LEFT PANEL FEATURES (row-style items)
   ═══════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Multi-Class Marks Entry',
    desc: 'Bulk entry with term locking & validation',
  },
  {
    icon: BarChart3,
    title: 'Auto Grade Engine',
    desc: 'Instant grades, percentages & class rankings',
  },
  {
    icon: Globe,
    title: 'Public Result Portal',
    desc: 'Students check results without any login',
  },
  {
    icon: FileText,
    title: 'Report Card Generator',
    desc: 'PDF report cards with school branding',
  },
]

/* ═══════════════════════════════════════════════════════════════
   SCHOOL SELECTOR DROPDOWN
   ═══════════════════════════════════════════════════════════════ */
function SchoolSelector({ value, onChange, label = 'School' }) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    supabase
      .from('schools')
      .select('school_name, school_code, tagline')
      .eq('is_active', true)
      .order('school_name')
      .then(({ data }) => {
        setSchools(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const filtered = schools.filter(
    (s) =>
      !query ||
      s.school_name.toLowerCase().includes(query.toLowerCase()) ||
      s.school_code.includes(query)
  )

  const selected = schools.find((s) => s.school_code === value)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Select ${label.toLowerCase()}`}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left
          transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
          ${open
            ? 'border-primary-500 ring-4 ring-primary-500/15 bg-white dark:bg-gray-800/60'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
          ${open ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-700/50'}`}>
          <Building2 className={`w-4 h-4 transition-colors duration-200
            ${open ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
        </div>
        {loading ? (
          <span className="text-sm text-gray-400 flex-1 flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            Loading schools…
          </span>
        ) : selected ? (
          <span className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 block truncate">
              {selected.school_name}
            </span>
            <span className="text-[11px] font-mono text-gray-400">{selected.school_code}</span>
          </span>
        ) : (
          <span className="text-sm text-gray-400 flex-1">Select your school…</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300
          ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`absolute z-30 top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden
        transition-all duration-200 origin-top
        ${open
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
        <div className="p-2.5 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              autoFocus={open}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search school name or code…"
              aria-label="Search schools"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/60 rounded-lg border border-transparent focus:outline-none focus:border-primary-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-colors"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto overscroll-contain" role="listbox">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 px-4">
              <Search className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm font-medium text-gray-400">No schools found</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Try a different search term</p>
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.school_code}
                type="button"
                role="option"
                aria-selected={s.school_code === value}
                onClick={() => { onChange(s.school_code); setOpen(false); setQuery('') }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150
                  hover:bg-primary-50 dark:hover:bg-primary-900/20
                  focus:outline-none focus-visible:bg-primary-50 dark:focus-visible:bg-primary-900/20
                  ${s.school_code === value ? 'bg-primary-50/70 dark:bg-primary-900/15' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                  ${s.school_code === value
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-md shadow-primary-500/20'
                    : 'bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40'}`}>
                  <GraduationCap className={`w-4 h-4 ${s.school_code === value ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{s.school_name}</p>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">{s.school_code}</p>
                </div>
                {s.school_code === value && <CheckCircle2 className="w-4 h-4 text-primary-500 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   CUSTOM SELECT DROPDOWN (for Class / Section)
   ═══════════════════════════════════════════════════════════════ */
function SelectField({ value, onChange, options, placeholder, icon: Icon, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={label}
        className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
          ${open
            ? 'border-emerald-500 ring-4 ring-emerald-500/15 bg-white dark:bg-gray-800/60'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${open ? 'text-emerald-500' : 'text-gray-400'}`} />
        <span className={`flex-1 text-sm ${selected ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`absolute z-30 top-full mt-1.5 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden
        transition-all duration-200 origin-top
        ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="max-h-48 overflow-y-auto py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                focus:outline-none focus-visible:bg-emerald-50
                ${opt.value === value
                  ? 'font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'text-gray-700 dark:text-gray-300'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROLE TAB SELECTOR
   ═══════════════════════════════════════════════════════════════ */
function RoleTabSelector({ roles, activeRole, onSelect }) {
  const containerRef = useRef(null)
  const [indicatorStyle, setIndicatorStyle] = useState({})

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateIndicator = () => {
      const activeIndex = roles.findIndex((r) => r.id === activeRole)
      const tabs = container.querySelectorAll('[data-role-tab]')
      if (tabs[activeIndex]) {
        const tab = tabs[activeIndex]
        const containerRect = container.getBoundingClientRect()
        const tabRect = tab.getBoundingClientRect()
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeRole, roles])

  return (
    <div className="space-y-3">
      <div className="relative" ref={containerRef}>
        <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl p-1.5 relative">
          <div
            className="absolute top-1.5 h-[calc(100%-12px)] bg-white dark:bg-gray-700 rounded-xl shadow-sm shadow-black/[0.06] dark:shadow-black/20 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ left: indicatorStyle.left ?? 0, width: indicatorStyle.width ?? 0 }}
          />

          {roles.map((role) => {
            const Icon = role.icon
            const isActive = activeRole === role.id
            return (
              <button
                key={role.id}
                data-role-tab
                type="button"
                onClick={() => onSelect(role.id)}
                aria-pressed={isActive}
                aria-label={`Switch to ${role.label}`}
                className={`relative z-10 flex-1 flex flex-col items-center gap-1 px-1 sm:px-3 py-2.5 rounded-xl transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1
                  ${isActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                <Icon className={`w-4 h-4 transition-all duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap
                  ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                  {role.shortLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {roles.map((role) => {
        if (role.id !== activeRole) return null
        const Icon = role.icon
        return (
          <div
            key={`desc-${role.id}`}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl ${role.bgLight} border ${role.borderLight}
              transition-all duration-300`}
            style={{ animation: 'fadeSlideIn 0.25s ease-out' }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${role.accentDot} flex-shrink-0`} />
            <Icon className={`w-3.5 h-3.5 ${role.textColor} flex-shrink-0`} />
            <span className={`text-xs font-bold ${role.textColor}`}>{role.label}</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
              — {role.description}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SUPER ADMIN CARD
   ═══════════════════════════════════════════════════════════════ */
function SuperAdminCard() {
  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 dark:border-violet-800/40 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-900/20 dark:via-gray-800/60 dark:to-purple-900/20 p-5 sm:p-6">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Super Admin Panel</h3>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Platform-wide management access</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-violet-100/50 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-800/30 mb-4">
            <Info className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] sm:text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
              Super Admin uses a separate authentication system with enhanced security protocols and 2FA verification.
            </p>
          </div>

          <Link
            to="/superadmin"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl
              bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700
              text-white text-sm font-bold shadow-md shadow-violet-600/20 hover:shadow-lg hover:shadow-violet-600/30
              focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2
              active:scale-[0.98] transition-all duration-150 group"
          >
            Go to Super Admin Login
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   REGISTER SCHOOL CARD
   ═══════════════════════════════════════════════════════════════ */
function RegisterSchoolCard() {
  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-900/20 dark:via-gray-800/60 dark:to-indigo-900/20 p-5 sm:p-6">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Register Your School</h3>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Get started in under 5 minutes</p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            {[
              { step: '1', text: 'Fill in school details & DISE code' },
              { step: '2', text: 'Set up admin credentials' },
              { step: '3', text: 'Start managing results instantly' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">{item.step}</span>
                </div>
                <span className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 mb-5">
            <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              <span className="font-bold">Free to use</span> — No credit card required. Unlimited students & results.
            </p>
          </div>

          <Link
            to="/register"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl
              bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
              text-white text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              active:scale-[0.98] transition-all duration-150 group"
          >
            Register Now — It's Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   RESULT PORTAL PANEL — School selector only.
   Student picks Class + Section + Roll on the portal itself.
   ═══════════════════════════════════════════════════════════════ */
function ResultPortalPanel({ selectedDise, setSelectedDise, error, setError }) {
  const navigate = useNavigate()
  const currentRole = ROLES.find(r => r.id === 'results')

  const handleGo = (e) => {
    e.preventDefault()
    setError('')
    if (!selectedDise) { setError('Please select your school first.'); return }
    navigate(`/portal?school=${encodeURIComponent(selectedDise)}`)
  }

  return (
    <form onSubmit={handleGo} className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      {/* School */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-3 h-3" />
          School <span className="text-red-400">*</span>
        </label>
        <SchoolSelector value={selectedDise} onChange={setSelectedDise} />
      </div>

      {/* Error */}
      {error && <ErrorBanner error={error} countdown={0} />}

      {/* Go button */}
      <button
        type="submit"
        disabled={!selectedDise}
        className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl mt-2
          bg-gradient-to-r ${currentRole.gradient} ${currentRole.hoverGradient}
          text-white text-sm font-bold
          shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/30
          focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30
          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
          active:scale-[0.98] transition-all duration-150 group`}
      >
        <Search className="w-4 h-4" />
        Go to Result Portal
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Info note */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        <ShieldCheck className="w-3 h-3 text-gray-300 dark:text-gray-600" />
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          No login required · Select class &amp; roll on the next page
        </span>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LOGIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [forgotOpen, setForgotOpen] = useState(false)

  const [activeRole, setActiveRole] = useState('staff')
  const [selectedDise, setSelectedDise] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [focusedField, setFocusedField] = useState(null)

  const [staffForm, setStaffForm] = useState({ userId: '', password: '' })
  const [showPass, setShowPass] = useState(false)

  const timedOut = searchParams.get('reason') === 'timeout'
  const currentRole = ROLES.find((r) => r.id === activeRole)

  useEffect(() => {
    setError('')
  }, [activeRole])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleStaffLogin = async (e) => {
    e.preventDefault()
    if (countdown > 0) return
    setError('')

    if (!selectedDise) { setError('Please select your school.'); return }
    if (!staffForm.userId.trim()) { setError('Please enter your User ID.'); return }
    if (!staffForm.password) { setError('Please enter your password.'); return }

    setLoading(true)
    const res = await login(staffForm.userId.trim(), staffForm.password, selectedDise)
    setLoading(false)

    if (res.success) {
      toast.success(`Welcome back, ${res.user.name}!`)
      navigate('/dashboard')
    } else if (res.rateLimited) {
      const match = res.message.match(/(\d+)s/)
      if (match) setCountdown(parseInt(match[1]))
      setError(res.message)
    } else {
      setError(res.message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-50 dark:bg-gray-950">

      {/* ═══ LEFT BRAND PANEL ═══ */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[48%] relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

        {/* Decorative blurs */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full bg-primary-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white font-black text-base xl:text-lg block leading-tight">Result Management System</span>
              <span className="text-primary-200/70 text-[11px] font-medium">for Primary and High Schools</span>
            </div>
          </div>

          {/* Hero */}
          <div>
            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white leading-[1.1] tracking-tight text-balance">
              Effortless Result
              <br />
              <span className="text-primary-200">Management</span>
            </h1>
            <p className="text-primary-200/90 mt-3 text-sm leading-relaxed max-w-sm">
              From marks entry to report cards — manage every aspect of student results on a single, powerful platform.
            </p>
            <div className="w-12 h-0.5 rounded-full bg-white/20 mt-5 mb-6" />

            {/* ══ FEATURES AS ROWS ══ */}
            <div className="space-y-1 max-w-md">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <div
                    key={f.title}
                    className="group flex items-center gap-1 px-1 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all duration-200 cursor-default"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.08] group-hover:bg-white/[0.14] flex items-center justify-center flex-shrink-0 transition-all duration-200">
                      <Icon className="w-4 h-4 text-primary-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-primary-50 text-xs font-bold">{f.title}</span>
                      <span className="text-primary-300/50 text-xs ml-2 hidden xl:inline">— {f.desc}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-primary-300/30 -rotate-90 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center gap-2 text-primary-300/50 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enterprise-grade security · SOC2 compliant · <strong>Developed by TeamR.</strong> </span>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT LOGIN PANEL ═══ */}
      <div className="flex-1 flex flex-col items-center justify-between px-4 sm:px-6 md:px-8 py-6 sm:py-8 relative min-h-screen overflow-y-auto">
        {/* Background dot pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div />

        <div className="w-full max-w-[420px] relative">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-base text-gray-900 dark:text-white block leading-tight">Smart RMS</span>
              <span className="text-[11px] text-gray-400">Result Management System</span>
            </div>
          </div>

          {/* Welcome header */}
          <div className="mb-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/30 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">Secure Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Welcome</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Choose your access type to continue
            </p>
          </div>

          {/* Role Tabs */}
          <div className="mb-5">
            <RoleTabSelector roles={ROLES} activeRole={activeRole} onSelect={setActiveRole} />
          </div>

          {/* Session timeout banner */}
          {timedOut && activeRole === 'staff' && (
            <div className="flex items-start gap-3 px-3.5 py-3 mb-4 rounded-xl
              bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shadow-sm"
              style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Session Expired</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5 leading-relaxed">
                  You were logged out after 30 minutes of inactivity.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
             TAB CONTENT
             ══════════════════════════════════════════════════════ */}

          {/* ── STAFF LOGIN ── */}
          {activeRole === 'staff' && (
            <form onSubmit={handleStaffLogin} className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
              {/* School */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" />
                  School <span className="text-red-400">*</span>
                </label>
                <SchoolSelector value={selectedDise} onChange={setSelectedDise} />
              </div>

              {/* User ID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  User ID <span className="text-red-400">*</span>
                </label>
                <div className={`relative rounded-xl transition-all duration-200
                  ${focusedField === 'userId' ? `ring-4 ${currentRole.ringColor}` : ''}`}>
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200
                    ${focusedField === 'userId' ? 'text-primary-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={staffForm.userId}
                    onChange={(e) => setStaffForm((f) => ({ ...f, userId: e.target.value }))}
                    onFocus={() => setFocusedField('userId')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your user ID"
                    disabled={countdown > 0}
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                      bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 text-sm font-medium
                      placeholder:text-gray-400 placeholder:font-normal
                      focus:outline-none focus:border-primary-500
                      hover:border-gray-300 dark:hover:border-gray-600
                      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Password <span className="text-red-400">*</span>
                  </label>
                </div>
                <div className={`relative rounded-xl transition-all duration-200
                  ${focusedField === 'password' ? `ring-4 ${currentRole.ringColor}` : ''}`}>
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200
                    ${focusedField === 'password' ? 'text-primary-500' : 'text-gray-400'}`} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    disabled={countdown > 0}
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                      bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 text-sm font-medium
                      placeholder:text-gray-400 placeholder:font-normal
                      focus:outline-none focus:border-primary-500
                      hover:border-gray-300 dark:hover:border-gray-600
                      disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center
                      text-gray-400 hover:text-gray-600 hover:bg-gray-100
                      dark:hover:text-gray-200 dark:hover:bg-gray-700
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-all"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password - right below password field */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors focus:outline-none focus-visible:underline"
                  onClick={() => setForgotOpen(true)}
                >
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && <ErrorBanner error={error} countdown={countdown} />}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || countdown > 0}
                className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl mt-2
                  bg-gradient-to-r ${currentRole.gradient} ${currentRole.hoverGradient}
                  text-white text-sm font-bold
                  shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30
                  focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                  active:scale-[0.98] transition-all duration-150 group`}
              >
                {loading ? (
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : countdown > 0 ? (
                  <><Clock className="w-4 h-4" /> Wait {countdown}s</>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                )}
              </button>
            </form>
          )}

          {/* ── RESULT PORTAL — Server-fetched data ── */}
          {activeRole === 'results' && (
            <ResultPortalPanel
              selectedDise={selectedDise}
              setSelectedDise={setSelectedDise}
              error={error}
              setError={setError}
            />
          )}

          {/* ── REGISTER SCHOOL ── */}
          {activeRole === 'register' && <RegisterSchoolCard />}

          {/* ── SUPER ADMIN ── */}
          {activeRole === 'superadmin' && <SuperAdminCard />}
        </div>

        {/* Footer */}
        <div className="w-full max-w-[420px] relative mt-6">
          <div className="flex items-center gap-3 mb-2.5 justify-center">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800/60" />
            <Shield className="w-3 h-3 text-gray-300 dark:text-gray-600" />
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800/60" />
          </div>
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
            Protected by enterprise-grade security
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
            <p className="text-[10px] text-gray-300 dark:text-gray-600">
              © {new Date().getFullYear()} All rights reserved.
            </p>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800/60 text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-wide">
              RMS v5.0
            </span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />

      {/* Global animation keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ERROR BANNER
   ═══════════════════════════════════════════════════════════════ */
function ErrorBanner({ error, countdown }) {
  return (
    <div
      className="flex items-start gap-3 px-3.5 py-3 rounded-xl
        bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shadow-sm"
      style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
    >
      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-800/30 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-4 h-4 text-red-500" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
        {countdown > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-red-500 font-medium">Locked out</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-800/40 text-xs font-bold text-red-600 dark:text-red-400 tabular-nums">
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-red-200 dark:bg-red-900/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 300) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}