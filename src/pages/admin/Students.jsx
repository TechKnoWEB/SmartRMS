// src/pages/admin/Students.jsx
import { useEffect, useRef, useState } from 'react'
import { useStudents } from '../../hooks/useStudents'
import { useClasses, useSections } from '../../hooks/useSections'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import ConfirmDelete from '../../components/ui/ConfirmDelete'
import { Plus, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Users, Search, GraduationCap, Filter, UserPlus, Trash2, Pencil, ChevronRight, X, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  exportStudentsToExcel,
  downloadBulkTemplate,
  parseBulkExcel,
  validateBulkRows,
} from '../../utils/exportExcel'

const EMPTY = {
  name: '', roll: '', class_name: '', section: '',
  father_name: '', mother_name: '', dob: '', admission_no: '',
}

// ─── Bulk Upload Modal ────────────────────────────────────────
function BulkUploadModal({ open, onClose, onSuccess }) {
  const { bulkImport } = useStudents()
  const fileRef = useRef(null)

  const [step,          setStep]          = useState('upload')
  const [manualClass,   setManualClass]   = useState('')
  const [manualSection, setManualSection] = useState('')
  const [validRows,     setValidRows]     = useState([])
  const [errorRows,     setErrorRows]     = useState([])
  const [importing,     setImporting]     = useState(false)
  const [importResult,  setImportResult]  = useState(null)
  const [dragOver,      setDragOver]      = useState(false)
  const [fileName,      setFileName]      = useState('')
  const [parseError,    setParseError]    = useState('')

  const reset = () => {
    setStep('upload'); setManualClass(''); setManualSection('')
    setValidRows([]); setErrorRows([]); setImporting(false)
    setImportResult(null); setFileName(''); setParseError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = async (file) => {
    if (!file) return
    setParseError(''); setFileName(file.name)
    try {
      const rows = await parseBulkExcel(file)
      if (!rows.length) { setParseError('The file has no data rows.'); return }
      const { valid, errors } = validateBulkRows(
        rows, manualClass.trim() || null, manualSection.trim() || null,
      )
      setValidRows(valid); setErrorRows(errors)
      setStep('preview')
    } catch (e) { setParseError(e.message) }
  }

  const handleImport = async () => {
    setImporting(true)
    const res = await bulkImport(validRows)
    setImporting(false)
    if (res.success) {
      setImportResult({ success: true, count: res.count })
      setStep('result')
      onSuccess([...new Set(validRows.map(r => r.class_name))])
    } else {
      setImportResult({ success: false, message: res.message })
      setStep('result')
    }
  }

  const combos = validRows.reduce((acc, r) => {
    const k = `${r.class_name} – ${r.section}`
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const stepIndex = ['upload', 'preview', 'result'].indexOf(step)

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Bulk Student Import" size="xl">
      {/* Stepper */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between">
          {['Upload File', 'Preview & Validate', 'Complete'].map((label, i) => {
            const active = stepIndex === i
            const done = stepIndex > i
            return (
              <div key={label} className="flex-1 flex flex-col items-center relative z-10">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-300 shadow-sm
                  ${done
                    ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-200 dark:shadow-green-900/30'
                    : active
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-900/30 ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }
                `}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`
                  mt-2 text-xs font-medium transition-colors duration-200
                  ${active ? 'text-indigo-600 dark:text-indigo-400' : done ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}
                `}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        {/* Progress bar connecting steps */}
        <div className="absolute top-5 left-[16.67%] right-[16.67%] h-0.5 bg-gray-200 dark:bg-gray-700 -translate-y-1/2">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-indigo-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: stepIndex === 0 ? '0%' : stepIndex === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {step === 'upload' && (
        <div className="space-y-5">
          {/* Override section */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/30 p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Override Class &amp; Section</p>
                <p className="text-xs text-slate-400">Leave blank to read from the file's own columns.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Override Class (optional)" placeholder="e.g. Class 9"
                value={manualClass} onChange={e => setManualClass(e.target.value)} />
              <Input label="Override Section (optional)" placeholder="e.g. A"
                value={manualSection} onChange={e => setManualSection(e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* Template download */}
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 via-indigo-50/50 to-purple-50 dark:from-indigo-900/30 dark:via-indigo-900/20 dark:to-purple-900/20 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 flex-shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Download Template First</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Includes Class and Sec columns — mix multiple classes in one file.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => downloadBulkTemplate(manualClass, manualSection)}>
              <Download className="w-3.5 h-3.5" /> Template
            </Button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
              transition-all duration-300 group
              ${dragOver
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
                : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
              }
            `}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
            <div className={`
              w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center
              transition-all duration-300
              ${dragOver
                ? 'bg-indigo-100 dark:bg-indigo-800'
                : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800'
              }
            `}>
              <Upload className={`w-7 h-7 transition-colors duration-300 ${dragOver ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`} />
            </div>
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-semibold text-indigo-600">{fileName}</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Drop your file here or <span className="text-indigo-600 dark:text-indigo-400 font-semibold">click to browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls, .csv files</p>
              </>
            )}
          </div>
          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {/* Status badges */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm font-bold text-green-700 dark:text-green-400">{validRows.length} valid rows</span>
            </div>
            {errorRows.length > 0 && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{errorRows.length} rows with errors (skipped)</span>
              </div>
            )}
          </div>

          {/* Class combos */}
          {Object.keys(combos).length > 0 && (
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/10 p-4">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-wider">Import destinations</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(combos).map(([k, c]) => (
                  <span key={k} className="
                    inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                    bg-white dark:bg-indigo-900/40
                    ring-1 ring-indigo-200 dark:ring-indigo-700
                    text-indigo-700 dark:text-indigo-300 font-semibold
                    shadow-sm
                  ">
                    <GraduationCap className="w-3 h-3" />
                    {k} — {c} student{c !== 1 ? 's' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error details */}
          {errorRows.length > 0 && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 max-h-32 overflow-y-auto">
              <div className="space-y-1">
                {errorRows.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                    <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><span className="font-bold">Row {e.rowNum}</span>{e.name && e.name !== '(blank)' ? ` (${e.name})` : ''}: {e.issues.join(' · ')}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          {validRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-72 shadow-sm">
              <table className="min-w-full text-xs">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 sticky top-0">
                  <tr>{['Class','Sec','Roll','Name','Father','Mother','DOB','Adm No','Remedial'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {validRows.map((r, i) => (
                    <tr key={i} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                      <td className="px-3 py-2 font-bold text-indigo-700 dark:text-indigo-400">{r.class_name}</td>
                      <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">{r.section}</td>
                      <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">{r.roll}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{r.name}</td>
                      <td className="px-3 py-2 text-gray-500">{r.father_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{r.mother_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{r.dob || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{r.admission_no || '—'}</td>
                      <td className="px-3 py-2">{r.remedial_flag ? <Badge variant="red">Yes</Badge> : <Badge variant="green">No</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3 justify-between pt-3">
            <Button variant="secondary" onClick={() => { setStep('upload'); setFileName('') }}>
              ← Re-upload
            </Button>
            <Button onClick={handleImport} loading={importing} disabled={!validRows.length}>
              <Upload className="w-4 h-4" />
              Import {validRows.length} Student{validRows.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {step === 'result' && importResult && (
        <div className="text-center py-10 space-y-5">
          {importResult.success ? (
            <>
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-200 dark:shadow-green-900/40 mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mt-4">Import Successful!</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{importResult.count}</span> students imported successfully.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-xl shadow-red-200 dark:shadow-red-900/40 mx-auto">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mt-4">Import Failed</h3>
                <p className="text-sm text-red-500 dark:text-red-400 mt-2">{importResult.message}</p>
              </div>
            </>
          )}
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="secondary" onClick={reset}>Import More</Button>
            <Button onClick={() => { reset(); onClose() }}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Main Students Page ───────────────────────────────────────
export default function Students() {
  const { can } = useAuth()
  const { students, loading, fetchStudents, addStudent, updateStudent, deleteStudent, bulkDelete, getMarksCount } = useStudents()
  const { classOpts, refreshClasses } = useClasses()

  const [filter,    setFilter]    = useState({ class_name: '', section: '' })
  const [modal,     setModal]     = useState({ open: false, mode: 'add', data: EMPTY })
  const [delModal,  setDelModal]  = useState({ open: false, id: null, name: '', class_name: '' })
  const [bulkOpen,  setBulkOpen]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [selected,  setSelected]  = useState(new Set())   // bulk selection
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { sectionOpts, refreshSections } = useSections(filter.class_name)

  useEffect(() => {
    if (filter.class_name) fetchStudents(filter.class_name, filter.section || undefined)
  }, [filter])

  const handleSave = async () => {
    setSaving(true)
    const { data } = modal
    const res = modal.mode === 'add'
      ? await addStudent(data)
      : await updateStudent(data.id, data)
    setSaving(false)
    if (res.success) {
      toast.success(modal.mode === 'add' ? 'Student added!' : 'Student updated!')
      setModal(m => ({ ...m, open: false }))
      refreshClasses(); refreshSections()
      fetchStudents(filter.class_name, filter.section || undefined)
    } else toast.error(res.message)
  }

  const handleDelete = async () => {
    const res = await deleteStudent(delModal.id, delModal.class_name)
    if (res.success) {
      toast.success(`Student deleted.${res.marksDeleted ? ` ${res.marksDeleted} marks records also removed.` : ''}`)
      setDelModal({ open: false, id: null, name: '', class_name: '' })
      fetchStudents(filter.class_name, filter.section || undefined)
    } else toast.error(res.message)
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} selected student(s)? This will also remove their marks.`)) return
    setBulkDeleting(true)
    const res = await bulkDelete([...selected], filter.class_name)
    setBulkDeleting(false)
    if (res.success) {
      toast.success(`${res.count} student(s) deleted.`)
      setSelected(new Set())
      fetchStudents(filter.class_name, filter.section || undefined)
    } else toast.error(res.message)
  }

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    setSelected(prev => prev.size === students.length
      ? new Set()
      : new Set(students.map(s => s.id)))
  }

  const sectionOptsAll = [{ value: '', label: '-- All --' }, ...sectionOpts('-- All --').slice(1)]

  const columns = [
    { key: '_sel', label: (
        <input type="checkbox"
          checked={students.length > 0 && selected.size === students.length}
          onChange={toggleAll}
          className="rounded border-gray-300 text-indigo-600 w-3.5 h-3.5" />
      ),
      render: (_, row) => (
        <input type="checkbox"
          checked={selected.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={e => e.stopPropagation()}
          className="rounded border-gray-300 text-indigo-600 w-3.5 h-3.5" />
      ),
    },
    { key: 'roll',         label: 'Roll' },
    { key: 'name',         label: 'Name' },
    { key: 'class_name',   label: 'Class' },
    { key: 'section',      label: 'Sec' },
    { key: 'admission_no', label: 'BSP ID' },
    { key: 'father_name',  label: 'Father' },
    { key: 'remedial_flag', label: 'Remedial',
      render: v => <Badge variant={v ? 'red' : 'green'}>{v ? 'Yes' : 'No'}</Badge> },
    { key: 'actions', label: '',
      render: (_, row) => can('write') && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setModal({ open: true, mode: 'edit', data: { ...row } })}>
            <Pencil className="w-3 h-3" /> Edit
          </Button>
          <Button size="sm" variant="danger"
            onClick={() => setDelModal({ open: true, id: row.id, name: row.name, class_name: row.class_name })}>
            <Trash2 className="w-3 h-3" /> Del
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 md:p-8 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/30">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Students</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Manage and organize your student records</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {can('write') && (
              <Button
                onClick={() => setModal({ open: true, mode: 'add', data: { ...EMPTY } })}
                className="!bg-white !text-indigo-700 hover:!bg-indigo-50 !shadow-lg !shadow-indigo-900/20 !font-semibold !border-0"
              >
                <UserPlus className="w-4 h-4" /> Add Student
              </Button>
            )}
            {can('write') && (
              <Button
                variant="secondary"
                onClick={() => setBulkOpen(true)}
                className="!bg-white/15 !text-white !border-white/25 hover:!bg-white/25 backdrop-blur-sm"
              >
                <Upload className="w-4 h-4" /> Bulk Import
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => exportStudentsToExcel(students, filter.class_name, filter.section)}
              disabled={!students.length}
              className="!bg-white/15 !text-white !border-white/25 hover:!bg-white/25 backdrop-blur-sm disabled:!opacity-40"
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        {filter.class_name && (
          <div className="relative mt-5 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <BookOpen className="w-4 h-4" />
              <span>{filter.class_name}</span>
              {filter.section && (
                <>
                  <ChevronRight className="w-3 h-3 opacity-60" />
                  <span>Section {filter.section}</span>
                </>
              )}
            </div>
            {students.length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
                <Users className="w-4 h-4" />
                <span>{students.length} student{students.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters + Table Card */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <Select
              options={classOpts()}
              value={filter.class_name}
              onChange={e => setFilter({ class_name: e.target.value, section: '' })}
            />
            <Select
              options={sectionOptsAll}
              value={filter.section}
              onChange={e => setFilter(f => ({ ...f, section: e.target.value }))}
              disabled={!filter.class_name}
            />
          </div>
          {students.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg self-start sm:self-center">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {students.length} student{students.length !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>

        {/* Empty state for no class selected */}
        {!filter.class_name && !loading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Search className="w-8 h-8 text-indigo-400 dark:text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Select a Class</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
              Choose a class from the filter above to view and manage students.
            </p>
          </div>
        )}

        {/* Table only shown when class is selected or loading */}
        {(filter.class_name || loading) && (
          <>
            {/* Bulk action bar */}
            {selected.size > 0 && can('write') && (
              <div className="flex items-center gap-3 mb-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/50">
                <span className="text-sm font-bold text-red-700 dark:text-red-400 flex-1">
                  {selected.size} student{selected.size > 1 ? 's' : ''} selected
                </span>
                <Button size="sm" variant="danger" loading={bulkDeleting} onClick={handleBulkDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </Button>
                <button onClick={() => setSelected(new Set())}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
                  Clear
                </button>
              </div>
            )}
            <Table columns={columns} data={students} loading={loading}
              emptyText={filter.class_name ? 'No students found.' : 'Select a class to view students.'} />
          </>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal open={modal.open} onClose={() => setModal(m => ({ ...m, open: false }))}
        title={modal.mode === 'add' ? 'Add Student' : 'Edit Student'} size="lg">

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
              {modal.mode === 'add' ? 'New Student Registration' : 'Update Student Details'}
            </h3>
            <p className="text-xs text-gray-400">
              {modal.mode === 'add' ? 'Fill in the details to register a new student' : 'Modify the student information below'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[['name','Name'],['roll','Roll No'],['class_name','Class'],['section','Section'],
            ['father_name','Father Name'],['mother_name','Mother Name'],['dob','Date of Birth'],['admission_no','BSP ID']
          ].map(([k, lbl]) => (
            <Input key={k} label={lbl} type={k === 'dob' ? 'date' : 'text'}
              value={modal.data[k] || ''}
              onChange={e => setModal(m => ({ ...m, data: { ...m.data, [k]: e.target.value } }))} />
          ))}
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button variant="secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            {modal.mode === 'add' ? <><UserPlus className="w-4 h-4" /> Add Student</> : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>}
          </Button>
        </div>
      </Modal>

      {/* Enhanced delete confirmation with cascade count */}
      <ConfirmDelete
        open={delModal.open}
        onClose={() => setDelModal({ open: false, id: null, name: '', class_name: '' })}
        onConfirm={handleDelete}
        title="Delete Student"
        itemName={delModal.name}
        fetchCount={delModal.id ? async () => {
          const count = await getMarksCount(delModal.id)
          return [{ label: 'marks records', count }]
        } : null}
      />

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={importedClasses => {
          refreshClasses(); refreshSections()
          if (filter.class_name && importedClasses.includes(filter.class_name))
            fetchStudents(filter.class_name, filter.section || undefined)
        }}
      />
    </div>
  )
}