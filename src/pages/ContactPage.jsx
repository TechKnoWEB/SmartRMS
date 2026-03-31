// src/pages/ContactPage.jsx
// Public contact page — matches LandingPage design system.
// On submit, calls the `contact-form` Supabase Edge Function which
// emails the superadmin via Resend.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, ArrowLeft, MapPin, Phone, Mail,
  Clock, Send, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

const SUBJECTS = [
  'General Enquiry',
  'Sales & Pricing',
  'Technical Support',
  'Partnership / Reseller',
  'Billing',
  'Feature Request',
  'Other',
]

const OFFICE_HOURS = [
  { day: 'Monday – Friday', time: '9:00 AM – 6:00 PM IST' },
  { day: 'Saturday',        time: '10:00 AM – 2:00 PM IST' },
  { day: 'Sunday',          time: 'Closed' },
]

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '', email: '', schoolName: '', phone: '', subject: SUBJECTS[0], message: '',
  })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/contact-form`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey':        ANON_KEY,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setStatus('success')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Playfair Display', Georgia, serif; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(226,232,240,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(226,232,240,0.5) 1px, transparent 1px);
          background-size: 60px 60px;
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 border-b border-slate-200 shadow-sm backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700
              flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">Smart RMS</span>
          </Link>
          <Link to="/home"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </nav>

      {/* ── HERO BAND ── */}
      <div className="grid-bg border-b border-slate-200 py-14 px-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">Get in Touch</p>
        <h1 className="font-display text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
          We'd love to hear<br />
          <span className="text-amber-500">from you.</span>
        </h1>
        <p className="text-slate-500 text-base max-w-md mx-auto">
          Have a question, need a demo, or want to explore pricing? Drop us a message and we'll get back to you within 24 hours.
        </p>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-6xl mx-auto px-5 py-16 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Left — info */}
        <div className="flex flex-col gap-6">

          {/* Address card */}
          <div className="p-6 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Our Office</p>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 ring-1 ring-indigo-100 flex items-center
                  justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Address</p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
                    12, Rabindra Sarani<br />
                    Salt Lake Sector V<br />
                    Kolkata — 700 091<br />
                    West Bengal, India
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 ring-1 ring-emerald-100 flex items-center
                  justify-center flex-shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Phone</p>
                  <a href="tel:+919800012345"
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors mt-0.5 block">
                    +91 98000 12345
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 ring-1 ring-amber-100 flex items-center
                  justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Email</p>
                  <a href="mailto:support@smartrms.in"
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors mt-0.5 block">
                    support@smartrms.in
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Office hours */}
          <div className="p-6 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Office Hours</p>
            </div>
            <div className="flex flex-col gap-3">
              {OFFICE_HOURS.map(({ day, time }) => (
                <div key={day} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">{day}</span>
                  <span className={`text-sm font-semibold ${time === 'Closed' ? 'text-rose-500' : 'text-slate-800'}`}>
                    {time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="p-6 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Quick Links</p>
            <div className="flex flex-col gap-2">
              {[['Register School', '/register'], ['Student Portal', '/portal'], ['Sign In', '/login']].map(([label, href]) => (
                <Link key={href} to={href}
                  className="text-sm font-medium text-indigo-700 hover:text-indigo-900 transition-colors flex items-center gap-1.5">
                  → {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="lg:col-span-2">
          {status === 'success' ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-8
              rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 ring-1 ring-emerald-200
                flex items-center justify-center mb-5">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-black text-slate-900 mb-3">Message Sent!</h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-sm mb-8">
                Thanks for reaching out. Our team will review your message and get back to you
                at <strong>{form.email}</strong> within 24 hours.
              </p>
              <button
                onClick={() => { setStatus('idle'); setForm({ name: '', email: '', schoolName: '', phone: '', subject: SUBJECTS[0], message: '' }) }}
                className="text-sm font-bold text-emerald-700 hover:text-emerald-900 transition-colors underline underline-offset-2">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}
              className="p-8 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm flex flex-col gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Contact Form</p>
                <h2 className="font-display text-2xl font-black text-slate-900">Send us a message</h2>
              </div>

              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Your Name" required>
                  <input
                    type="text" value={form.name} onChange={set('name')}
                    placeholder="Anita Sharma" required
                    className="input-field"
                  />
                </Field>
                <Field label="Email Address" required>
                  <input
                    type="email" value={form.email} onChange={set('email')}
                    placeholder="anita@school.edu.in" required
                    className="input-field"
                  />
                </Field>
              </div>

              {/* School + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="School Name">
                  <input
                    type="text" value={form.schoolName} onChange={set('schoolName')}
                    placeholder="Greenfield Academy"
                    className="input-field"
                  />
                </Field>
                <Field label="Phone Number">
                  <input
                    type="tel" value={form.phone} onChange={set('phone')}
                    placeholder="+91 98000 00000"
                    className="input-field"
                  />
                </Field>
              </div>

              {/* Subject */}
              <Field label="Subject" required>
                <select value={form.subject} onChange={set('subject')} className="input-field">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>

              {/* Message */}
              <Field label="Message" required>
                <textarea
                  rows={5} value={form.message} onChange={set('message')}
                  placeholder="Tell us how we can help you…" required
                  className="input-field resize-none"
                />
              </Field>

              {/* Error */}
              {status === 'error' && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-rose-50
                  ring-1 ring-rose-200 text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {errorMsg || 'Something went wrong. Please try again.'}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl
                  bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm
                  transition-all hover:shadow-lg hover:shadow-indigo-500/25
                  disabled:opacity-60 disabled:cursor-not-allowed">
                {status === 'loading'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Send Message</>
                }
              </button>

              <p className="text-xs text-slate-400 text-center">
                We typically respond within 24 hours on working days.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ── FOOTER STRIP ── */}
      <div className="border-t border-slate-200 py-6 px-5 bg-slate-50 text-center">
        <p className="text-xs text-slate-400">
          © 2026 Smart RMS · <a href="mailto:support@smartrms.in" className="hover:text-slate-600 transition-colors">support@smartrms.in</a>
        </p>
      </div>

      {/* Shared input styles injected via className helpers */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }
        .input-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          background: #fff;
        }
        .input-field::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  )
}
