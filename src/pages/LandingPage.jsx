// src/pages/LandingPage.jsx
// Aesthetic direction: Editorial / Institutional — like a premium academic journal
// meets a modern SaaS product. Deep navy + warm gold accents. Playfair Display
// headlines. Clean grid. Subtle grain texture. Feels authoritative but alive.

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, BarChart2, FileText, Users, Lock,
  ArrowRight, CheckCircle, Star, Globe, Zap, Shield,
  BookOpen, Award, TrendingUp, ChevronDown, Menu, X,
  ClipboardList, Calendar, ArrowUpCircle, Settings,
} from 'lucide-react'

// ── Animated counter hook ─────────────────────────────────────
function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let frame = 0
    const totalFrames = Math.round(duration / 16)
    const timer = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (frame >= totalFrames) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, start])
  return count
}

// ── Intersection observer hook ────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ value, suffix = '', label, duration = 1800, startCount }) {
  const count = useCounter(value, duration, startCount)
  return (
    <div className="text-center">
      <p className="text-5xl font-black text-white tabular-nums leading-none tracking-tight">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-indigo-300 uppercase tracking-widest">{label}</p>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, accent, delay = 0 }) {
  const [ref, inView] = useInView()
  const accents = {
    indigo: { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', border: 'border-indigo-500/20' },
    amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-400',  border: 'border-amber-500/20' },
    emerald:{ bg: 'bg-emerald-500/10',icon: 'text-emerald-400',border: 'border-emerald-500/20' },
    violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400', border: 'border-violet-500/20' },
    rose:   { bg: 'bg-rose-500/10',   icon: 'text-rose-400',   border: 'border-rose-500/20' },
    teal:   { bg: 'bg-teal-500/10',   icon: 'text-teal-400',   border: 'border-teal-500/20' },
  }
  const a = accents[accent] || accents.indigo
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative p-6 rounded-2xl border ${a.border} bg-white/[0.03] backdrop-blur-sm
        hover:bg-white/[0.06] transition-all duration-500 cursor-default
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        transition-[opacity,transform] ease-out`}
    >
      <div className={`inline-flex w-12 h-12 rounded-xl ${a.bg} items-center justify-center mb-4 ring-1 ${a.border}`}>
        <Icon className={`w-5 h-5 ${a.icon}`} />
      </div>
      <h3 className="text-base font-bold text-white mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}

// ── Testimonial ───────────────────────────────────────────────
function Testimonial({ quote, name, role, school, delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`p-6 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-4
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
        transition-all duration-600 ease-out`}
    >
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed italic">"{quote}"</p>
      <div className="mt-auto pt-4 border-t border-white/10">
        <p className="text-sm font-bold text-white">{name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{role} · {school}</p>
      </div>
    </div>
  )
}

// ── Workflow step ─────────────────────────────────────────────
function WorkflowStep({ num, title, desc, delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`flex gap-5 items-start
        ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}
        transition-all duration-500 ease-out`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600
        flex items-center justify-center text-sm font-black text-slate-900 shadow-lg shadow-amber-500/30 mt-0.5">
        {num}
      </div>
      <div>
        <h4 className="text-base font-bold text-white mb-1">{title}</h4>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────
function PlanCard({ name, price, features, badge, highlight, delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`relative p-7 rounded-2xl flex flex-col gap-5
        ${highlight
          ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 ring-2 ring-indigo-400/50 shadow-2xl shadow-indigo-500/30'
          : 'bg-white/[0.04] ring-1 ring-white/10'
        }
        ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        transition-all duration-500 ease-out`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-xs font-black uppercase tracking-wider shadow-lg">
            {badge}
          </span>
        </div>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{name}</p>
        <p className="text-4xl font-black text-white leading-none">{price}</p>
      </div>
      <ul className="flex flex-col gap-2.5 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlight ? 'text-indigo-200' : 'text-emerald-400'}`} />
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/register"
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all
          ${highlight
            ? 'bg-white text-indigo-700 hover:bg-indigo-50'
            : 'bg-white/10 text-white hover:bg-white/20'
          }`}
      >
        Get Started <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

// ── MAIN LANDING PAGE ─────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [statsRef, statsInView] = useInView(0.3)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const features = [
    { icon: BookOpen,      title: 'Dynamic Marks Entry',      accent: 'indigo',  desc: 'Enter marks for 1–6 configurable terms per subject. Bulk edit, inline validation, auto-save with conflict detection.' },
    { icon: FileText,      title: 'Beautiful Report Cards',   accent: 'amber',   desc: 'Auto-generated PDF report cards with school logo, letterhead, grades, ranks, and attendance percentage.' },
    { icon: BarChart2,     title: 'Real-Time Analytics',      accent: 'emerald', desc: 'Class-level pass rates, top scorers, subject-wise performance breakdown, and comparative analytics.' },
    { icon: ArrowUpCircle, title: 'Bulk Student Promotion',   accent: 'violet',  desc: 'Promote entire classes to next year in seconds — select students, assign roll numbers, confirm.' },
    { icon: Calendar,      title: 'Attendance Tracking',      accent: 'teal',    desc: 'Record annual attendance percentages per student. Automatically reflected on report cards.' },
    { icon: Settings,      title: 'Fully Configurable',       accent: 'rose',    desc: 'Custom grading bands, custom pass marks, 1–6 terms, custom term names — every school is different.' },
    { icon: Users,         title: 'Role-Based Access',        accent: 'indigo',  desc: 'Admin, Teacher, Viewer roles. Teachers see only their assigned subjects and classes.' },
    { icon: Shield,        title: 'Secure by Design',         accent: 'emerald', desc: 'Row-level security on every table, rate-limited login, term-locking, audit trail on every action.' },
    { icon: Globe,         title: 'Student Portal',           accent: 'amber',   desc: 'Students look up their own results with a simple roll number search. Zero login required.' },
  ]

  const testimonials = [
    { quote: 'We moved from spreadsheets to RMS in one weekend. The report card generation alone saves us 3 days per term.', name: 'Anita Sharma', role: 'Principal', school: 'Greenfield Academy, Kolkata' },
    { quote: 'The bulk promotion feature is a lifesaver at year-end. 400 students promoted with correct roll numbers in under 2 minutes.', name: 'Rajesh Kumar', role: 'Admin', school: 'St. Xavier\'s School, Patna' },
    { quote: 'Our teachers love how simple marks entry is. Even the non-tech staff picked it up without training.', name: 'Priya Devi', role: 'Vice Principal', school: 'Modern Public School, Ranchi' },
  ]

  return (
    <div className="min-h-screen bg-[#0d1117] text-white overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .font-display { font-family: 'Playfair Display', Georgia, serif; }

        /* Grain texture overlay */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.6;
        }

        .hero-glow {
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.25) 0%, transparent 70%);
        }
        .gold-underline {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
          background-repeat: no-repeat;
          background-size: 100% 3px;
          background-position: 0 100%;
          padding-bottom: 4px;
        }
        .grid-bg {
          background-image:
            linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .float { animation: float 6s ease-in-out infinite; }
        .float-slow { animation: float 9s ease-in-out infinite; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up-1 { animation: fadeUp 0.7s ease-out 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.7s ease-out 0.3s both; }
        .fade-up-3 { animation: fadeUp 0.7s ease-out 0.5s both; }
        .fade-up-4 { animation: fadeUp 0.7s ease-out 0.7s both; }

        .nav-blur {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 nav-blur
        ${scrolled ? 'bg-[#0d1117]/80 border-b border-white/5 shadow-xl shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white tracking-tight">Smart RMS</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Pricing', 'Portal'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/register"
              className="flex items-center gap-1.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500
                text-white px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25">
              Register School <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white"
            onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#0d1117]/95 border-b border-white/10 px-5 py-4 space-y-3">
            {['Features', 'How It Works', 'Pricing', 'Portal'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-slate-300 hover:text-white py-2">
                {item}
              </a>
            ))}
            <div className="flex gap-3 pt-3 border-t border-white/10">
              <Link to="/login" className="flex-1 text-center text-sm font-semibold text-slate-300 py-2.5 rounded-xl border border-white/15 hover:bg-white/5">
                Sign In
              </Link>
              <Link to="/register" className="flex-1 text-center text-sm font-bold bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-500">
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-16 grid-bg hero-glow">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl float pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/6 w-48 h-48 bg-amber-500/8 rounded-full blur-3xl float-slow pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-700/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="fade-up-1 inline-flex items-center gap-2 px-4 py-2 rounded-full
            bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-8">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Smart Result Management System
          </div>

          {/* Headline */}
          <h1 className="fade-up-2 font-display text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-white">Every Result,</span>
            <br />
            <span className="gold-underline text-amber-400">Effortlessly</span>
            <span className="text-white"> Managed.</span>
          </h1>

          {/* Sub */}
          <p className="fade-up-3 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            A complete school result management platform — marks entry, report cards, analytics,
            attendance, and bulk student operations. Built for Indian schools.
          </p>

          {/* CTAs */}
          <div className="fade-up-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register"
              className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500
                text-white font-bold text-base px-8 py-4 rounded-2xl transition-all
                hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5">
              Register Your School Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/portal"
              className="flex items-center gap-2 text-slate-300 hover:text-white font-semibold
                text-base px-8 py-4 rounded-2xl border border-white/15 hover:bg-white/5 transition-all">
              <Globe className="w-5 h-5" /> Student Portal
            </Link>
          </div>

          {/* Trust badges */}
          <div className="fade-up-4 flex flex-wrap gap-6 justify-center items-center mt-12 text-xs font-medium text-slate-500">
            {['No credit card required', '5-minute setup', 'Runs 24x7', 'Open source ready'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4 text-slate-500 animate-bounce" />
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────── */}
      <section ref={statsRef} className="py-20 border-y border-white/[0.06] bg-indigo-950/30">
        <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatCard value={500}  suffix="+"  label="Schools Registered"  startCount={statsInView} />
          <StatCard value={50000} suffix="+" label="Students Managed"    startCount={statsInView} duration={2200} />
          <StatCard value={99}   suffix="%"  label="Uptime"              startCount={statsInView} duration={1200} />
          <StatCard value={3}    suffix="s"  label="Avg Report Card Gen" startCount={statsInView} duration={900} />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Everything You Need</p>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white leading-tight">
              Powerful. Simple.<br />
              <span className="text-slate-400">Built for real schools.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 60} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-5 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Simple Setup</p>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white leading-tight mb-12">
              From zero to<br />report cards<br />
              <span className="text-amber-400">in one day.</span>
            </h2>
            <div className="flex flex-col gap-8">
              <WorkflowStep num="1" title="Register your school"
                desc="Fill in your school name, contact details, and academic session. Your account is approved by our super admin within hours."
                delay={0} />
              <WorkflowStep num="2" title="Configure classes & subjects"
                desc="Add your classes, sections, and subjects. Set max marks per term, internal marks, and grading rules — all per your school's curriculum."
                delay={100} />
              <WorkflowStep num="3" title="Add students & enter marks"
                desc="Import students from Excel or add manually. Teachers enter marks term-by-term. Marks are validated, locked, and audited automatically."
                delay={200} />
              <WorkflowStep num="4" title="Generate & publish results"
                desc="One click generates beautiful PDF report cards. Publish results to the student portal for self-service result lookup."
                delay={300} />
            </div>
          </div>

          {/* Mock dashboard card */}
          <div className="relative hidden md:block">
            <div className="absolute -inset-8 bg-indigo-600/10 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl bg-[#161b22] border border-white/10 p-6 shadow-2xl">
              {/* Mock header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Dashboard</p>
                  <p className="text-[10px] text-slate-500">2025-26 Academic Session</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  {['bg-red-500','bg-amber-500','bg-green-500'].map(c => (
                    <div key={c} className={`w-2.5 h-2.5 rounded-full ${c} opacity-80`} />
                  ))}
                </div>
              </div>
              {/* Mock stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Students', val: '347', color: 'text-indigo-400' },
                  { label: 'Pass Rate', val: '94%', color: 'text-emerald-400' },
                  { label: 'Avg Score', val: '71.2', color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.04] rounded-xl p-3 border border-white/5">
                    <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Mock subject list */}
              <div className="space-y-2">
                {[
                  { sub: 'Mathematics', pct: 76, col: 'bg-indigo-500' },
                  { sub: 'Science',     pct: 82, col: 'bg-emerald-500' },
                  { sub: 'English',     pct: 68, col: 'bg-amber-500' },
                  { sub: 'Social Sci.', pct: 91, col: 'bg-violet-500' },
                ].map(s => (
                  <div key={s.sub} className="flex items-center gap-3">
                    <p className="text-[11px] text-slate-400 w-24 truncate">{s.sub}</p>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${s.col} rounded-full`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <p className="text-[11px] font-bold text-slate-300 w-8 text-right tabular-nums">{s.pct}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-24 px-5 border-t border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Trusted by Schools</p>
            <h2 className="font-display text-4xl font-black text-white">What principals say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <Testimonial key={t.name} {...t} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      {/*
      <section id="pricing" className="py-24 px-5 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Pricing</p>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
              Start free.<br />Scale when ready.
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              All schools begin on the Free plan. Upgrade when you need advanced analytics, Excel exports, or priority support.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <PlanCard
              name="Free"
              price="₹0"
              delay={0}
              features={[
                'Up to 3 classes', 'Marks entry & results', 'PDF report cards',
                'Student portal', 'Basic analytics', '3 user accounts',
              ]}
            />
            <PlanCard
              name="Pro"
              price="₹499/mo"
              badge="Most Popular"
              highlight
              delay={100}
              features={[
                'Unlimited classes', 'Excel export', 'Advanced analytics',
                'Attendance tracking', 'Bulk promotion', 'Email support',
                'Audit trail', 'Up to 20 users',
              ]}
            />
            <PlanCard
              name="Enterprise"
              price="Custom"
              delay={200}
              features={[
                'Everything in Pro', 'Custom branding', 'Dedicated support',
                'SLA guarantee', 'Multi-campus', 'API access',
              ]}
            />
          </div>
        </div>
      </section>
        */}

      {/* ── STUDENT PORTAL TEASER ────────────────────────────── */}
      <section id="portal" className="py-24 px-5 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10
            border border-emerald-500/25 mb-6">
            <Globe className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
            Students check their own results.<br />
            <span className="text-emerald-400">No login needed.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10">
            Once published, students enter their roll number and instantly see their full report card —
            grades, percentages, rank, and attendance. Share with parents via link.
          </p>
          <Link to="/portal"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500
              text-white font-bold text-base px-8 py-4 rounded-2xl transition-all
              hover:shadow-2xl hover:shadow-emerald-500/25 hover:-translate-y-0.5">
            Try the Student Portal <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-28 px-5 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
            bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-8">
            <Award className="w-3.5 h-3.5" /> Free to start · No card required
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-black text-white leading-tight mb-6">
            Ready to modernise<br />
            <span className="text-amber-400">your school records?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Join hundreds of schools already using Smart RMS.
            Set up takes less than 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500
                text-white font-bold text-base px-10 py-4 rounded-2xl transition-all
                hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5">
              Register Your School
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 text-slate-300 hover:text-white
                font-semibold text-base px-10 py-4 rounded-2xl border border-white/15 hover:bg-white/5 transition-all">
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-base text-white">Smart RMS</span>
              </div>
              {/*<p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Result Management System for Indian schools.
              </p>*/}
            </div>
            <div className="flex flex-wrap gap-8 text-sm">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">App</p>
                {[['Sign In', '/login'], ['Register', '/register'], ['Student Portal', '/portal'], ['Super Admin', '/superadmin']].map(([l, h]) => (
                  <Link key={l} to={h} className="text-slate-500 hover:text-white transition-colors text-xs">{l}</Link>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Features</p>
                {['Marks Entry', 'Report Cards', 'Analytics', 'Attendance', 'Bulk Promote'].map(l => (
                  <span key={l} className="text-slate-500 text-xs">{l}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">© 2025 Smart RMS. All rights reserved.</p>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Secured with Enterprise Grade Security
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
