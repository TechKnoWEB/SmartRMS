// src/pages/admin/Settings.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useClassesAdmin } from '../../hooks/useSections'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import ConfirmDelete from '../../components/ui/ConfirmDelete'
import {
  Plus, Trash2, Edit2, Save, Upload, Download,
  FileSpreadsheet, AlertTriangle, CheckCircle2,
  ToggleLeft, ToggleRight, Image, X, GraduationCap,
  Loader2, Settings as SettingsIcon, School, Palette,
  BookOpen, Layers, Info, Sparkles, Shield,
  Building2, Mail, Phone, MapPin, Calendar, Type,
  ChevronRight, Search, FileText, Clipboard,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  downloadSubjectsTemplate,
  parseSubjectsExcel,
  validateSubjectRows,
} from '../../utils/exportExcel'

const EMPTY_CFG = {
  subject_name: '', display_order: '', has_internal: true, divisor: 1,
  max_t1: '', max_t1_int: '', max_t2: '', max_t2_int: '', max_t3: '', max_t3_int: '',
  term_names: 'Term 1,Term 2,Term 3',
}

const EMPTY_CLASS = { class_name: '', sections: '', display_order: '' }

/* ─── Section Header Component ─── */
function SectionHeader({ icon: Icon, title, description, accent = 'indigo', children }) {
  const accents = {
    indigo: 'from-indigo-50 to-indigo-100/40 dark:from-indigo-900/30 dark:to-indigo-900/10',
    purple: 'from-purple-50 to-purple-100/40 dark:from-purple-900/30 dark:to-purple-900/10',
    emerald: 'from-emerald-50 to-emerald-100/40 dark:from-emerald-900/30 dark:to-emerald-900/10',
    amber: 'from-amber-50 to-amber-100/40 dark:from-amber-900/30 dark:to-amber-900/10',
  }
  const iconColors = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  }
  return (
    <div className={`px-5 py-4 bg-gradient-to-r ${accents[accent]} border-b border-gray-100 dark:border-gray-800`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${iconColors[accent]}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ─── Edit Cell ─── */
function EditCell({ value, onChange, type = 'text' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={`w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 transition-all hover:border-gray-300 dark:hover:border-gray-600${
        type === 'number' ? ' min-w-[4.5rem]' : ''
      }`}
    />
  )
}

// ── Bulk subjects import modal ────────────────────────────────
function BulkSubjectsModal({ open, onClose, className: selClass, schoolId, existingSubjects, onSuccess }) {
  const fileRef  = useRef(null)
  const [step,       setStep]       = useState('upload')
  const [validRows,  setValidRows]  = useState([])
  const [errorRows,  setErrorRows]  = useState([])
  const [fileName,   setFileName]   = useState('')
  const [parseError, setParseError] = useState('')
  const [importing,  setImporting]  = useState(false)
  const [dragOver,   setDragOver]   = useState(false)

  const reset = () => {
    setStep('upload'); setValidRows([]); setErrorRows([])
    setFileName(''); setParseError(''); setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = async (file) => {
    if (!file) return
    setParseError(''); setFileName(file.name)
    try {
      const rows = await parseSubjectsExcel(file)
      if (!rows.length) { setParseError('No data rows found.'); return }
      const { valid, errors } = validateSubjectRows(rows, selClass, schoolId)
      setValidRows(valid); setErrorRows(errors); setStep('preview')
    } catch (e) { setParseError(e.message) }
  }

  const handleImport = async () => {
    setImporting(true)
    const { error: importErr } = await supabase.from('config').upsert(validRows,
      { onConflict: 'school_id,class_name,subject_name' })
    setImporting(false)
    if (importErr) { toast.error(importErr.message); return }
    toast.success(`${validRows.length} subjects imported/updated.`)
    onSuccess(); reset(); onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Bulk Import Subjects" size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6 px-1">
        {['Upload', 'Preview'].map((label, i) => {
          const stepKey = ['upload', 'preview'][i]
          const active = step === stepKey
          const done = step === 'preview' && i === 0
          return (
            <div key={label} className="flex items-center gap-2.5">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ring-2
                ${done
                  ? 'bg-emerald-500 text-white ring-emerald-200 dark:ring-emerald-800'
                  : active
                    ? 'bg-indigo-600 text-white ring-indigo-200 dark:ring-indigo-800 shadow-sm shadow-indigo-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 ring-gray-200 dark:ring-gray-700'
                }`}>
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-sm font-semibold transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400' : done ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                {label}
              </span>
              {i === 0 && (
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-1" />
              )}
            </div>
          )
        })}
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/20 p-4 flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0">
              <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Download Template</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400/70 mt-0.5">Pre-filled with current subjects for easy editing.</p>
            </div>
            <Button size="sm" variant="secondary"
              onClick={() => downloadSubjectsTemplate(selClass, existingSubjects)}>
              <Download className="w-3.5 h-3.5" /> Template
            </Button>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
              ${dragOver
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto mb-3">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
            {fileName
              ? <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{fileName}</p>
              : (
                <>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Drop file or click to browse</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Supports .xlsx, .xls, .csv</p>
                </>
              )}
          </div>
          {parseError && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl ring-1 ring-emerald-200/50 dark:ring-emerald-800/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{validRows.length} valid rows</span>
            </div>
            {errorRows.length > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl ring-1 ring-red-200/50 dark:ring-red-800/30">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{errorRows.length} errors (skipped)</span>
              </div>
            )}
          </div>
          {errorRows.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 p-3 space-y-1 max-h-28 overflow-y-auto">
              {errorRows.map((e, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400">
                  <span className="font-bold">Row {e.rowNum}</span>{e.subject_name ? ` (${e.subject_name})` : ''}: {e.issues.join(' · ')}
                </p>
              ))}
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-64">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>{['Subject', 'Order', 'Internal', 'T1', 'T2', 'T3', 'Divisor'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-[10px]">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {validRows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{r.subject_name}</td>
                    <td className="px-3 py-2 tabular-nums">{r.display_order}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${r.has_internal ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        {r.has_internal ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.max_t1}{r.max_t1_int ? `+${r.max_t1_int}` : ''}</td>
                    <td className="px-3 py-2 tabular-nums">{r.max_t2}{r.max_t2_int ? `+${r.max_t2_int}` : ''}</td>
                    <td className="px-3 py-2 tabular-nums">{r.max_t3}{r.max_t3_int ? `+${r.max_t3_int}` : ''}</td>
                    <td className="px-3 py-2 tabular-nums">÷{r.divisor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 justify-between pt-2">
            <Button variant="secondary" onClick={() => { setStep('upload'); setFileName('') }}>
              ← Re-upload
            </Button>
            <Button onClick={handleImport} loading={importing} disabled={!validRows.length}>
              Import {validRows.length} Subject{validRows.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Logo / Letterhead Upload ──────────────────────────────────
function AssetUpload({ label, field, currentUrl, schoolId, onUploaded, icon: AssetIcon = Image }) {
  const fileRef    = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState(currentUrl || null)

  const handleFile = async (file) => {
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, WebP, or SVG image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be under 2 MB.')
      return
    }
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${schoolId}/${field}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('school-assets')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) { toast.error(upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('school-assets')
      .getPublicUrl(path)

    const { error: urlErr } = await supabase.from('schools')
      .update({ [field]: publicUrl }).eq('id', schoolId)
    setUploading(false)
    if (urlErr) { toast.error(urlErr.message); return }
    setPreview(publicUrl)
    onUploaded(publicUrl)
    toast.success(`${label} uploaded!`)
  }

  const handleRemove = async () => {
    const { error: removeErr } = await supabase.from('schools')
      .update({ [field]: null }).eq('id', schoolId)
    if (removeErr) { toast.error(removeErr.message); return }
    setPreview(null)
    onUploaded(null)
    toast.success(`${label} removed.`)
  }

  return (
    <div className="group rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 p-5 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
          <AssetIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</p>
      </div>
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt={label}
            className="h-20 max-w-48 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 shadow-sm" />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all duration-150 shadow-sm hover:scale-110 active:scale-95"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-all duration-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 w-full"
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          {uploading ? (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {uploading ? 'Uploading…' : `Upload ${label}`}
            </span>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Click or drag to upload</p>
          </div>
        </div>
      )}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2.5 flex items-center gap-1">
        <Info className="w-3 h-3" />
        PNG, JPG, SVG · max 2 MB · Recommended: transparent PNG
      </p>
    </div>
  )
}

// ── Main Settings Page ────────────────────────────────────────
export default function Settings() {
  const { user, can } = useAuth()
  const { classRecords, classesLoading, refreshClasses } = useClassesAdmin()

  const [selClass,     setSelClass]     = useState('')
  const [config,       setConfig]       = useState([])
  const [loading,      setLoading]      = useState(false)
  const [modal,        setModal]        = useState({ open: false, mode: 'add', data: { ...EMPTY_CFG } })
  const [saving,       setSaving]       = useState(false)
  const [schoolForm,   setSchoolForm]   = useState({
    school_name: '', tagline: '', academic_session: '',
    address: '', contact_email: '', contact_phone: '',
    logo_url: null, letterhead_url: null,
  })
  const [schoolSaving, setSchoolSaving] = useState(false)
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [bulkRows,     setBulkRows]     = useState([])
  const [bulkSaving,   setBulkSaving]   = useState(false)
  const [bulkOpen,     setBulkOpen]     = useState(false)

  const [classModal,   setClassModal]   = useState({ open: false, mode: 'add', data: { ...EMPTY_CLASS } })
  const [classSaving,  setClassSaving]  = useState(false)
  const [deleteClass,  setDeleteClass]  = useState(null)
  const [deleteSubject, setDeleteSubject] = useState(null) // { id, subject_name }

  useEffect(() => {
    supabase.from('schools').select('*').eq('id', user.school_id).single()
      .then(({ data }) => {
        if (data) setSchoolForm({
          school_name:     data.school_name    || '',
          tagline:         data.tagline        || '',
          academic_session:data.academic_session || '',
          address:         data.address        || '',
          contact_email:   data.contact_email  || '',
          contact_phone:   data.contact_phone  || '',
          logo_url:        data.logo_url       || null,
          letterhead_url:  data.letterhead_url || null,
        })
      })
  }, [user])

  const loadConfig = async (cls) => {
    if (!cls) return
    setLoading(true)
    const { data } = await supabase
      .from('config').select('*')
      .eq('class_name', cls).eq('school_id', user.school_id)
      .order('display_order')
    setConfig(data || [])
    setBulkRows((data || []).map(r => ({ ...r })))
    setLoading(false)
  }

  useEffect(() => { loadConfig(selClass) }, [selClass, user])

  const saveSchool = async () => {
    setSchoolSaving(true)
    const { error } = await supabase.from('schools').update({
      school_name:      schoolForm.school_name,
      tagline:          schoolForm.tagline,
      academic_session: schoolForm.academic_session,
      address:          schoolForm.address,
      contact_email:    schoolForm.contact_email,
      contact_phone:    schoolForm.contact_phone,
    }).eq('id', user.school_id)
    setSchoolSaving(false)
    if (error) toast.error(error.message)
    else toast.success('School info saved!')
  }

  const handleSave = async () => {
    setSaving(true)
    const d = modal.data
    const toInt = v => (v === '' || v == null) ? 0 : parseInt(v) || 0
    const payload = {
      subject_name:  d.subject_name?.trim(),
      display_order: toInt(d.display_order),
      has_internal:  d.has_internal,
      divisor:       parseFloat(d.divisor) || 1,
      max_t1: toInt(d.max_t1), max_t1_int: toInt(d.max_t1_int),
      max_t2: toInt(d.max_t2), max_t2_int: toInt(d.max_t2_int),
      max_t3: toInt(d.max_t3), max_t3_int: toInt(d.max_t3_int),
      term_names: d.term_names || 'Term 1,Term 2,Term 3',
      class_name: selClass,
      school_id:  user.school_id,
      ...(modal.mode === 'edit' ? { id: modal.data.id } : {}),
    }
    if (!payload.subject_name) { toast.error('Subject name is required.'); setSaving(false); return }
    const { error: saveErr } = await supabase.from('config').upsert([payload],
      { onConflict: 'school_id,class_name,subject_name' })
    setSaving(false)
    if (saveErr) { toast.error(saveErr.message); return }
    toast.success(modal.mode === 'add' ? 'Subject added!' : 'Subject updated!')
    setModal(m => ({ ...m, open: false }))
    loadConfig(selClass)
  }

  const handleDelete = (row) => setDeleteSubject(row)

  const confirmDeleteSubject = async () => {
    const { error: delErr } = await supabase.from('config').delete().eq('id', deleteSubject.id)
    if (delErr) { toast.error(delErr.message); return }
    toast.success('Deleted.')
    setDeleteSubject(null)
    loadConfig(selClass)
  }

  const handleBulkSave = async () => {
    setBulkSaving(true)
    const toInt = v => (v === '' || v == null) ? 0 : parseInt(v) || 0
    const rows  = bulkRows.map(r => ({
      id: r.id,
      subject_name:  String(r.subject_name || '').trim(),
      display_order: toInt(r.display_order),
      has_internal:  r.has_internal,
      divisor:       parseFloat(r.divisor) || 1,
      max_t1: toInt(r.max_t1), max_t1_int: toInt(r.max_t1_int),
      max_t2: toInt(r.max_t2), max_t2_int: toInt(r.max_t2_int),
      max_t3: toInt(r.max_t3), max_t3_int: toInt(r.max_t3_int),
      term_names: r.term_names || 'Term 1,Term 2,Term 3',
      class_name: selClass, school_id: user.school_id,
    }))
    if (rows.some(r => !r.subject_name)) { toast.error('All subjects must have a name.'); setBulkSaving(false); return }
    const { error: bulkErr } = await supabase.from('config').upsert(rows,
      { onConflict: 'school_id,class_name,subject_name' })
    setBulkSaving(false)
    if (bulkErr) { toast.error(bulkErr.message); return }
    toast.success('All subjects saved!')
    setBulkEditMode(false)
    loadConfig(selClass)
  }

  const updateBulkRow = (idx, field, value) => {
    setBulkRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const handleSaveClass = async () => {
    setClassSaving(true)
    const { data: frm } = classModal
    if (!frm.class_name?.trim()) { toast.error('Class name is required.'); setClassSaving(false); return }
    const sections = frm.sections
      ? frm.sections.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      : []
    const classData = {
      class_name:    frm.class_name.trim(),
      sections,
      display_order: parseInt(frm.display_order) || 0,
      school_id:     user.school_id,
      ...(classModal.mode === 'edit' ? { id: frm.id } : {}),
    }
    const { error: classErr } = await supabase.from('classes').upsert(
      classData, { onConflict: 'school_id,class_name' })
    setClassSaving(false)
    if (classErr) { toast.error(classErr.message); return }
    toast.success(classModal.mode === 'add' ? 'Class added!' : 'Class updated!')
    setClassModal(m => ({ ...m, open: false }))
    refreshClasses()
  }

  const handleDeleteClass = async () => {
    const { error: delClassErr } = await supabase.from('classes').delete()
      .eq('school_id', user.school_id).eq('class_name', deleteClass)
    if (delClassErr) { toast.error(delClassErr.message); return }
    toast.success('Class deleted.')
    setDeleteClass(null)
    refreshClasses()
    if (selClass === deleteClass) setSelClass('')
  }

  const classOpts = [
    { value: '', label: '-- Select Class --' },
    ...classRecords.map(c => ({ value: c.class_name, label: c.class_name })),
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ═══ HERO HEADER ═══════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-6 sm:px-8 py-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute top-5 right-20 w-2 h-2 bg-white/20 rounded-full" />
        <div className="absolute bottom-6 right-44 w-1.5 h-1.5 bg-white/15 rounded-full" />

        <div className="relative flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Settings</h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              School info, branding, classes & subject configuration
            </p>
          </div>
        </div>
      </div>

      {/* ── School Information ─────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden">
        <SectionHeader icon={Building2} title="School Information" description="Basic details shown on reports and dashboard" accent="indigo" />
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="School Name" value={schoolForm.school_name}
              onChange={e => setSchoolForm(f => ({ ...f, school_name: e.target.value }))} />
            <Input label="Address" value={schoolForm.tagline}
              onChange={e => setSchoolForm(f => ({ ...f, tagline: e.target.value }))} />
            <Input label="Academic Session" placeholder="e.g. 2026-27" value={schoolForm.academic_session}
              onChange={e => setSchoolForm(f => ({ ...f, academic_session: e.target.value }))} />
            <Input label="Tagline / Motto" value={schoolForm.address}
              onChange={e => setSchoolForm(f => ({ ...f, address: e.target.value }))} />
            <Input label="Contact Email" type="email" value={schoolForm.contact_email}
              onChange={e => setSchoolForm(f => ({ ...f, contact_email: e.target.value }))} />
            <Input label="Contact Phone" value={schoolForm.contact_phone}
              onChange={e => setSchoolForm(f => ({ ...f, contact_phone: e.target.value }))} />
          </div>
          <div className="flex justify-end mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button onClick={saveSchool} loading={schoolSaving} className="!rounded-xl !px-5">
              <Save className="w-4 h-4" /> Save School Info
            </Button>
          </div>
        </div>
      </div>

      {/* ── Logo & Letterhead ──────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden">
        <SectionHeader icon={Palette} title="Branding Assets" description="Logo and letterhead for report cards" accent="purple" />
        <div className="p-5 sm:p-6">
          <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 px-4 py-3 mb-5 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              Your school logo appears on report cards. The letterhead is used as a background on printed reports.
              Both are stored securely and served publicly.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AssetUpload
              label="School Logo"
              field="logo_url"
              currentUrl={schoolForm.logo_url}
              schoolId={user.school_id}
              onUploaded={url => setSchoolForm(f => ({ ...f, logo_url: url }))}
              icon={Image}
            />
            <AssetUpload
              label="Letterhead / Watermark"
              field="letterhead_url"
              currentUrl={schoolForm.letterhead_url}
              schoolId={user.school_id}
              onUploaded={url => setSchoolForm(f => ({ ...f, letterhead_url: url }))}
              icon={FileText}
            />
          </div>
        </div>
      </div>

      {/* ── Classes Management ─────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden">
        <SectionHeader icon={GraduationCap} title="Classes & Sections" description="Define your school structure" accent="emerald">
          {can('write') && (
            <Button size="sm" className="!rounded-xl"
              onClick={() => setClassModal({ open: true, mode: 'add', data: { ...EMPTY_CLASS } })}>
              <Plus className="w-3.5 h-3.5" /> Add Class
            </Button>
          )}
        </SectionHeader>
        <div className="p-5 sm:p-6">
          <div className="rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/40 px-4 py-3 mb-5 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Students, subjects, and marks all reference these classes. Adding a class here means teachers can select it before any students exist.
            </p>
          </div>

          {classesLoading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <div className="relative">
                <div className="h-8 w-8 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
                <div className="absolute inset-0 h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-xs text-gray-400 font-medium">Loading classes…</p>
            </div>
          ) : classRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 ring-1 ring-gray-200/50 dark:ring-gray-700">
                <GraduationCap className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No classes defined yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add your first class to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60">
                    {['Order', 'Class Name', 'Sections', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {classRecords.map(c => (
                    <tr key={c.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors duration-150">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums ring-1 ring-gray-200/50 dark:ring-gray-700/50">
                          {c.display_order}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                        {c.class_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(c.sections || []).map(s => (
                            <span key={s} className="text-[10px] px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold ring-1 ring-indigo-100 dark:ring-indigo-800/40">
                              {s}
                            </span>
                          ))}
                          {(!c.sections || c.sections.length === 0) && (
                            <span className="text-[10px] text-gray-400 italic">No sections</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {can('write') && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setClassModal({
                                open: true, mode: 'edit',
                                data: { ...c, sections: (c.sections || []).join(', ') },
                              })}
                              className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-150 hover:scale-110 active:scale-95"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteClass(c.class_name)}
                              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 hover:scale-110 active:scale-95"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Subject Configuration ──────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/80 dark:ring-gray-800/80 shadow-sm overflow-hidden">
        <SectionHeader icon={BookOpen} title="Subject Configuration" description="Manage subjects, max marks & term settings" accent="amber" />
        <div className="p-5 sm:p-6">
          {/* Filter + actions bar */}
          <div className="flex gap-3 flex-wrap items-end mb-5">
            <div className="min-w-[180px]">
              <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Class
              </label>
              <Select options={classOpts} value={selClass}
                onChange={e => { setSelClass(e.target.value); setBulkEditMode(false) }} />
            </div>
            {selClass && can('write') && (
              <div className="flex gap-2 flex-wrap ml-auto">
                {!bulkEditMode ? (
                  <>
                    <Button size="sm" className="!rounded-xl" onClick={() => setModal({ open: true, mode: 'add', data: { ...EMPTY_CFG } })}>
                      <Plus className="w-3.5 h-3.5" /> Add Subject
                    </Button>
                    <Button size="sm" variant="secondary" className="!rounded-xl"
                      onClick={() => { setBulkEditMode(true); setBulkRows(config.map(r => ({ ...r }))) }}>
                      <Edit2 className="w-3.5 h-3.5" /> Bulk Edit
                    </Button>
                    <Button size="sm" variant="secondary" className="!rounded-xl" onClick={() => setBulkOpen(true)}>
                      <Upload className="w-3.5 h-3.5" /> Import
                    </Button>
                    <Button size="sm" variant="secondary" className="!rounded-xl" onClick={() => downloadSubjectsTemplate(selClass, config)}>
                      <Download className="w-3.5 h-3.5" /> Export
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" className="!rounded-xl" onClick={handleBulkSave} loading={bulkSaving}>
                      <Save className="w-3.5 h-3.5" /> Save All
                    </Button>
                    <Button size="sm" variant="secondary" className="!rounded-xl"
                      onClick={() => { setBulkEditMode(false); setBulkRows(config.map(r => ({ ...r }))) }}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bulk edit banner */}
          {bulkEditMode && (
            <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40 px-4 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Bulk Edit Mode</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">
                  Click any cell to edit inline. Click <strong>Save All</strong> when done.
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-36 gap-3">
              <div className="relative">
                <div className="h-8 w-8 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
                <div className="absolute inset-0 h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-xs text-gray-400 font-medium">Loading subjects…</p>
            </div>
          ) : (bulkEditMode ? bulkRows : config).length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/60">
                    {['Order', 'Subject', 'T1 Wrt', 'T1 Int', 'T2 Wrt', 'T2 Int', 'T3 Wrt', 'T3 Int', 'Divisor', 'Internal', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {(bulkEditMode ? bulkRows : config).map((c, idx) => (
                    <tr key={c.id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors duration-150">
                      <td className="px-3 py-2.5 w-24">
                        {bulkEditMode
                          ? <EditCell value={c.display_order} type="number" onChange={v => updateBulkRow(idx, 'display_order', v)} />
                          : <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-400 tabular-nums">{c.display_order}</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 font-semibold min-w-[140px] text-gray-800 dark:text-gray-200">
                        {bulkEditMode
                          ? <EditCell value={c.subject_name} onChange={v => updateBulkRow(idx, 'subject_name', v)} />
                          : c.subject_name
                        }
                      </td>
                      {['max_t1', 'max_t1_int', 'max_t2', 'max_t2_int', 'max_t3', 'max_t3_int'].map(field => (
                        <td key={field} className="px-3 py-2.5 w-24">
                          {bulkEditMode
                            ? <EditCell value={c[field]} type="number" onChange={v => updateBulkRow(idx, field, v)} />
                            : <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400">{c[field] || '0'}</span>
                          }
                        </td>
                      ))}
                      <td className="px-3 py-2.5 w-24">
                        {bulkEditMode
                          ? <EditCell value={c.divisor} type="number" onChange={v => updateBulkRow(idx, 'divisor', v)} />
                          : <span className="text-xs font-mono tabular-nums text-gray-500">÷{c.divisor}</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 w-20">
                        {bulkEditMode ? (
                          <button onClick={() => updateBulkRow(idx, 'has_internal', !c.has_internal)}
                            className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-150 hover:scale-105 active:scale-95 ${
                              c.has_internal
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            }`}>
                            {c.has_internal ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            {c.has_internal ? 'Yes' : 'No'}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${
                            c.has_internal
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}>
                            {c.has_internal ? 'Yes' : 'No'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {!bulkEditMode && can('write') && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setModal({ open: true, mode: 'edit', data: { ...c } })}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-150 hover:scale-110 active:scale-95"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 hover:scale-110 active:scale-95"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : selClass ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 ring-1 ring-gray-200/50 dark:ring-gray-700">
                <BookOpen className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No subjects configured</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add subjects for {selClass} to start entering marks.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center ring-1 ring-amber-100 dark:ring-amber-800/30">
                  <Search className="w-7 h-7 text-amber-300 dark:text-amber-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-amber-500" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-4">Select a class</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Choose a class above to manage its subject configuration.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODALS ════════════════════════════════════════════ */}

      {/* Subject Modal */}
      <Modal open={modal.open} onClose={() => setModal(m => ({ ...m, open: false }))}
        title={modal.mode === 'add' ? 'Add Subject' : 'Edit Subject'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Subject Name" value={modal.data.subject_name}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, subject_name: e.target.value } }))} />
          <Input label="Display Order" type="number" value={modal.data.display_order}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, display_order: e.target.value } }))} />
          {[['max_t1', 'T1 Written Max'], ['max_t1_int', 'T1 Internal Max'], ['max_t2', 'T2 Written Max'], ['max_t2_int', 'T2 Internal Max'], ['max_t3', 'T3 Written Max'], ['max_t3_int', 'T3 Internal Max'], ['divisor', 'Divisor']].map(([k, lbl]) => (
            <Input key={k} label={lbl} type="number" value={modal.data[k]}
              onChange={e => setModal(m => ({ ...m, data: { ...m.data, [k]: e.target.value } }))} />
          ))}
          <Select label="Has Internal Marks?" value={String(modal.data.has_internal)}
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, has_internal: e.target.value === 'true' } }))} />
          <Input label="Term Names (comma-separated)" className="col-span-2"
            value={modal.data.term_names} placeholder="Term 1,Term 2,Term 3"
            onChange={e => setModal(m => ({ ...m, data: { ...m.data, term_names: e.target.value } }))} />
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" className="!rounded-xl" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
          <Button className="!rounded-xl" onClick={handleSave} loading={saving}>Save</Button>
        </div>
      </Modal>

      {/* Class Modal */}
      <Modal open={classModal.open} onClose={() => setClassModal(m => ({ ...m, open: false }))}
        title={classModal.mode === 'add' ? 'Add Class' : 'Edit Class'} size="sm">
        <div className="space-y-4">
          <Input label="Class Name" placeholder="e.g. Class 9" value={classModal.data.class_name}
            disabled={classModal.mode === 'edit'}
            onChange={e => setClassModal(m => ({ ...m, data: { ...m.data, class_name: e.target.value } }))} />
          <Input label="Sections (comma-separated)" placeholder="e.g. A, B, C"
            value={classModal.data.sections}
            onChange={e => setClassModal(m => ({ ...m, data: { ...m.data, sections: e.target.value } }))} />
          <Input label="Display Order" type="number" value={classModal.data.display_order}
            onChange={e => setClassModal(m => ({ ...m, data: { ...m.data, display_order: e.target.value } }))} />
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" className="!rounded-xl" onClick={() => setClassModal(m => ({ ...m, open: false }))}>Cancel</Button>
          <Button className="!rounded-xl" onClick={handleSaveClass} loading={classSaving}>Save</Button>
        </div>
      </Modal>

      {/* Delete subject confirmation */}
      <ConfirmDelete
        open={!!deleteSubject}
        onClose={() => setDeleteSubject(null)}
        onConfirm={confirmDeleteSubject}
        title="Delete Subject"
        itemName={deleteSubject?.subject_name}
      />

      {/* Delete class confirmation */}
      <ConfirmDelete
        open={!!deleteClass}
        onClose={() => setDeleteClass(null)}
        onConfirm={handleDeleteClass}
        title="Delete Class"
        itemName={deleteClass}
        fetchCount={deleteClass ? async () => {
          const [{ count: students }, { count: subjects }] = await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true })
              .eq('school_id', user.school_id).eq('class_name', deleteClass),
            supabase.from('config').select('*', { count: 'exact', head: true })
              .eq('school_id', user.school_id).eq('class_name', deleteClass),
          ])
          return [
            { label: 'students in this class', count: students || 0 },
            { label: 'subject configs', count: subjects || 0 },
          ]
        } : null}
      />

      {/* Bulk subjects import modal */}
      <BulkSubjectsModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        className={selClass}
        schoolId={user.school_id}
        existingSubjects={config}
        onSuccess={() => loadConfig(selClass)}
      />
    </div>
  )
}