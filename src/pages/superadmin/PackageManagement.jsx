// src/pages/superadmin/PackageManagement.jsx
//
// Replaces the inline PackageManagement function in SuperAdminDashboard.jsx.
// New in this version:
//   • Click any package card → edit drawer slides in
//   • Edit: name, price_monthly, price_yearly, max_students,
//           description, is_active, feature preset toggles
//   • Calls POST /packages/update (Edge Function route)
//   • Assign flow unchanged
//
// INTEGRATION:
//   In SuperAdminDashboard.jsx:
//     1. Remove the inline `function PackageManagement(...)` block entirely
//     2. Add import at top:
//        import PackageManagement from './PackageManagement'
//     3. The JSX tab render is already:  <PackageManagement ... />  — no change needed

import { useState, useEffect, useCallback } from 'react'
import { supabase }      from '../../lib/supabase'
import { callApi }       from './saConstants'
import { useToast }      from './saComponents'
import {
  Zap, CheckCircle2, Loader2, X, Edit3, Save,
  Users, ToggleLeft, ToggleRight, Search,
  AlertTriangle, Package, Settings, DollarSign,
  ChevronRight, Sparkles,
} from 'lucide-react'

// Features list — mirrors saConstants FEATURES
const FEATURES = [
  { key: 'marks_entry',     label: 'Marks Entry',     desc: 'Enter and edit marks'          },
  { key: 'report_cards',    label: 'Report Cards',    desc: 'Generate PDF report cards'      },
  { key: 'analytics',       label: 'Analytics',       desc: 'Class & school analytics'       },
  { key: 'excel_export',    label: 'Excel Export',    desc: 'Download marks as Excel'        },
  { key: 'student_portal',  label: 'Student Portal',  desc: 'Public result lookup'           },
  { key: 'sms_alerts',      label: 'SMS Alerts',      desc: 'Send results via SMS'           },
  { key: 'bulk_operations', label: 'Bulk Operations', desc: 'Bulk import/export'             },
]

