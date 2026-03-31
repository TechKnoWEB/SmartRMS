// src/pages/LandingPage.jsx
// Updated: White color scheme with elegant navy accents
// Section navigation: Features, How it Works, Pricing, Portal

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, BarChart2, FileText, Users, Lock,
  ArrowRight, CheckCircle, Star, Globe, Zap, Shield,
  BookOpen, Award, TrendingUp, ChevronDown, Menu, X,
  ClipboardList, Calendar, ArrowUpCircle, Settings,
  CreditCard, Tag, Sparkles, MapPin, Phone, Mail, Twitter,
  Linkedin, Github, Facebook,
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
      <p className="text-5xl font-black text-slate-900 tabular-nums leading-none tracking-tight">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-600 uppercase tracking-widest">{label}</p>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, accent, delay = 0 }) {
  const [ref, inView] = useInView()
  const accents = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', ring: 'ring-indigo-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  border: 'border-amber-100', ring: 'ring-amber-100' },
    emerald:{ bg: 'bg-emerald-50',icon: 'text-emerald-600',border: 'border-emerald-100', ring: 'ring-emerald-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100', ring: 'ring-violet-100' },
    rose:   { bg: 'bg-rose-50',   icon: 'text-rose-600',   border: 'border-rose-100', ring: 'ring-rose-100' },
    teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'border-teal-100', ring: 'ring-teal-100' },
  }
  const a = accents[accent] || accents.indigo
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative p-6 rounded-2xl border ${a.border} bg-white
        hover:shadow-lg hover:shadow-${accent}-100/50 transition-all duration-500 cursor-default
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        transition-[opacity,transform] ease-out`}
    >
      <div className={`inline-flex w-12 h-12 rounded-xl ${a.bg} items-center justify-center mb-4 ring-1 ${a.ring}`}>
        <Icon className={`w-5 h-5 ${a.icon}`} />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
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
      className={`p-6 rounded-2xl bg-white border border-slate-200 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
        transition-all duration-600 ease-out`}
    >
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed italic">"{quote}"</p>
      <div className="mt-auto pt-4 border-t border-slate-100">
        <p className="text-sm font-bold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{role} · {school}</p>
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
        flex items-center justify-center text-sm font-black text-white shadow-lg shadow-amber-500/30 mt-0.5">
        {num}
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900 mb-1">{title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────
function PlanCard({ name, price, priceNote, studentLimit, features, badge, highlight, cta = 'Get Started', delay = 0 }) {
  const [ref, inView] = useInView()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`relative flex flex-col rounded-2xl
        ${highlight
          ? 'bg-gradient-to-b from-indigo-600 to-indigo-800 ring-2 ring-indigo-400/60 shadow-2xl shadow-indigo-500/40 scale-[1.03] z-10'
          : 'bg-white ring-1 ring-slate-200 shadow-sm hover:shadow-xl hover:ring-slate-300 hover:-translate-y-0.5'
        }
        ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        transition-all duration-500 ease-out`}
    >
      {badge && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
          <span className="px-3.5 py-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-black uppercase tracking-wider shadow-lg shadow-amber-400/30">
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className={`px-6 pt-7 pb-5 border-b ${highlight ? 'border-white/10' : 'border-slate-100'}`}>
        <p className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-3 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{name}</p>
        <div className="flex items-end gap-1.5 mb-4">
          <p className={`text-4xl font-black leading-none tracking-tight ${highlight ? 'text-white' : 'text-slate-900'}`}>{price}</p>
          {priceNote && (
            <span className={`text-sm font-medium pb-0.5 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{priceNote}</span>
          )}
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
          ${highlight ? 'bg-white/15 text-white' : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'}`}>
          <Users className="w-3 h-3 flex-shrink-0" />
          {studentLimit}
        </div>
      </div>

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1 px-6 py-5">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2.5 text-[13px] leading-snug ${highlight ? 'text-indigo-50' : 'text-slate-600'}`}>
            <CheckCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${highlight ? 'text-emerald-300' : 'text-emerald-500'}`} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="px-6 pb-6">
        <Link
          to={cta === 'Contact Sales' ? '/contact' : '/register'}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all
            ${highlight
              ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-lg shadow-amber-400/25'
              : 'bg-slate-900 text-white hover:bg-slate-700'
            }`}
        >
          {cta} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
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
    { icon: BookOpen,      title: 'Dynamic Marks Entry',        accent: 'indigo',  desc: 'Enter marks for 1–6 configurable terms per subject. Bulk edit, inline validation, auto-save with conflict detection.' },
    { icon: FileText,      title: 'Beautiful Report Cards',     accent: 'amber',   desc: 'Auto-generated PDF report cards with school logo, letterhead, grades, ranks, and attendance percentage.' },
    { icon: BarChart2,     title: 'Real-Time Analytics',        accent: 'emerald', desc: 'Class-level pass rates, top scorers, subject-wise performance breakdown, and comparative analytics.' },
    { icon: ArrowUpCircle, title: 'Bulk Student Promotion',     accent: 'violet',  desc: 'Promote entire classes with rank-ordered roll assignment — Roll 1 goes to the best academic rank. Preview rank and percentage before confirming.' },
    { icon: Calendar,      title: 'Attendance Tracking',        accent: 'teal',    desc: 'Record annual attendance percentages per student. Automatically reflected on report cards.' },
    { icon: Settings,      title: 'Fully Configurable',         accent: 'rose',    desc: 'Custom grading bands, custom pass marks, 1–6 terms, custom term names — every school is different.' },
    { icon: Users,         title: 'Role-Based Access',          accent: 'indigo',  desc: 'Admin, Teacher, Viewer roles. Teachers see only their assigned subjects and classes.' },
    { icon: Shield,        title: 'Secure by Design',           accent: 'emerald', desc: 'Row-level security on every table, rate-limited login, term-locking, audit trail on every action.' },
    { icon: Globe,         title: 'Student Portal',             accent: 'amber',   desc: 'Students look up their own results with a simple roll number search. Zero login required.' },
    { icon: CreditCard,    title: 'ID Card Generation',         accent: 'violet',  desc: 'Generate print-ready student ID cards with name, class, roll number, school branding, and photo placeholder.' },
    { icon: Tag,           title: 'Exam Labels & Hall Tickets', accent: 'teal',    desc: 'Auto-generate exam seat labels and hall tickets with student details, roll number, and room assignments.' },
    { icon: Sparkles,      title: 'More Features Coming',       accent: 'rose',    desc: 'Fee management, SMS result alerts, parent mobile app, and more — actively developed and rolling out soon.' },
  ]

  const testimonials = [
    { quote: 'We moved from spreadsheets to RMS in one weekend. The report card generation alone saves us 3 days per term.', name: 'Anita Sharma', role: 'Principal', school: 'Greenfield Academy, Kolkata' },
    { quote: 'The bulk promotion feature is a lifesaver at year-end. 400 students promoted with correct roll numbers in under 2 minutes.', name: 'Rajesh Kumar', role: 'Admin', school: 'St. Xavier\'s School, Patna' },
    { quote: 'Our teachers love how simple marks entry is. Even the non-tech staff picked it up without training.', name: 'Priya Devi', role: 'Vice Principal', school: 'Modern Public School, Ranchi' },
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .font-display { font-family: 'Playfair Display', Georgia, serif; }

        .hero-glow {
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.08) 0%, transparent 70%);
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
            linear-gradient(rgba(226,232,240,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226,232,240,0.5) 1px, transparent 1px);
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
        ${scrolled ? 'bg-white/90 border-b border-slate-200 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">Smart RMS</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Pricing', 'Portal'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/register"
              className="flex items-center gap-1.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700
                text-white px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25">
              Register School <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900"
            onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white/95 border-b border-slate-200 px-5 py-4 space-y-3">
            {['Features', 'How It Works', 'Pricing', 'Portal'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-slate-700 hover:text-slate-900 py-2">
                {item}
              </a>
            ))}
            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <Link to="/login" className="flex-1 text-center text-sm font-semibold text-slate-700 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50">
                Sign In
              </Link>
              <Link to="/register" className="flex-1 text-center text-sm font-bold bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700">
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-16 grid-bg hero-glow">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-indigo-100 rounded-full blur-3xl float pointer-events-none opacity-60" />
        <div className="absolute bottom-1/3 right-1/6 w-48 h-48 bg-amber-100 rounded-full blur-3xl float-slow pointer-events-none opacity-60" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="fade-up-1 inline-flex items-center gap-2 px-4 py-2 rounded-full
            bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-widest mb-8">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Smart Result Management System
          </div>

          {/* Headline */}
          <h1 className="fade-up-2 font-display text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-slate-900">Every Result,</span>
            <br />
            <span className="gold-underline text-amber-500">Effortlessly</span>
            <span className="text-slate-900"> Managed.</span>
          </h1>

          {/* Sub */}
          <p className="fade-up-3 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10">
            A complete school management platform — marks entry, report cards, analytics,
            ID card generation, exam labels, attendance, bulk operations, and more. Built for Indian schools.
          </p>

          {/* CTAs */}
          <div className="fade-up-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register"
              className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                text-white font-bold text-base px-8 py-4 rounded-2xl transition-all
                hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5">
              Register Your School Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/portal"
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold
                text-base px-8 py-4 rounded-2xl border border-slate-300 hover:bg-slate-50 transition-all">
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
      <section ref={statsRef} className="py-20 border-y border-slate-200 bg-slate-50">
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
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">Everything You Need</p>
            <h2 className="font-display text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              Powerful. Simple.<br />
              <span className="text-slate-500">Built for real schools.</span>
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
      <section id="how-it-works" className="py-24 px-5 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Simple Setup</p>
            <h2 className="font-display text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-12">
              From zero to<br />report cards<br />
              <span className="text-amber-500">in one day.</span>
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
            <div className="absolute -inset-8 bg-indigo-100 rounded-3xl blur-2xl opacity-50" />
            <div className="relative rounded-2xl bg-white border border-slate-200 p-6 shadow-xl">
              {/* Mock header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Dashboard</p>
                  <p className="text-[10px] text-slate-500">2026-27 Academic Session</p>
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
                  { label: 'Students', val: '347', color: 'text-indigo-600' },
                  { label: 'Pass Rate', val: '94%', color: 'text-emerald-600' },
                  { label: 'Avg Score', val: '71.2', color: 'text-amber-600' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
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
                    <p className="text-[11px] text-slate-600 w-24 truncate">{s.sub}</p>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${s.col} rounded-full`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 w-8 text-right tabular-nums">{s.pct}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-24 px-5 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">Trusted by Schools</p>
            <h2 className="font-display text-4xl font-black text-slate-900">What principals say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <Testimonial key={t.name} {...t} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5 bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Pricing</p>
            <h2 className="font-display text-4xl md:text-5xl font-black text-slate-900 mb-4">
              Start free.<br />Scale when ready.
            </h2>
            <p className="text-slate-600 text-base max-w-lg mx-auto">
              All features are included in every plan. You only pay for more students — pick the plan that fits your school size.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-center pt-4">
            <PlanCard
              name="Free"
              price="₹0"
              priceNote="forever"
              studentLimit="Up to 50 students"
              cta="Get Started Free"
              delay={0}
              features={[
                'All features included', 'Marks entry & report cards',
                'Analytics & Excel export', 'Student portal',
                'ID card generation', 'Exam labels',
              ]}
            />
            <PlanCard
              name="Basic"
              price="₹999"
              priceNote="/mo"
              studentLimit="Up to 500 students"
              delay={80}
              features={[
                'Everything in Free', 'Larger class capacity',
                'Bulk student promotion', 'Attendance tracking',
                'Priority email support',
              ]}
            />
            <PlanCard
              name="Pro"
              price="₹2,499"
              priceNote="/mo"
              studentLimit="Up to 1,500 students"
              badge="Most Popular"
              highlight
              delay={160}
              features={[
                'Everything in Basic', 'High-volume capacity',
                'SMS result alerts', 'Audit trail & logs',
                'Dedicated onboarding',
              ]}
            />
            <PlanCard
              name="Enterprise"
              price="Custom"
              studentLimit="Unlimited students"
              cta="Contact Sales"
              delay={240}
              features={[
                'Everything in Pro', 'Custom branding',
                'SLA guarantee', 'Multi-campus support',
                'Dedicated account manager',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── STUDENT PORTAL TEASER ────────────────────────────── */}
      <section id="portal" className="py-24 px-5 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50
            border border-emerald-200 mb-6">
            <Globe className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-black text-slate-900 mb-5 leading-tight">
            Students check their own results.<br />
            <span className="text-emerald-600">No login needed.</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto mb-10">
            Once published, students enter their roll number and instantly see their full report card —
            grades, percentages, rank, and attendance. Share with parents via link.
          </p>
          <Link to="/portal"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700
              text-white font-bold text-base px-8 py-4 rounded-2xl transition-all
              hover:shadow-2xl hover:shadow-emerald-500/25 hover:-translate-y-0.5">
            Try the Student Portal <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-28 px-5 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
            bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-widest mb-8">
            <Award className="w-3.5 h-3.5" /> Free to start · No card required
          </div>
          <h2 className="font-display text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
            Ready to modernise<br />
            <span className="text-amber-500">your school records?</span>
          </h2>
          <p className="text-slate-600 text-lg mb-10">
            Join hundreds of schools already using Smart RMS.
            Set up takes less than 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                text-white font-bold text-base px-10 py-4 rounded-2xl transition-all
                hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5">
              Register Your School
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900
                font-semibold text-base px-10 py-4 rounded-2xl border border-slate-300 hover:bg-slate-100 transition-all">
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-12 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-base text-slate-900">Smart RMS</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                India's smartest school result management platform — built for modern schools.
              </p>
              <div className="flex flex-col gap-2.5">
                <span className="flex items-start gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  12, Rabindra Sarani, Salt Lake Sector V,<br />Kolkata — 700 091, West Bengal, India
                </span>
                <a href="tel:+919800012345" className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  +91 98000 12345
                </a>
                <a href="mailto:support@smartrms.in" className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  support@smartrms.in
                </a>
              </div>
            </div>
            <div className="flex flex-wrap gap-8 text-sm">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">App</p>
                {[['Sign In', '/login'], ['Register', '/register'], ['Student Portal', '/portal'], ['Super Admin', '/superadmin']].map(([l, h]) => (
                  <Link key={l} to={h} className="text-slate-600 hover:text-slate-900 transition-colors text-xs">{l}</Link>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Features</p>
                {['Marks Entry', 'Report Cards', 'Analytics', 'Attendance', 'Bulk Promote', 'ID Card Generation', 'Exam Labels'].map(l => (
                  <span key={l} className="text-slate-600 text-xs">{l}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">© 2026 Smart RMS. All rights reserved.</p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Secured with Enterprise Grade Security
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}