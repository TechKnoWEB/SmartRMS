// src/pages/admin/ExamLabels.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useClasses, useSections } from '../../hooks/useSections'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import {
  Tag, Printer, Users, RefreshCw, Check,
  AlertTriangle, CheckCircle2, Info,
  GraduationCap, FileText, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────

function sheetsNeeded(count, perSheet) {
  return count === 0 ? 0 : Math.ceil(count / perSheet)
}

// ── Format Definitions ─────────────────────────────────────────
const FORMATS = {
  avery5160: {
    label: 'Avery 5160 (US Letter)',
    description: '30 labels/sheet · 3 × 10 · 2.625" × 1"',
    cols: 3,
    perSheet: 30,
  },
  a4: {
    label: 'A4 Page Labels',
    description: '30 labels/sheet · 3 × 10 · 63.5 mm × 28 mm',
    cols: 3,
    perSheet: 30,
  },
}

// ── Print HTML Builder ─────────────────────────────────────────
function buildPrintHtml(students, format, schoolName, examTitle) {
  const isA4  = format === 'a4'
  const { perSheet } = FORMATS[format]

  const pageCSS = isA4
    ? `
      @page { size: A4; margin: 0; }
      .sheet {
        width: 210mm; min-height: 297mm;
        padding: 12.7mm 7.2mm 0 7.2mm;
        box-sizing: border-box;
        page-break-after: always;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 63.5mm);
        grid-template-rows: repeat(10, 28mm);
        column-gap: 2.5mm;
        row-gap: 0;
      }
      .label {
        width: 63.5mm; height: 28mm;
        box-sizing: border-box;
        padding: 2mm 3mm;
        border: 0.4pt dashed #bbb;
        overflow: hidden;
        display: flex; flex-direction: column; justify-content: center;
        align-items: center; text-align: center;
      }
      .s-name  { font-size: 7pt; }
      .e-title { font-size: 6pt; }
      .divider { margin: 1mm 0; width: 90%; }
      .st-name { font-size: 8.5pt; }
      .st-info { font-size: 8pt; margin-top: 1mm; }
    `
    : `
      @page { size: letter; margin: 0; }
      .sheet {
        width: 8.5in; min-height: 11in;
        padding: 0.5in 0.1875in 0 0.1875in;
        box-sizing: border-box;
        page-break-after: always;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 2.625in);
        grid-template-rows: repeat(10, 1in);
        column-gap: 0.125in;
        row-gap: 0;
      }
      .label {
        width: 2.625in; height: 1in;
        box-sizing: border-box;
        padding: 3pt 5pt;
        border: 0.4pt dashed #bbb;
        overflow: hidden;
        display: flex; flex-direction: column; justify-content: center;
        align-items: center; text-align: center;
      }
      .s-name  { font-size: 6pt; }
      .e-title { font-size: 5pt; }
      .divider { margin: 1pt 0; width: 90%; }
      .st-name { font-size: 7.5pt; }
      .st-info { font-size: 7pt; margin-top: 1pt; }
    `

  const commonCSS = `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
    .s-name  { font-weight: 700; color: #374151; text-transform: uppercase;
               letter-spacing: 0.04em; white-space: nowrap; overflow: hidden;
               text-overflow: ellipsis; line-height: 1.2; }
    .e-title { color: #6b7280; letter-spacing: 0.06em; text-transform: uppercase;
               line-height: 1.2; }
    .divider { border: none; border-top: 0.5pt solid #d1d5db; }
    .st-name { font-weight: 800; color: #111827; letter-spacing: 0.01em; line-height: 1.3; }
    .st-info { color: #4b5563; line-height: 1.4; }
    .st-info strong { color: #1f2937; }
    .sep { margin: 0 2pt; color: #9ca3af; }
    @media print { .sheet:last-child { page-break-after: avoid; } }
  `

  const sheets = []
  for (let i = 0; i < students.length; i += perSheet) {
    const chunk = [...students.slice(i, i + perSheet)]
    while (chunk.length < perSheet) chunk.push(null)   // pad to full sheet

    const labelsHtml = chunk.map(s => {
      if (!s) return `<div class="label"></div>`
      return `
        <div class="label">
          <div class="s-name">${schoolName || 'School Name'}</div>
          ${examTitle ? `<div class="e-title">${examTitle}</div>` : ''}
          <hr class="divider" />
          <div class="st-name">${s.name}</div>
          <div class="st-info">
            Roll: <strong>${s.roll ?? '—'}</strong>
            <span class="sep">|</span>
            Class: <strong>${s.class_name}</strong>
            <span class="sep">|</span>
            Sec: <strong>${s.section}</strong>
          </div>
        </div>`
    }).join('\n')

    sheets.push(`
      <div class="sheet">
        <div class="grid">${labelsHtml}</div>
      </div>`)
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Exam Seating Labels${examTitle ? ' — ' + examTitle : ''}</title>
  <style>${pageCSS}${commonCSS}</style>
</head>
<body>
  ${sheets.join('\n')}
  <script>window.onload = () => { window.print() }</script>
</body>
</html>`
}

// ── Single Label Preview Card ──────────────────────────────────
function LabelCard({ student, schoolName, examTitle, selected, onToggle }) {
  return (
    <div
      role="button"
      onClick={onToggle}
      className={`
        relative cursor-pointer rounded-xl border-2 p-2.5 transition-all duration-200 select-none
        ${selected
          ? 'border-teal-400 dark:border-teal-500 bg-teal-50/60 dark:bg-teal-900/20 shadow-sm shadow-teal-100 dark:shadow-teal-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-50 hover:opacity-70 hover:border-teal-200 dark:hover:border-teal-700'
        }
      `}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
        ${selected
          ? 'bg-teal-500 shadow-sm'
          : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
        }
      `}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>

      <div className="pr-5">
        {/* School name */}
        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate leading-tight">
          {schoolName || 'School Name'}
        </p>
        {examTitle && (
          <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-tight truncate">
            {examTitle}
          </p>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

        {/* Student name */}
        <p className="text-[10px] font-extrabold text-gray-800 dark:text-gray-100 truncate leading-tight">
          {student.name || '—'}
        </p>

        {/* Roll · Class · Section */}
        <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
          Roll: <span className="font-semibold text-gray-700 dark:text-gray-300">{student.roll ?? '—'}</span>
          <span className="mx-0.5 text-gray-300 dark:text-gray-600">|</span>
          Cls: <span className="font-semibold text-gray-700 dark:text-gray-300">{student.class_name}</span>
          <span className="mx-0.5 text-gray-300 dark:text-gray-600">|</span>
          Sec: <span className="font-semibold text-gray-700 dark:text-gray-300">{student.section}</span>
        </p>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function ExamLabels() {
  const { user } = useAuth()

  // Config
  const [selClass,   setSelClass]   = useState('')
  const [selSection, setSelSection] = useState('')
  const [format,     setFormat]     = useState('avery5160')
  const [schoolName, setSchoolName] = useState('')
  const [examTitle,  setExamTitle]  = useState('1st Summative Evaluation')

  // Data
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState(new Set())   // IDs of selected students
  const [loading,  setLoading]  = useState(false)

  const { classes,  classesLoading  } = useClasses()
  const { sections, sectionsLoading } = useSections(selClass)

  // Fetch school name on mount
  useEffect(() => {
    if (!user?.school_id) return
    supabase
      .from('schools')
      .select('school_name')
      .eq('id', user.school_id)
      .single()
      .then(({ data }) => {
        if (data?.school_name) setSchoolName(data.school_name)
      })
  }, [user])

  // ── Derived ───────────────────────────────────────────────────
  const selectedStudents = useMemo(
    () => students.filter(s => selected.has(s.id)),
    [students, selected]
  )

  const fmt         = FORMATS[format]
  const sheets      = sheetsNeeded(selectedStudents.length, fmt.perSheet)
  const allSelected = students.length > 0 && selected.size === students.length
  const noneSelected = selected.size === 0

  // ── Load students ─────────────────────────────────────────────
  const loadStudents = async () => {
    if (!selClass || !selSection) {
      toast.error('Please select a class and section first.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('id, name, roll, class_name, section')
      .eq('school_id', user.school_id)
      .eq('class_name', selClass)
      .eq('section', selSection)
      .eq('is_active', true)
      .order('roll', { ascending: true })

    setLoading(false)
    if (error) { toast.error(error.message); return }

    const list = data || []
    setStudents(list)
    setSelected(new Set(list.map(s => s.id)))   // all selected by default

    if (!list.length)
      toast('No active students found for this class/section.', { icon: 'ℹ️' })
    else
      toast.success(`${list.length} student${list.length !== 1 ? 's' : ''} loaded.`)
  }

  // ── Selection helpers ─────────────────────────────────────────
  const toggleOne  = id => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const selectAll  = () => setSelected(new Set(students.map(s => s.id)))
  const clearAll   = () => setSelected(new Set())

  // ── Class / section change — reset downstream state ───────────
  const handleClassChange = e => {
    setSelClass(e.target.value)
    setSelSection('')
    setStudents([])
    setSelected(new Set())
  }
  const handleSectionChange = e => {
    setSelSection(e.target.value)
    setStudents([])
    setSelected(new Set())
  }

  // ── Print ─────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!selectedStudents.length) {
      toast.error('No students selected to print.')
      return
    }
    if (!schoolName.trim()) {
      toast.error('Please enter a school name before printing.')
      return
    }
    const html = buildPrintHtml(selectedStudents, format, schoolName.trim(), examTitle.trim())
    const win  = window.open('', '_blank', 'width=960,height=720,scrollbars=yes')
    if (!win) {
      toast.error('Popup blocked. Allow popups for this site and try again.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  // ── Selector options ──────────────────────────────────────────
  const classOpts = [
    { value: '', label: '— Select Class —' },
    ...classes.map(c => ({ value: c, label: c })),
  ]
  const sectionOpts = [
    { value: '', label: '— Select Section —' },
    ...(sections || []).map(s => ({ value: s, label: s })),
  ]
  const formatOpts = Object.entries(FORMATS).map(([k, v]) => ({
    value: k, label: v.label,
  }))

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ═══ Hero Banner ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-6 md:p-8 shadow-xl shadow-teal-600/15 dark:shadow-teal-900/30">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Tag className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Exam Seating Labels
              </h1>
              <p className="text-teal-200 text-sm mt-0.5">
                Generate print-ready labels for exam hall seating
              </p>
            </div>
          </div>

          <Button
            onClick={handlePrint}
            disabled={!selectedStudents.length}
            className="!bg-white !text-teal-700 hover:!bg-teal-50 !shadow-lg !shadow-teal-900/20 !font-semibold !border-0 disabled:!opacity-50 disabled:!cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            Print Labels
            {selectedStudents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                {selectedStudents.length}
              </span>
            )}
          </Button>
        </div>

        {/* Feature pills */}
        <div className="relative mt-5 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs font-medium">
            <FileText className="w-3.5 h-3.5" />
            Avery 5160 · A4 Page Labels
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            Bulk generation
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm text-white text-xs font-medium">
            <Layers className="w-3.5 h-3.5" />
            Auto-fill from student records
          </div>
        </div>
      </div>

      {/* ═══ Configuration ═══ */}
      <Card>
        {/* Card header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-teal-200 dark:shadow-teal-900/40">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Configuration</h2>
            <p className="text-xs text-gray-400">Select class, section, format and label content</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Row 1: Class · Section · Format */}
          <Select
            label="Class"
            options={classOpts}
            value={selClass}
            onChange={handleClassChange}
            disabled={classesLoading}
          />
          <Select
            label="Section"
            options={sectionOpts}
            value={selSection}
            onChange={handleSectionChange}
            disabled={!selClass || sectionsLoading}
          />
          <Select
            label="Label Format"
            options={formatOpts}
            value={format}
            onChange={e => setFormat(e.target.value)}
          />

          {/* Row 2: School Name · Exam Title · Load button */}
          <Input
            label="School Name"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            placeholder="e.g. Springfield High School"
          />
          <Input
            label="Exam Title (optional)"
            value={examTitle}
            onChange={e => setExamTitle(e.target.value)}
            placeholder="e.g. ANNUAL EXAM 2025-26"
          />
          <div className="flex items-end">
            <Button
              onClick={loadStudents}
              loading={loading}
              disabled={!selClass || !selSection}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4" />
              Load Students
            </Button>
          </div>
        </div>

        {/* Format info strip */}
        <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40">
          <Info className="w-4 h-4 text-teal-500 dark:text-teal-400 flex-shrink-0" />
          <p className="text-xs text-teal-700 dark:text-teal-300">
            <span className="font-bold">{fmt.label}:</span>{' '}
            {fmt.description}.{' '}
            <span className="text-teal-500 dark:text-teal-400">
              Fields printed: School Name · Short Student Name (e.g. Rohit M.) · Roll · Class · Section.
            </span>
          </p>
        </div>
      </Card>

      {/* ═══ Label Preview ═══ */}
      {students.length > 0 && (
        <Card>
          {/* Card header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40">
                <Tag className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                  Label Preview
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {selClass} – {selSection}
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  {selectedStudents.length} of {students.length} label{students.length !== 1 ? 's' : ''} selected
                  {sheets > 0 && ` · ${sheets} sheet${sheets !== 1 ? 's' : ''} (${fmt.perSheet}/sheet)`}
                </p>
              </div>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={allSelected ? clearAll : selectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-300 hover:text-teal-600 dark:hover:border-teal-600 dark:hover:text-teal-400"
              >
                <div className={`
                  w-3.5 h-3.5 rounded flex items-center justify-center transition-all
                  ${allSelected
                    ? 'bg-teal-500'
                    : !noneSelected
                    ? 'bg-teal-300 dark:bg-teal-700'
                    : 'border border-gray-400 dark:border-gray-500'
                  }
                `}>
                  {(allSelected || !noneSelected) && <Check className="w-2 h-2 text-white" />}
                </div>
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>

              <Button
                onClick={handlePrint}
                disabled={!selectedStudents.length}
                size="sm"
                className="!bg-teal-600 hover:!bg-teal-700 !border-teal-600 disabled:!opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                Print {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
              </Button>
            </div>
          </div>

          {/* Selection hint */}
          {noneSelected && (
            <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No students selected. Use <strong>Select All</strong> to include everyone, or click individual labels below.
              </p>
            </div>
          )}

          {/* Label grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {students.map(s => (
              <LabelCard
                key={s.id}
                student={s}
                schoolName={schoolName}
                examTitle={examTitle}
                selected={selected.has(s.id)}
                onToggle={() => toggleOne(s.id)}
              />
            ))}
          </div>

          {/* Footer summary + print CTA */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                {students.length} students loaded
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span className="inline-flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                {selectedStudents.length} labels to print
              </span>
              {sheets > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    {sheets} sheet{sheets !== 1 ? 's' : ''} · {fmt.label}
                  </span>
                </>
              )}
            </p>

            <Button
              onClick={handlePrint}
              disabled={!selectedStudents.length}
              className="!bg-teal-600 hover:!bg-teal-700 !border-teal-600 disabled:!opacity-50 disabled:!cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Print Labels
            </Button>
          </div>
        </Card>
      )}

      {/* ═══ Empty / Get-Started State ═══ */}
      {!loading && students.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40 flex items-center justify-center mb-4 shadow-inner">
              <Tag className="w-7 h-7 text-teal-500 dark:text-teal-400" />
            </div>

            {!selClass ? (
              <>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Select a class to get started</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Choose a class and section above, then click <strong>Load Students</strong> to generate exam seating labels.
                </p>
              </>
            ) : !selSection ? (
              <>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Now select a section</p>
                <p className="text-xs text-gray-400 mt-1">Choose a section for <strong>{selClass}</strong> to continue.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Ready to load</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click <strong>Load Students</strong> to fetch the roster for <strong>{selClass} – {selSection}</strong>.
                </p>
              </>
            )}

            {/* Feature list */}
            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                Auto-fill name, roll, class, section
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                Avery 5160 (Letter) &amp; A4 formats
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                Bulk print entire class
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                Select individual students
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