// Colour map for plan keys
const PKG_ACCENT = {
  free:       { card: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',   dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  basic:      { card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40',   dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  pro:        { card: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40', dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  enterprise: { card: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/40', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
}
const accentFor = (planKey) => PKG_ACCENT[planKey] ?? PKG_ACCENT.basic

// ── Edit Drawer ───────────────────────────────────────────────
function PackageEditDrawer({ pkg, creds, onClose, onSaved }) {
  const { toast } = useToast()

  // Form state — seeded from pkg
  const [name,          setName]         = useState(pkg.name)
  const [description,   setDesc]         = useState(pkg.description ?? '')
  const [priceMonthly,  setPriceMonthly] = useState(pkg.price_monthly > 0 ? String(Math.round(pkg.price_monthly / 100)) : '')
  const [priceYearly,   setPriceYearly]  = useState(pkg.price_yearly  > 0 ? String(Math.round(pkg.price_yearly  / 100)) : '')
  const [maxStudents,   setMaxStudents]  = useState(pkg.max_students < 0 ? '' : String(pkg.max_students))
  const [maxTeachers,   setMaxTeachers]  = useState(pkg.max_teachers > 0 ? String(pkg.max_teachers) : '')
  const [isActive,      setIsActive]     = useState(pkg.is_active !== false)
  const [displayOrder,  setDisplayOrder] = useState(String(pkg.display_order ?? 0))
  const [features,      setFeatures]     = useState({ ...(pkg.feature_preset ?? {}) })
  const [saving,        setSaving]       = useState(false)

  const toggleFeature = (key) => setFeatures(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    if (!name.trim()) { toast('Package name is required', 'warning'); return }

    setSaving(true)
    try {
      // Build updated feature_preset
      const featurePreset = {}
      FEATURES.forEach(f => { featurePreset[f.key] = !!features[f.key] })

      await callApi('/packages/update', creds, {
        id:             pkg.id,
        name:           name.trim(),
        description:    description.trim() || null,
        price_monthly:  priceMonthly ? Math.round(parseFloat(priceMonthly) * 100) : 0,
        price_yearly:   priceYearly  ? Math.round(parseFloat(priceYearly)  * 100) : 0,
        max_students:   maxStudents  ? parseInt(maxStudents,  10)  : -1,
        max_teachers:   maxTeachers  ? parseInt(maxTeachers,  10)  : -1,
        display_order:  displayOrder ? parseInt(displayOrder, 10)  : 0,
        is_active:      isActive,
        feature_preset: featurePreset,
      })

      toast(`"${name}" updated successfully`, 'success')
      onSaved()
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const accent = accentFor(pkg.plan_key)

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="ml-auto w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden animate-[slideInRight_0.3s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">Edit Package</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{pkg.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Package Active</p>
              <p className="text-xs text-gray-400 mt-0.5">{isActive ? 'Visible to super admin · can be assigned to schools' : 'Hidden — cannot be assigned'}</p>
            </div>
            <button onClick={() => setIsActive(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${isActive ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Name */}
          <Field label="Package Name" required>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Short description shown on package card…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 resize-none transition-all" />
          </Field>

          {/* Pricing row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly Price (₹)" hint="Enter 0 for free / custom">
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-gray-400 pointer-events-none">₹</span>
                <input type="number" min="0" value={priceMonthly} onChange={e => setPriceMonthly(e.target.value)}
                  placeholder="999"
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
              </div>
            </Field>
            <Field label="Yearly Price (₹)" hint="Per month equivalent">
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-gray-400 pointer-events-none">₹</span>
                <input type="number" min="0" value={priceYearly} onChange={e => setPriceYearly(e.target.value)}
                  placeholder="799"
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
              </div>
            </Field>
          </div>

          {/* Limits row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Students" hint="50 / 500 / 1500 / -1=∞">
              <input type="number" min="-1" value={maxStudents} onChange={e => setMaxStudents(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
            </Field>
            <Field label="Display Order">
              <input type="number" min="0" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
            </Field>
          </div>

          {/* Feature toggles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Feature Preset
              </label>
              <div className="flex gap-2">
                <button onClick={() => setFeatures(Object.fromEntries(FEATURES.map(f => [f.key, true])))}
                  className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                  All on
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <button onClick={() => setFeatures(Object.fromEntries(FEATURES.map(f => [f.key, false])))}
                  className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  All off
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {FEATURES.map(f => {
                const enabled = !!features[f.key]
                return (
                  <div key={f.key}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl ring-1 transition-all ${enabled
                      ? 'bg-white dark:bg-gray-800 ring-indigo-200 dark:ring-indigo-800/40'
                      : 'bg-gray-50 dark:bg-gray-800/50 ring-gray-200 dark:ring-gray-700'}`}>
                    <div>
                      <p className={`text-sm font-bold ${enabled ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}`}>
                        {f.label}
                      </p>
                      <p className="text-[11px] text-gray-400">{f.desc}</p>
                    </div>
                    <button onClick={() => toggleFeature(f.key)}>
                      {enabled
                        ? <ToggleRight className="w-9 h-9 text-indigo-500" />
                        : <ToggleLeft  className="w-9 h-9 text-gray-300 dark:text-gray-600" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Note: all features free */}
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 ring-1 ring-emerald-200 dark:ring-emerald-800/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
              All features are included in every plan. Plans differ only by <strong>student capacity</strong> (Max Students above). Feature toggles below are available for custom overrides if needed.
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-200 dark:ring-amber-800/30">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Changing the feature preset here only affects <strong>new assignments</strong>. Schools already on this package keep their current features until re-assigned.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────
function Field({ label, hint, required, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// ── Main PackageManagement tab ────────────────────────────────
export default function PackageManagement({ schools, creds, onUpdated }) {
  const { toast }     = useToast()
  const [packages,    setPackages]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(null)
  const [search,      setSearch]      = useState('')
  const [editPkg,     setEditPkg]     = useState(null)  // ← NEW: pkg being edited
  const [assignModal, setAssignModal] = useState(null)
  const [assignPkg,   setAssignPkg]   = useState('')
  const [assignExpiry,setAssignExpiry]= useState('')
  const [assignNotes, setAssignNotes] = useState('')

  const loadPackages = useCallback(async () => {
    const { data } = await supabase.from('packages').select('*').order('display_order')
    setPackages(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadPackages() }, [loadPackages])

  const handleAssign = async () => {
    if (!assignModal || !assignPkg) return
    setSaving(assignModal.school.id)
    try {
      await callApi('/schools/set-package', creds, {
        school_id:  assignModal.school.id,
        package_id: assignPkg,
        expires_at: assignExpiry || null,
        notes:      assignNotes  || null,
      })
      toast(`Package assigned to ${assignModal.school.school_name}`, 'success')
      setAssignModal(null)
      onUpdated()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(null)
    }
  }

  const filtered = schools.filter(s => {
    const q = search.toLowerCase()
    return !q || s.school_name.toLowerCase().includes(q) || s.school_code.includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Package Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Click a package card to edit its details. Plans differ only by <strong className="text-indigo-500 dark:text-indigo-400">student capacity</strong> — all features are included in every plan.
          </p>
        </div>
      </div>

      {/* Student-count model banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800/40">
        <Users className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Pricing is based on student capacity only</p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 leading-relaxed">
            Free · 50 students &nbsp;|&nbsp; Basic · 500 students &nbsp;|&nbsp; Pro · 1,500 students &nbsp;|&nbsp; Enterprise · Custom
          </p>
        </div>
      </div>

      {/* Package tier cards — clickable to edit */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-2xl h-44" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map(pkg => {
            const a           = accentFor(pkg.plan_key)
            const features    = pkg.feature_preset ?? {}
            const enabledCnt  = Object.values(features).filter(Boolean).length
            const totalCnt    = FEATURES.length
            const schoolsOn   = schools.filter(s => s.plan === pkg.plan_key).length

            return (
              <div key={pkg.id}
                onClick={() => setEditPkg(pkg)}
                className={`relative rounded-2xl border p-5 cursor-pointer group transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${a.card} ${!pkg.is_active ? 'opacity-60' : ''}`}>

                {/* Edit badge on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-[10px] font-bold text-gray-500 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700">
                    <Edit3 className="w-3 h-3" /> Edit
                  </div>
                </div>

                {!pkg.is_active && (
                  <span className="absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 uppercase tracking-wide">
                    Inactive
                  </span>
                )}

                <div className="flex items-start justify-between mb-3 mt-1">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">{pkg.name}</h3>
                      {pkg.plan_key === 'enterprise' && <Sparkles className="w-3.5 h-3.5 text-violet-500" />}
                    </div>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {pkg.price_monthly > 0
                        ? `₹${(pkg.price_monthly / 100).toLocaleString('en-IN')}/mo`
                        : pkg.plan_key === 'free' ? '₹0 / Free' : 'Custom pricing'}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-gray-400 dark:text-gray-500 tabular-nums">{schoolsOn}</span>
                </div>

                {/* Student capacity — PRIMARY differentiator */}
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/60 dark:bg-gray-900/40 ring-1 ring-gray-200/80 dark:ring-gray-700/60">
                  <Users className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                    {pkg.max_students < 0
                      ? 'Unlimited students'
                      : `Up to ${pkg.max_students.toLocaleString('en-IN')} students`}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 mb-3 leading-relaxed min-h-[28px]">{pkg.description}</p>

                {/* All-features badge */}
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">All features included</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assign to school */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 flex-1">Assign package to school</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search schools…"
              className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 w-48 text-gray-800 dark:text-gray-200" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No schools found</div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
            {filtered.map(s => {
              const exp    = s.plan_expires_at && new Date(s.plan_expires_at) < new Date()
              const accent = accentFor(s.plan ?? 'free')
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.school_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-indigo-500">{s.school_code}</span>
                      {exp && <span className="text-[10px] font-bold text-red-500">Expired</span>}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10 ${accent.badge}`}>
                    {s.plan ?? 'free'}
                  </span>
                  <button
                    onClick={() => { setAssignModal({ school: s }); setAssignPkg(''); setAssignExpiry(''); setAssignNotes('') }}
                    disabled={saving === s.id}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 shadow-sm shadow-indigo-500/20 transition-all">
                    {saving === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Assign
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => e.target === e.currentTarget && setAssignModal(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm mx-4 p-6 animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">Assign Package</h3>
            <p className="text-xs text-gray-400 mb-5">{assignModal.school.school_name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">Select Package</label>
                <div className="space-y-2">
                  {packages.filter(p => p.is_active).map(pkg => (
                    <button key={pkg.id} onClick={() => setAssignPkg(pkg.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${assignPkg === pkg.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${accentFor(pkg.plan_key).dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{pkg.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {pkg.price_monthly > 0 ? `₹${(pkg.price_monthly / 100).toLocaleString('en-IN')}/mo` : 'Free / Custom'} · {pkg.max_students < 0 ? '∞' : pkg.max_students} students
                        </p>
                      </div>
                      {assignPkg === pkg.id && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Expiry Date <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input type="date" value={assignExpiry} onChange={e => setAssignExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input type="text" value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
                  placeholder="e.g. Paid via UPI — Ref: TXN123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setAssignModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                Cancel
              </button>
              <button onClick={handleAssign} disabled={!assignPkg || !!saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Assign Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit drawer */}
      {editPkg && (
        <PackageEditDrawer
          pkg={editPkg}
          creds={creds}
          onClose={() => setEditPkg(null)}
          onSaved={loadPackages}
        />
      )}
    </div>
  )
}
