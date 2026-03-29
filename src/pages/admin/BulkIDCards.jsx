// src/pages/admin/BulkIDCards.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import {
  CreditCard, Printer, Users, Check, Upload,
  AlertTriangle, CheckCircle2, Info, Image,
  Layers, Palette, QrCode, Eye, Type,
  MapPin, Building2, ChevronDown, FileSpreadsheet,
  ChevronUp, Sparkles, Layout, Grid3X3,
  FolderOpen, X, Search, RefreshCw, Download,
  HardDrive, Wifi, WifiOff, Camera, Trash2,
  FileText, ArrowRight, Settings, AlertCircle,
  BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ================================================================
   SECTION 1: EXCEL PARSER (No library needed — uses SheetJS CDN)
   ================================================================ */

let XLSX_LIB = null

async function loadXLSX() {
  if (XLSX_LIB) return XLSX_LIB
  return new Promise((resolve, reject) => {
    if (window.XLSX) { XLSX_LIB = window.XLSX; resolve(XLSX_LIB); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
    script.onload = () => { XLSX_LIB = window.XLSX; resolve(XLSX_LIB) }
    script.onerror = () => reject(new Error('Failed to load Excel parser'))
    document.head.appendChild(script)
  })
}

const FIELD_ALIASES = {
  name: 'name', student_name: 'name', 'student name': 'name',
  'full name': 'name', fullname: 'name', 'pupil name': 'name',
  father_name: 'father_name', 'father name': 'father_name',
  father: 'father_name', guardian: 'father_name',
  guardian_name: 'father_name', 'guardian name': 'father_name',
  "father's name": 'father_name', parent: 'father_name',
  parent_name: 'father_name', 'parent name': 'father_name',
  mother_name: 'mother_name', 'mother name': 'mother_name',
  mother: 'mother_name', "mother's name": 'mother_name',
  class: 'class_name', class_name: 'class_name', 'class name': 'class_name',
  grade: 'class_name', standard: 'class_name', std: 'class_name',
  section: 'section', sec: 'section', division: 'section',
  div: 'section',
  roll: 'roll', roll_no: 'roll', 'roll no': 'roll',
  roll_number: 'roll', 'roll number': 'roll',
  rollno: 'roll', rollnumber: 'roll',
  admission_no: 'admission_no', 'admission no': 'admission_no',
  admission_number: 'admission_no', 'admission number': 'admission_no',
  admno: 'admission_no', adm_no: 'admission_no',
  student_id: 'admission_no', 'student id': 'admission_no',
  'bsp id': 'admission_no', bsp_id: 'admission_no',
  id: 'admission_no', reg_no: 'admission_no',
  'registration no': 'admission_no', 'reg no': 'admission_no',
  enrollment: 'admission_no', 'enrollment no': 'admission_no',
  sr_no: 'admission_no', 'sr no': 'admission_no',
  blood_group: 'blood_group', 'blood group': 'blood_group',
  bloodgroup: 'blood_group', blood: 'blood_group',
  'blood type': 'blood_group',
  mobile: 'mobile', phone: 'mobile', contact: 'mobile',
  mobile_no: 'mobile', 'mobile no': 'mobile',
  'mobile number': 'mobile', 'phone number': 'mobile',
  contact_no: 'mobile', 'contact no': 'mobile',
  'contact number': 'mobile', tel: 'mobile',
  dob: 'dob', 'date of birth': 'dob', date_of_birth: 'dob',
  birthday: 'dob', birth_date: 'dob', 'birth date': 'dob',
  address: 'address', addr: 'address',
  'student address': 'address', residence: 'address',
  photo: 'photo_file', photo_file: 'photo_file',
  'photo file': 'photo_file', image: 'photo_file',
  image_file: 'photo_file', 'image file': 'photo_file',
  photograph: 'photo_file', pic: 'photo_file',
  picture: 'photo_file', photo_name: 'photo_file',
  'photo name': 'photo_file', filename: 'photo_file',
}

function formatDob(val) {
  let date
  if (val instanceof Date) {
    date = val
  } else if (typeof val === 'number') {
    // Excel serial date → JS Date (days since 1900-01-01, with Excel's leap-year bug offset)
    date = new Date(Math.round((val - 25569) * 86400 * 1000))
  } else {
    const s = String(val).trim()
    // Already DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s
    // YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
      const [y, m, d] = s.split(/[-/]/)
      return `${d}-${m}-${y}`
    }
    return s
  }
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}-${m}-${y}`
}

function normalizeRow(raw) {
  const out = {}
  for (const [key, val] of Object.entries(raw)) {
    const normalized = key.toString().trim().toLowerCase().replace(/[_\s]+/g, ' ')
    let mapped = FIELD_ALIASES[normalized]
    if (!mapped) {
      mapped = FIELD_ALIASES[normalized.replace(/ /g, '_')]
    }
    if (!mapped) {
      const clean = normalized.replace(/[^a-z0-9 ]/g, '').trim()
      mapped = FIELD_ALIASES[clean] || FIELD_ALIASES[clean.replace(/ /g, '_')]
    }
    if (mapped && val !== undefined && val !== null && String(val).trim() !== '') {
      if (mapped === 'dob') {
        out[mapped] = formatDob(val)
      } else {
        out[mapped] = String(val).trim()
      }
    }
  }
  out._id = out.admission_no || out.name || Math.random().toString(36).slice(2, 10)
  return out
}

function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const XLSX = await loadXLSX()
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
        const students = jsonData
          .map(normalizeRow)
          .filter(s => s.name)
        resolve({ students, rawColumns: jsonData.length > 0 ? Object.keys(jsonData[0]) : [], totalRows: jsonData.length })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/* ================================================================
   SECTION 2: LOCAL PHOTO MAPPER
   ================================================================ */

function buildPhotoMap(files) {
  const map = new Map()
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const fullName = file.name
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const lowerBase = baseName.toLowerCase().trim()
    const lowerFull = fullName.toLowerCase().trim()
    const url = URL.createObjectURL(file)
    map.set(lowerFull, url)
    map.set(lowerBase, url)
    map.set(lowerBase.toLowerCase(), url)
    map.set(lowerBase.replace(/\s+/g, ''), url)
    map.set(lowerBase.replace(/\s+/g, '_'), url)
  }
  return map
}

function findPhoto(student, photoMap) {
  if (!photoMap || photoMap.size === 0) return null
  const keysToTry = [
    student.photo_file,
    student.photo_file?.replace(/\.[^.]+$/, ''),
    student.admission_no,
    student.name,
    `${student.admission_no}`,
    `${student.class_name}_${student.section}_${student.roll}`,
    `${student.class_name}-${student.section}-${student.roll}`,
    `${student.roll}`,
    student._id,
  ].filter(Boolean)

  for (const key of keysToTry) {
    const lower = key.toString().toLowerCase().trim()
    if (photoMap.has(lower)) return photoMap.get(lower)
    const noSpace = lower.replace(/\s+/g, '')
    if (photoMap.has(noSpace)) return photoMap.get(noSpace)
    const underscored = lower.replace(/\s+/g, '_')
    if (photoMap.has(underscored)) return photoMap.get(underscored)
  }

  return null
}

/* ================================================================
   SECTION 3: BARCODE / QR CODE
   ================================================================ */

// Barcode type options
const BARCODE_TYPES = {
  pdf417: { label: 'PDF417 Barcode', description: 'Standard 2D barcode', icon: BarChart3 },
  qrcode: { label: 'QR Code', description: 'Square QR code', icon: QrCode },
}

// Generate barcode/QR URL based on type
function barcodeUrl(student, barcodeType = 'pdf417') {
  const data = student.admission_no || student._id || student.roll || 'N/A'
  if (barcodeType === 'qrcode') {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`
  }
  // Default: PDF417
  return `https://barcodeapi.org/api/pdf417/${encodeURIComponent(data)}`
}

/* ================================================================
   SECTION 4: COLOUR PRESETS
   ================================================================ */

const COLOR_PRESETS = {
  indigo:  { label: 'Royal Indigo',    primary: '#1e40af', secondary: '#3730a3', accent: '#6366f1', preview: 'from-indigo-600 to-indigo-800' },
  emerald: { label: 'Forest Green',    primary: '#065f46', secondary: '#047857', accent: '#10b981', preview: 'from-emerald-700 to-emerald-900' },
  crimson: { label: 'Classic Crimson',  primary: '#991b1b', secondary: '#7f1d1d', accent: '#ef4444', preview: 'from-red-700 to-red-900' },
  navy:    { label: 'Deep Navy',       primary: '#1e3a5f', secondary: '#1e3a8a', accent: '#3b82f6', preview: 'from-blue-800 to-blue-950' },
  purple:  { label: 'Royal Purple',    primary: '#581c87', secondary: '#6b21a8', accent: '#a855f7', preview: 'from-purple-800 to-purple-950' },
  teal:    { label: 'Ocean Teal',      primary: '#115e59', secondary: '#0f766e', accent: '#14b8a6', preview: 'from-teal-700 to-teal-900' },
  slate:   { label: 'Modern Slate',    primary: '#1e293b', secondary: '#334155', accent: '#64748b', preview: 'from-slate-700 to-slate-900' },
  amber:   { label: 'Golden Amber',    primary: '#92400e', secondary: '#78350f', accent: '#f59e0b', preview: 'from-amber-700 to-amber-900' },
  custom:  { label: 'Custom Colour',   primary: '#1e40af', secondary: '#3730a3', accent: '#6366f1', preview: 'from-gray-500 to-gray-700' },
}

/* ================================================================
   SECTION 5: TEMPLATE DEFINITIONS
   ================================================================ */

const TEMPLATES = {
  modern:  { label: 'Modern Professional', description: '2/row · gradient header · accent stripe', cardsPerRow: 2, icon: Layout },
  classic: { label: 'Classic Formal',      description: '2/row · centered header · traditional',   cardsPerRow: 2, icon: CreditCard },
  minimal: { label: 'Minimal Clean',       description: '2/row · white header · coloured accents', cardsPerRow: 2, icon: Type },
  compact: { label: 'Compact 4-Up',        description: '4/row · space-efficient · text-focused',  cardsPerRow: 4, icon: Grid3X3 },
}

/* ================================================================
   SECTION 6: PRINT HTML BUILDER (with embedded photos + Lexend font)
   ================================================================ */

async function buildPrintHtml(students, template, schoolConfig, colorTheme, photoMap, barcodeType) {
  const isCompact = template === 'compact'
  const { cardsPerRow } = TEMPLATES[template]
  const colors = colorTheme

  const cardW = isCompact ? '88mm' : '85.6mm'
  const cardH = isCompact ? '52mm' : '54mm'
  const colGap = isCompact ? '4mm' : '6mm'
  const rowGap = isCompact ? '4mm' : '6mm'
  const photoW = isCompact ? '16mm' : '20mm'
  const photoH = isCompact ? '20mm' : '26mm'
  const qrSize      = isCompact ? '9mm' : '11mm'
  const pdf417StripH = isCompact ? '8mm' : '8mm'

  const getTemplateStyles = () => {
    switch (template) {
      case 'modern': return `
        .card { border: none; border-radius: 4mm; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
        .card-header {
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
          padding: 2.5mm 3mm 2mm; position: relative; overflow: hidden;
        }
        .card-header::after { content:''; position:absolute; bottom:0; left:0; right:0; height:1mm; background:${colors.accent}; }
        .card-header::before { content:''; position:absolute; top:-5mm; right:-5mm; width:20mm; height:20mm; background:rgba(255,255,255,0.06); border-radius:50%; }`
      case 'classic': return `
        .card { border: 0.6pt solid ${colors.primary}; border-radius: 3mm; }
        .card-header { background: ${colors.primary}; padding: 2mm 3mm; text-align: center; }
        .card-header .school-name { text-align: center; letter-spacing: 0.06em; }`
      case 'minimal': return `
        .card { border: 0.4pt solid #e0e0e0; border-radius: 3mm; border-top: 2pt solid ${colors.primary}; }
        .card-header { background: #fff; padding: 2mm 3mm 1.5mm; border-bottom: 0.4pt solid #eee; }
        .card-header .school-name { color: ${colors.primary} !important; }
        .card-header .school-address, .card-header .session-label { color: #888 !important; }
        .card-header .id-label { color: ${colors.accent} !important; }`
      case 'compact': return `
        .card { border: 0.5pt solid #999; border-radius: 2.5mm; }
        .card-header { background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); padding: 1.5mm 2.5mm; }`
      default: return ''
    }
  }

  // Font sizes — "highlighted" fields (Father, Blood Group, Mother, DOB) get a bump
  const fieldLabelSize = isCompact ? '3.8pt' : '4.5pt'
  const fieldValueSize = isCompact ? '4.5pt' : '5.5pt'
  const highlightedValueSize = isCompact ? '5pt' : '6pt'

  const pageCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap');
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin:0; padding:0; font-family:'Lexend','Segoe UI',Arial,Helvetica,sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { width:210mm; min-height:297mm; padding:10mm; page-break-after:always; }
    .grid { display:grid; grid-template-columns:repeat(${cardsPerRow},${cardW}); gap:${rowGap} ${colGap}; }
    .card { width:${cardW}; height:${cardH}; overflow:hidden; display:flex; flex-direction:column; background:#fff; }
    .card-header { color:#fff; display:flex; align-items:center; gap:2mm; flex-shrink:0; }
    .school-logo-box {
      width:${isCompact?'5.5mm':'7mm'}; height:${isCompact?'5.5mm':'7mm'};
      border-radius:${template==='modern'?'1.5mm':'50%'};
      background:rgba(255,255,255,0.9); display:flex; align-items:center; justify-content:center;
      font-size:${isCompact?'3.5pt':'4.5pt'}; color:#fff; flex-shrink:0; font-weight:900; text-transform:uppercase;
      ${template==='minimal'?`background:${colors.primary};color:#fff;`:''}
    }
    .school-name { font-size:${isCompact?'5pt':'6pt'}; font-weight:800; letter-spacing:0.03em; text-transform:uppercase; line-height:1.2; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    .school-address { font-size:${isCompact?'3pt':'3.5pt'}; color:rgba(255,255,255,0.75); line-height:1.25; margin-top:0.3mm; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:${isCompact?'55mm':'48mm'}; }
    .session-label { font-size:${isCompact?'3pt':'3.5pt'}; color:rgba(255,255,255,0.7); line-height:1.2; margin-top:0.2mm; white-space:nowrap; font-weight:600; }
    .id-label { font-size:3.5pt; color:rgba(255,255,255,0.6); flex-shrink:0; text-align:right; font-weight:700; letter-spacing:0.05em; }
    .card-body { flex:1; display:flex; gap:${isCompact?'2mm':'2.5mm'}; padding:${isCompact?'1.5mm 2mm':'2mm 3mm'}; overflow:hidden; }
    .card-left { display:flex; flex-direction:column; align-items:center; gap:1mm; flex-shrink:0; align-self:stretch; overflow:hidden; }
    .photo-box {
      width:${photoW}; height:${photoH}; border:0.5pt solid #d0d0d0;
      border-radius:${template==='modern'?'2mm':template==='minimal'?'1.5mm':'1mm'};
      display:flex; align-items:center; justify-content:center;
      background:#f8f9fa; font-size:${isCompact?'3.5pt':'4pt'}; color:#aaa; text-align:center; line-height:1.3;
      overflow:hidden; flex-shrink:0;
    }
    .photo-box img { width:100%; height:100%; object-fit:cover; display:block; }
    .qr-box { width:${qrSize}; height:${qrSize}; flex-shrink:0; border:0.4pt solid #e5e7eb; border-radius:0.5mm; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#fff; }
    .qr-box img { width:100%; height:100%; object-fit:contain; display:block; }
    .card-footer { width:100%; height:${pdf417StripH}; background:#fff; border-top:0.4pt solid #e8e8e8; flex-shrink:0; display:flex; align-items:stretch; overflow:hidden; }
    .footer-pdf417 { width:60%; padding:0.8mm 1.5mm; display:flex; align-items:center; overflow:hidden; }
    .footer-pdf417 img { width:100%; height:auto; max-height:100%; display:block; image-rendering:crisp-edges; }
    .footer-sig { width:40%; padding:0.5mm 1.5mm 0.5mm 1mm; display:flex; flex-direction:column; align-items:flex-end; justify-content:center; border-left:0.3pt solid #f0f0f0; overflow:hidden; gap:0.2mm; }
    .footer-sig .sig-img { height:${isCompact ? '3.5mm' : '4.5mm'}; max-width:100%; object-fit:contain; display:block; }
    .footer-sig .sig-label { font-size:2.5pt; color:#aaa; text-align:right; letter-spacing:0.04em; white-space:nowrap; }
    .card-right { flex:1; display:flex; flex-direction:column; gap:0.4mm; overflow:hidden; min-width:0; }
    .top-row { display:flex; align-items:flex-start; justify-content:space-between; gap:1.5mm; }
    .top-left { flex:1; min-width:0; display:flex; flex-direction:column; gap:0.3mm; }
    .student-name { font-size:${isCompact?'6pt':'7.5pt'}; font-weight:800; color:#111; line-height:1.15; letter-spacing:0.01em; }
    .id-badge { font-size:${isCompact?'3.5pt':'4pt'}; font-weight:700; color:${colors.primary}; letter-spacing:0.06em; text-transform:uppercase; }
    .divider { border:none; border-top:0.3pt solid #e8e8e8; margin:0.5mm 0; }
    .accent-divider { border:none; border-top:0.5pt solid ${colors.accent}; margin:0.4mm 0; opacity:0.4; }
    .field-row { display:flex; gap:1.5mm; align-items:baseline; }
    .field-label { font-size:${fieldLabelSize}; color:#888; min-width:${isCompact?'8mm':'11mm'}; flex-shrink:0; text-transform:uppercase; letter-spacing:0.03em; font-weight:500; }
    .field-value { font-size:${fieldValueSize}; font-weight:700; color:#222; flex:1; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .field-value.highlighted { font-size:${highlightedValueSize}; font-weight:800; color:#111; }
    .field-label.highlighted { font-size:${isCompact?'4pt':'4.8pt'}; font-weight:600; color:#666; }
    .field-row-addr { display:flex; gap:1.5mm; align-items:baseline; }
    .addr-label { font-size:${isCompact?'3pt':'3.5pt'}; color:#aaa; min-width:${isCompact?'8mm':'11mm'}; flex-shrink:0; text-transform:uppercase; letter-spacing:0.03em; font-weight:500; }
    .addr-value { font-size:${isCompact?'3.5pt':'4pt'}; font-weight:600; color:#555; flex:1; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .footer-bar { background:${colors.primary}; height:1.2mm; flex-shrink:0; opacity:0.8; }
    ${getTemplateStyles()}
    @media print { .page:last-child { page-break-after:avoid; } }
  `

  async function blobToDataUrl(blobUrl) {
    try {
      const resp = await fetch(blobUrl)
      const blob = await resp.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch { return null }
  }

  const photoDataUrls = new Map()
  for (const s of students) {
    const blobUrl = findPhoto(s, photoMap)
    if (blobUrl) {
      const dataUrl = await blobToDataUrl(blobUrl)
      if (dataUrl) photoDataUrls.set(s._id, dataUrl)
    }
  }

  const PER_PAGE = cardsPerRow * (isCompact ? 6 : 4)
  const pages = []

  // Fields that should be highlighted (larger font)
  const HIGHLIGHTED_FIELDS = new Set(['Father', 'Blood', 'Mother', 'DOB'])

  for (let i = 0; i < students.length; i += PER_PAGE) {
    const chunk = [...students.slice(i, i + PER_PAGE)]
    while (chunk.length < PER_PAGE) chunk.push(null)

    const cardsHtml = chunk.map(s => {
      if (!s) return `<div class="card" style="border:none;background:transparent;box-shadow:none"></div>`

      const fields = [
        { label: 'Father', value: s.father_name },
        { label: 'Class', value: [s.class_name, s.section].filter(Boolean).join(' – ') || null },
        { label: 'Roll No', value: s.roll },
        s.blood_group ? { label: 'Blood', value: s.blood_group } : null,
        s.mobile ? { label: 'Mobile', value: s.mobile } : null,
        s.mother_name && !isCompact ? { label: 'Mother', value: s.mother_name } : null,
        s.dob && !isCompact ? { label: 'DOB', value: s.dob } : null,
        s.address ? { label: 'Address', value: s.address } : null,
      ].filter(Boolean).map(f => ({ ...f, value: f.value || '—' }))

      const photoDataUrl = photoDataUrls.get(s._id)

      const photoContent = photoDataUrl
        ? `<img src="${photoDataUrl}" alt="Photo" />`
        : 'PASTE<br>PHOTO'

      const headerContent = template === 'classic'
        ? `<div style="min-width:0;flex:1;overflow:hidden;text-align:center">
             <div class="school-name">${schoolConfig.schoolName || 'School Name'}</div>
             ${schoolConfig.address ? `<div class="school-address" style="text-align:center;max-width:100%">${schoolConfig.address}</div>` : ''}
             ${schoolConfig.session ? `<div class="session-label" style="text-align:center">Session: ${schoolConfig.session}</div>` : ''}
           </div>`
        : `<div class="school-logo-box">${
             schoolConfig.logoDataUrl
               ? `<img src="${schoolConfig.logoDataUrl}" style="width:100%;height:100%;object-fit:contain;display:block;" alt="Logo" />`
               : (schoolConfig.schoolName || 'S').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
           }</div>
           <div style="min-width:0;flex:1;overflow:hidden">
             <div class="school-name">${schoolConfig.schoolName || 'School Name'}</div>
             ${schoolConfig.address ? `<div class="school-address">${schoolConfig.address}</div>` : ''}
             ${schoolConfig.session ? `<div class="session-label">Session: ${schoolConfig.session}</div>` : ''}
           </div>
           <div class="id-label">STUDENT<br>ID CARD</div>`

      const dividerClass = template === 'modern' ? 'accent-divider' : 'divider'

      return `
        <div class="card">
          <div class="card-header">${headerContent}</div>
          <div class="card-body">
            <div class="card-left">
              <div class="photo-box">${photoContent}</div>
              ${barcodeType === 'qrcode' ? `<div class="qr-box"><img src="${barcodeUrl(s, 'qrcode')}" alt="QR Code" /></div>` : ''}
            </div>
            <div class="card-right">
              <div class="top-row">
                <div class="top-left">
                  <div class="student-name">${s.name || '—'}</div>
                  <div class="id-badge">ID: ${s.admission_no || s._id}</div>
                </div>
              </div>
              <hr class="${dividerClass}" />
              ${fields.map(f => {
                if (f.label === 'Address') return `
                <div class="field-row-addr">
                  <span class="addr-label">${f.label}:</span>
                  <span class="addr-value">${f.value}</span>
                </div>`
                const isHighlighted = HIGHLIGHTED_FIELDS.has(f.label)
                return `
                <div class="field-row">
                  <span class="field-label${isHighlighted ? ' highlighted' : ''}">${f.label}:</span>
                  <span class="field-value${isHighlighted ? ' highlighted' : ''}">${f.value}</span>
                </div>`
              }).join('')}
            </div>
          </div>
          <div class="card-footer">
            <div class="footer-pdf417">
              ${barcodeType === 'pdf417' ? `<img src="${barcodeUrl(s, 'pdf417')}" alt="Barcode" />` : ''}
            </div>
            <div class="footer-sig">
              ${schoolConfig.signatureDataUrl
                ? `<img class="sig-img" src="${schoolConfig.signatureDataUrl}" alt="Signature" />`
                : ''}
              <span class="sig-label">Authorised Signature</span>
            </div>
          </div>
          ${template === 'modern' ? '<div class="footer-bar"></div>' : ''}
        </div>`
    }).join('\n')

    pages.push(`<div class="page"><div class="grid">${cardsHtml}</div></div>`)
  }

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Student ID Cards – ${schoolConfig.schoolName || 'School'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>${pageCSS}</style></head><body>
${pages.join('\n')}
<script>
  const imgs = document.querySelectorAll('img')
  let loaded = 0
  const total = imgs.length
  if (!total) window.print()
  else {
    const check = () => { if (++loaded >= total) setTimeout(() => window.print(), 400) }
    imgs.forEach(img => { if (img.complete) check(); else { img.onload=check; img.onerror=check } })
  }
</script></body></html>`
}

/* ================================================================
   SECTION 7: COMPONENTS
   ================================================================ */

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, badge, accent }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accent || 'from-indigo-500 to-violet-600'} flex items-center justify-center shadow-sm`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</span>
        {badge && (
          <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
            {badge}
          </span>
        )}
        <div className="ml-auto">
          {open
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

function FileDropZone({ accept, label, description, icon: Icon, onFiles, multiple = false, children }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const files = multiple
      ? Array.from(e.dataTransfer.files)
      : [e.dataTransfer.files[0]]
    if (files[0]) onFiles(files.filter(Boolean))
  }, [onFiles, multiple])

  const handleChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length) onFiles(files)
    e.target.value = ''
  }, [onFiles])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 p-6
        ${dragOver
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]'
          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-gray-800'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        {...(multiple ? { webkitdirectory: '', directory: '' } : {})}
      />
      <div className="flex flex-col items-center text-center gap-2">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dragOver ? 'bg-indigo-100 dark:bg-indigo-800/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <Icon className={`w-6 h-6 ${dragOver ? 'text-indigo-500' : 'text-gray-400'}`} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function PhotoFolderPicker({ onPhotosLoaded, photoCount }) {
  const inputRef = useRef(null)

  const handleFiles = useCallback((e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'))
    if (files.length) {
      onPhotosLoaded(files)
      toast.success(`${files.length} photo${files.length !== 1 ? 's' : ''} loaded`)
    } else {
      toast.error('No image files found in selection')
    }
    e.target.value = ''
  }, [onPhotosLoaded])

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all p-5 bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
              {photoCount > 0 ? `${photoCount} Photos Loaded` : 'Select Photo Files'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Select all student photos from your folder (JPG, PNG, etc.)
            </p>
          </div>
          {photoCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              ✓ {photoCount} images ready
            </span>
          )}
        </div>
      </div>

      <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Photo Naming Convention:</strong> Name files by{' '}
          <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-[10px]">AdmissionNo.jpg</code>,{' '}
          <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-[10px]">StudentName.jpg</code>, or{' '}
          <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-[10px]">Class_Section_Roll.jpg</code>{' '}
          for auto-matching. You can also add a <strong>"Photo"</strong> column in Excel with the exact filename.
        </p>
      </div>
    </div>
  )
}

function ColorSwatch({ preset, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all duration-200
        ${isActive
          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
        }
      `}
    >
      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${preset.preview} shadow-inner flex-shrink-0`} />
      <span className={`text-xs font-semibold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}>
        {preset.label}
      </span>
      {isActive && <Check className="w-3.5 h-3.5 text-indigo-500 ml-auto" />}
    </button>
  )
}

function TemplateCard({ tmpl, isActive, onClick }) {
  const Icon = tmpl.icon
  return (
    <button
      onClick={onClick}
      className={`
        group flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 transition-all duration-200 text-left
        ${isActive
          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
        }
      `}
    >
      <div className="flex items-center gap-2 w-full">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? 'bg-indigo-100 dark:bg-indigo-800/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
        </div>
        <span className={`text-xs font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {tmpl.label}
        </span>
        {isActive && <Check className="w-3.5 h-3.5 text-indigo-500 ml-auto flex-shrink-0" />}
      </div>
      <p className={`text-[10px] leading-tight ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
        {tmpl.description}
      </p>
    </button>
  )
}

// ── Barcode Type Selector ──────────────────────────────────────
function BarcodeTypeCard({ type, config, isActive, onClick }) {
  const Icon = config.icon
  return (
    <button
      onClick={onClick}
      className={`
        group flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left
        ${isActive
          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
        }
      `}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-indigo-100 dark:bg-indigo-800/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
        <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-bold block ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {config.label}
        </span>
        <span className={`text-[10px] ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {config.description}
        </span>
      </div>
      {isActive && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
    </button>
  )
}

function IDCardPreview({ student, schoolName, customAddress, colors, template, photoUrl, selected, onToggle, barcodeType }) {
  const isMinimal = template === 'minimal'

  return (
    <div
      role="button"
      onClick={onToggle}
      className={`
        relative cursor-pointer rounded-xl border-2 transition-all duration-200 select-none overflow-hidden
        ${selected
          ? 'border-indigo-400 dark:border-indigo-500 shadow-md shadow-indigo-100 dark:shadow-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700 opacity-50 hover:opacity-70 hover:border-indigo-200 dark:hover:border-indigo-700'
        }
      `}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full flex items-center justify-center transition-all
        ${selected
          ? 'bg-indigo-500 shadow-sm'
          : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
        }
      `}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>

      {/* Photo match indicator */}
      {photoUrl && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm" title="Photo matched">
            <Camera className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="px-2.5 py-1.5"
        style={isMinimal
          ? { background: '#fff', borderBottom: `2px solid ${colors.primary}`, borderTop: `3px solid ${colors.primary}` }
          : { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }
        }
      >
        <p
          className={`text-[9px] font-bold uppercase tracking-wider truncate leading-tight ${isMinimal ? '' : 'text-white'}`}
          style={isMinimal ? { color: colors.primary } : {}}
        >
          {schoolName || 'School Name'}
        </p>
        {customAddress && (
          <p className={`text-[6px] truncate leading-tight ${isMinimal ? 'text-gray-400' : 'text-white/60'}`}>
            {customAddress}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="p-2 flex gap-2 bg-white dark:bg-gray-800">
        {/* Photo */}
        <div className="w-10 flex flex-col gap-1 flex-shrink-0">
          <div className="w-10 h-12 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[7px] text-gray-400 dark:text-gray-500 text-center leading-tight">PHOTO</span>
            )}
          </div>
          {/* Mini barcode/QR preview indicator */}
          <div className="w-10 h-4 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {barcodeType === 'qrcode' ? (
              <QrCode className="w-2.5 h-2.5 text-gray-400" />
            ) : (
              <BarChart3 className="w-2.5 h-2.5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-extrabold text-gray-800 dark:text-gray-100 truncate leading-tight" style={{ fontFamily: "'Lexend', sans-serif" }}>
            {student.name || '—'}
          </p>
          <p className="text-[7px] font-bold truncate leading-tight" style={{ color: colors.primary }}>
            {student.admission_no || `ID: ${student._id?.slice(0, 8)}`}
          </p>
          <div className="mt-0.5 space-y-0.5">
            <p className="text-[7.5px] text-gray-500 dark:text-gray-400">
              {student.class_name && (
                <><span className="font-semibold text-gray-700 dark:text-gray-300">{student.class_name}</span>
                <span className="mx-0.5 text-gray-300">·</span></>
              )}
              {student.section && (
                <>Sec <span className="font-semibold text-gray-700 dark:text-gray-300">{student.section}</span>
                <span className="mx-0.5 text-gray-300">·</span></>
              )}
              Roll <span className="font-semibold text-gray-700 dark:text-gray-300">{student.roll ?? '—'}</span>
            </p>
            {student.father_name && (
              <p className="text-[8px] text-gray-600 dark:text-gray-400 truncate font-semibold">
                F: {student.father_name}
              </p>
            )}
            {student.blood_group && (
              <p className="text-[8px] font-bold truncate" style={{ color: colors.accent }}>
                Blood: {student.blood_group}
              </p>
            )}
            {student.address && (
              <p className="text-[6.5px] text-gray-400 dark:text-gray-500 truncate flex items-center gap-0.5 leading-tight">
                <MapPin className="w-1.5 h-1.5 flex-shrink-0" />
                {student.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {template === 'modern' && (
        <div className="h-0.5" style={{ background: colors.accent, opacity: 0.6 }} />
      )}
    </div>
  )
}

function ColumnMappingTable({ rawColumns, sampleStudent }) {
  const mapped = {}
  rawColumns.forEach(col => {
    const norm = col.toString().trim().toLowerCase().replace(/[_\s]+/g, ' ')
    const target = FIELD_ALIASES[norm] || FIELD_ALIASES[norm.replace(/ /g, '_')]
    mapped[col] = target || null
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400">Excel Column</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400">→</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400">Mapped To</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400">Sample Value</th>
          </tr>
        </thead>
        <tbody>
          {rawColumns.map(col => (
            <tr key={col} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-1.5 px-3 font-mono text-gray-700 dark:text-gray-300">{col}</td>
              <td className="py-1.5 px-3">
                <ArrowRight className={`w-3 h-3 ${mapped[col] ? 'text-emerald-500' : 'text-gray-300'}`} />
              </td>
              <td className="py-1.5 px-3">
                {mapped[col] ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                    {mapped[col]}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 text-[10px]">
                    unmapped
                  </span>
                )}
              </td>
              <td className="py-1.5 px-3 text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                {sampleStudent ? (sampleStudent[mapped[col]] || '—') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ================================================================
   SECTION 8: MAIN PAGE COMPONENT
   ================================================================ */

export default function BulkIDCards() {
  // ── State ─────────────────────────────────────────────────────
  const [template, setTemplate] = useState('modern')
  const [colorPreset, setColorPreset] = useState('indigo')
  const [customPrimary, setCustomPrimary] = useState('#1e40af')
  const [customSecondary, setCustomSecondary] = useState('#3730a3')
  const [customAccent, setCustomAccent] = useState('#6366f1')

  // Barcode type
  const [barcodeType, setBarcodeType] = useState('pdf417')

  // School config
  const [schoolName, setSchoolName] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [academicSession, setAcademicSession] = useState('')
  const [schoolLogo, setSchoolLogo] = useState(null)
  const [authorisedSignature, setAuthorisedSignature] = useState(null)

  // Data
  const [students, setStudents] = useState([])
  const [rawColumns, setRawColumns] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [excelFile, setExcelFile] = useState(null)
  const [loading, setLoading] = useState(false)

  // Photos
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoMap, setPhotoMap] = useState(null)

  // Filter
  const [filterClass, setFilterClass] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Active colours ────────────────────────────────────────────
  const activeColors = useMemo(() => {
    if (colorPreset === 'custom') {
      return {
        primary: customPrimary,
        secondary: customSecondary,
        accent: customAccent,
        headerBg: `linear-gradient(135deg, ${customPrimary} 0%, ${customSecondary} 100%)`,
      }
    }
    return COLOR_PRESETS[colorPreset]
  }, [colorPreset, customPrimary, customSecondary, customAccent])

  // ── Build photo map when photos change ────────────────────────
  useEffect(() => {
    if (photoFiles.length > 0) {
      const map = buildPhotoMap(photoFiles)
      setPhotoMap(map)
    } else {
      setPhotoMap(null)
    }
    return () => {
      if (photoMap) {
        const seen = new Set()
        photoMap.forEach(url => { if (!seen.has(url)) { URL.revokeObjectURL(url); seen.add(url) } })
      }
    }
  }, [photoFiles])

  // ── Derived data ──────────────────────────────────────────────
  const uniqueClasses = useMemo(
    () => [...new Set(students.map(s => s.class_name).filter(Boolean))].sort(),
    [students]
  )
  const uniqueSections = useMemo(
    () => [...new Set(students.filter(s => !filterClass || s.class_name === filterClass).map(s => s.section).filter(Boolean))].sort(),
    [students, filterClass]
  )

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterClass && s.class_name !== filterClass) return false
      if (filterSection && s.section !== filterSection) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const searchable = [s.name, s.admission_no, s.father_name, s.roll, s._id]
          .filter(Boolean).join(' ').toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [students, filterClass, filterSection, searchQuery])

  const selectedStudents = useMemo(
    () => filteredStudents.filter(s => selected.has(s._id)),
    [filteredStudents, selected]
  )

  const photoMatchCount = useMemo(
    () => filteredStudents.filter(s => findPhoto(s, photoMap)).length,
    [filteredStudents, photoMap]
  )

  const tmpl = TEMPLATES[template]
  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selected.has(s._id))
  const noneSelected = selectedStudents.length === 0

  // ── Excel import ──────────────────────────────────────────────
  const handleExcelFiles = useCallback(async (files) => {
    const file = files[0]
    if (!file) return

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    const ext = file.name.split('.').pop().toLowerCase()
    if (!validTypes.includes(file.type) && !['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file')
      return
    }

    setLoading(true)
    try {
      const result = await parseExcelFile(file)
      setStudents(result.students)
      setRawColumns(result.rawColumns)
      setSelected(new Set(result.students.map(s => s._id)))
      setExcelFile(file.name)
      setFilterClass('')
      setFilterSection('')
      setSearchQuery('')

      if (result.students.length === 0) {
        toast.error('No valid student records found. Ensure the sheet has a "Name" column.')
      } else {
        toast.success(`${result.students.length} students imported from ${result.totalRows} rows`)
      }
    } catch (err) {
      console.error(err)
      toast.error(`Import failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePhotosLoaded = useCallback((files) => {
    setPhotoFiles(files)
  }, [])

  // ── Selection helpers ─────────────────────────────────────────
  const toggleOne = id => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const selectAll = () => setSelected(new Set([...selected, ...filteredStudents.map(s => s._id)]))
  const clearAll = () => {
    const filteredIds = new Set(filteredStudents.map(s => s._id))
    setSelected(prev => new Set([...prev].filter(id => !filteredIds.has(id))))
  }

  // ── Print ─────────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!selectedStudents.length) {
      toast.error('No students selected to print.')
      return
    }
    if (!schoolName.trim()) {
      toast.error('Please enter a school name in the School Info section.')
      return
    }

    const loadingToast = toast.loading('Preparing ID cards for print...')

    try {
      const schoolConfig = {
        schoolName: schoolName.trim(),
        address: schoolAddress.trim(),
        session: academicSession.trim(),
        logoDataUrl: schoolLogo,
        signatureDataUrl: authorisedSignature,
      }

      const html = await buildPrintHtml(selectedStudents, template, schoolConfig, activeColors, photoMap, barcodeType)
      const win = window.open('', '_blank', 'width=960,height=800,scrollbars=yes')

      if (!win) {
        toast.dismiss(loadingToast)
        toast.error('Popup blocked. Allow popups for this site and try again.')
        return
      }

      win.document.write(html)
      win.document.close()
      toast.dismiss(loadingToast)
      toast.success(`Printing ${selectedStudents.length} ID card${selectedStudents.length !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error(`Print failed: ${err.message}`)
    }
  }

  // ── Download sample Excel ─────────────────────────────────────
  const downloadSampleExcel = async () => {
    try {
      const XLSX = await loadXLSX()
      const sample = [
        {
          'Name': 'Rahul Kumar',
          'Father Name': 'Suresh Kumar',
          'Mother Name': 'Anita Devi',
          'Class': '10',
          'Section': 'A',
          'Roll No': 1,
          'Admission No': 'BSP2024001',
          'Blood Group': 'O+',
          'Mobile': '9876543210',
          'DOB': '2008-05-15',
          'Address': '123 Main Road, City',
          'Photo': 'BSP2024001.jpg',
        },
        {
          'Name': 'Priya Sharma',
          'Father Name': 'Rajesh Sharma',
          'Mother Name': 'Sunita Sharma',
          'Class': '10',
          'Section': 'A',
          'Roll No': 2,
          'Admission No': 'BSP2024002',
          'Blood Group': 'A+',
          'Mobile': '9876543211',
          'DOB': '2008-08-22',
          'Address': '456 Park Street, City',
          'Photo': 'BSP2024002.jpg',
        },
        {
          'Name': 'Amit Singh',
          'Father Name': 'Vikram Singh',
          'Mother Name': 'Kavita Singh',
          'Class': '10',
          'Section': 'B',
          'Roll No': 1,
          'Admission No': 'BSP2024003',
          'Blood Group': 'B+',
          'Mobile': '9876543212',
          'DOB': '2008-02-10',
          'Address': '789 School Lane, City',
          'Photo': 'BSP2024003.jpg',
        },
      ]
      const ws = XLSX.utils.json_to_sheet(sample)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Students')

      ws['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 8 },
        { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 10 },
        { wch: 14 }, { wch: 12 }, { wch: 25 }, { wch: 18 },
      ]

      XLSX.writeFile(wb, 'Student_ID_Card_Template.xlsx')
      toast.success('Sample template downloaded!')
    } catch (err) {
      toast.error(`Download failed: ${err.message}`)
    }
  }

  // ── Clear all data ────────────────────────────────────────────
  const clearAllData = () => {
    setStudents([])
    setRawColumns([])
    setSelected(new Set())
    setExcelFile(null)
    setPhotoFiles([])
    setPhotoMap(null)
    setFilterClass('')
    setFilterSection('')
    setSearchQuery('')
    toast.success('All data cleared')
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ═══ Hero Banner ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 md:p-8 shadow-xl shadow-indigo-600/15 dark:shadow-indigo-900/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Offline ID Card Generator
              </h1>
              <p className="text-indigo-200 text-sm mt-0.5 flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5" />
                Excel data + Local photos · No internet required for data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {students.length > 0 && (
              <Button
                onClick={clearAllData}
                className="!bg-white/10 !text-white hover:!bg-white/20 !border-white/20 !font-medium"
                size="sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
            <Button
              onClick={handlePrint}
              disabled={!selectedStudents.length}
              className="!bg-white !text-indigo-700 hover:!bg-indigo-50 !shadow-lg !shadow-indigo-900/20 !font-semibold !border-0 disabled:!opacity-50 disabled:!cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Print
              {selectedStudents.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                  {selectedStudents.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Feature pills */}
        <div className="relative mt-5 flex flex-wrap gap-2.5">
          {[
            { icon: FileSpreadsheet, label: 'Excel / CSV import' },
            { icon: FolderOpen,      label: 'Local photo folder' },
            { icon: Palette,         label: 'Custom colours' },
            { icon: Layout,          label: '4 templates' },
            { icon: QrCode,          label: 'Barcode / QR Code' },
            { icon: WifiOff,         label: 'Works offline' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm text-white text-[11px] font-medium">
              <Icon className="w-3 h-3" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ STEP 1: Import Data ═══ */}
      <Card>
        <div className="space-y-4">
          <CollapsibleSection
            title="Step 1 — Import Student Data (Excel / CSV)"
            icon={FileSpreadsheet}
            accent="from-blue-500 to-blue-700"
            badge={excelFile ? `✓ ${excelFile}` : null}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FileDropZone
                accept=".xlsx,.xls,.csv"
                label={excelFile ? `✓ ${excelFile}` : 'Upload Excel / CSV File'}
                description={excelFile
                  ? `${students.length} students loaded · Drop a new file to replace`
                  : 'Drag & drop or click to browse · .xlsx, .xls, .csv'}
                icon={excelFile ? CheckCircle2 : Upload}
                onFiles={handleExcelFiles}
              >
                {loading && (
                  <div className="flex items-center gap-2 mt-2">
                    <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                    <span className="text-xs text-indigo-600 font-medium">Parsing file...</span>
                  </div>
                )}
              </FileDropZone>

              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Required & Supported Columns
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { col: 'Name *', desc: 'Student full name', required: true },
                      { col: 'Father Name', desc: 'or Guardian Name' },
                      { col: 'Class', desc: 'e.g., 10, XII, LKG' },
                      { col: 'Section', desc: 'e.g., A, B, C' },
                      { col: 'Roll No', desc: 'Roll number' },
                      { col: 'Admission No', desc: 'BSP ID / Student ID' },
                      { col: 'Blood Group', desc: 'e.g., O+, A+, B+' },
                      { col: 'Mobile', desc: 'Contact number' },
                      { col: 'Mother Name', desc: 'Mother\'s name' },
                      { col: 'DOB', desc: 'Date of birth' },
                      { col: 'Address', desc: 'Student address' },
                      { col: 'Photo', desc: 'Photo filename' },
                    ].map(({ col, desc, required }) => (
                      <div key={col} className="flex items-start gap-1.5">
                        <CheckCircle2 className={`w-3 h-3 mt-0.5 flex-shrink-0 ${required ? 'text-red-500' : 'text-blue-400'}`} />
                        <div>
                          <span className={`text-[10px] font-bold ${required ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{col}</span>
                          <span className="text-[9px] text-blue-500/70 dark:text-blue-500 ml-1">{desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={downloadSampleExcel}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-blue-600 dark:text-blue-400 text-xs font-bold"
                >
                  <Download className="w-4 h-4" />
                  Download Sample Excel Template
                </button>
              </div>
            </div>

            {rawColumns.length > 0 && students.length > 0 && (
              <div className="mt-4">
                <CollapsibleSection
                  title="Column Mapping Review"
                  icon={Settings}
                  defaultOpen={false}
                  badge={`${rawColumns.length} columns`}
                >
                  <ColumnMappingTable rawColumns={rawColumns} sampleStudent={students[0]} />
                </CollapsibleSection>
              </div>
            )}
          </CollapsibleSection>
        </div>
      </Card>

      {/* ═══ STEP 2: Photos ═══ */}
      <Card>
        <CollapsibleSection
          title="Step 2 — Load Student Photos (Optional)"
          icon={Camera}
          accent="from-emerald-500 to-emerald-700"
          defaultOpen={students.length > 0}
          badge={photoFiles.length > 0 ? `✓ ${photoFiles.length} photos` : null}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PhotoFolderPicker
              onPhotosLoaded={handlePhotosLoaded}
              photoCount={photoFiles.length}
            />

            <div className="space-y-3">
              {students.length > 0 && photoMap && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                    Photo Matching Results
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-emerald-600">{photoMatchCount}</p>
                      <p className="text-[10px] text-emerald-500">Matched</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-gray-400">{filteredStudents.length - photoMatchCount}</p>
                      <p className="text-[10px] text-gray-400">Unmatched</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${filteredStudents.length ? (photoMatchCount / filteredStudents.length * 100) : 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-bold">
                        {filteredStudents.length ? Math.round(photoMatchCount / filteredStudents.length * 100) : 0}% match rate
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {students.length === 0 && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-xs text-gray-400">
                    Import student data first (Step 1) to see photo matching results
                  </p>
                </div>
              )}

              {photoFiles.length > 0 && (
                <button
                  onClick={() => { setPhotoFiles([]); setPhotoMap(null); toast.success('Photos cleared') }}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  <X className="w-3 h-3" />
                  Clear all photos
                </button>
              )}
            </div>
          </div>
        </CollapsibleSection>
      </Card>

      {/* ═══ STEP 3: School Info & Design ═══ */}
      <Card>
        <div className="space-y-4">
          {/* School Info */}
          <CollapsibleSection
            title="Step 3 — School Info & Card Design"
            icon={Building2}
            accent="from-violet-500 to-violet-700"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  School Name *
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="e.g., Delhi Public School"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Address (on card)
                </label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={e => setSchoolAddress(e.target.value)}
                  placeholder="e.g., Sector 24, New Delhi – 110001"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Academic Session
                </label>
                <input
                  type="text"
                  value={academicSession}
                  onChange={e => setAcademicSession(e.target.value)}
                  placeholder="e.g., 2024-25"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  School Logo
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {schoolLogo
                      ? <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                      : <Image className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onloadend = () => setSchoolLogo(reader.result)
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }}
                    />
                    <span className="block w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {schoolLogo ? 'Change' : 'Upload'}
                    </span>
                  </label>
                  {schoolLogo && (
                    <button
                      onClick={() => setSchoolLogo(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      title="Remove logo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Authorised Signature upload — spans remaining columns on smaller screens */}
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Authorised Signature (optional)
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-36 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden"
                    title="Signature preview"
                  >
                    {authorisedSignature
                      ? <img src={authorisedSignature} alt="Signature" className="h-full w-full object-contain p-0.5" />
                      : <span className="text-[10px] text-gray-400 italic">No signature</span>
                    }
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onloadend = () => setAuthorisedSignature(reader.result)
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      {authorisedSignature ? 'Replace Signature' : 'Upload Signature'}
                    </span>
                  </label>
                  {authorisedSignature && (
                    <button
                      onClick={() => setAuthorisedSignature(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      title="Remove signature"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Use a PNG with transparent background for best results. The signature will appear at the bottom-right of every printed card.
                  </p>
                </div>
              </div>
            </div>

            {!schoolName.trim() && students.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 mb-4">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  School name is required to print ID cards
                </p>
              </div>
            )}
          </CollapsibleSection>

          {/* Template Selection */}
          <CollapsibleSection
            title="Card Template"
            icon={Layout}
            badge={TEMPLATES[template].label}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <TemplateCard key={key} tmpl={t} isActive={template === key} onClick={() => setTemplate(key)} />
              ))}
            </div>
          </CollapsibleSection>

          {/* Barcode Type Selection */}
          <CollapsibleSection
            title="Barcode / QR Code"
            icon={QrCode}
            badge={BARCODE_TYPES[barcodeType].label}
            defaultOpen={false}
            accent="from-orange-500 to-orange-700"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(BARCODE_TYPES).map(([key, config]) => (
                <BarcodeTypeCard
                  key={key}
                  type={key}
                  config={config}
                  isActive={barcodeType === key}
                  onClick={() => setBarcodeType(key)}
                />
              ))}
            </div>
            <div className="mt-3 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40">
              <p className="text-[11px] text-orange-700 dark:text-orange-400 leading-relaxed">
                <strong>Note:</strong> The barcode/QR code encodes the student's <strong>Admission Number</strong> (or ID/Roll No as fallback).
                {barcodeType === 'qrcode'
                  ? ' QR codes can be scanned with any smartphone camera.'
                  : ' PDF417 barcodes are widely used in ID cards and can store more data.'}
              </p>
            </div>
          </CollapsibleSection>

          {/* Colour Theme */}
          <CollapsibleSection
            title="Colour Theme"
            icon={Palette}
            badge={COLOR_PRESETS[colorPreset].label}
            defaultOpen={false}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                <ColorSwatch key={key} preset={preset} isActive={colorPreset === key} onClick={() => setColorPreset(key)} />
              ))}
            </div>

            {colorPreset === 'custom' && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Custom Colour Picker
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Primary', value: customPrimary, set: setCustomPrimary },
                    { label: 'Secondary', value: customSecondary, set: setCustomSecondary },
                    { label: 'Accent', value: customAccent, set: setCustomAccent },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={value} onChange={e => set(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5" />
                        <input type="text" value={value} onChange={e => set(e.target.value)}
                          className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-300 outline-none" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-medium">Preview:</span>
                  <div className="flex rounded-lg overflow-hidden shadow-sm">
                    <div className="w-12 h-6" style={{ background: customPrimary }} />
                    <div className="w-12 h-6" style={{ background: customSecondary }} />
                    <div className="w-12 h-6" style={{ background: customAccent }} />
                  </div>
                  <div className="h-6 px-3 rounded-lg text-[9px] text-white font-bold flex items-center"
                    style={{ background: `linear-gradient(135deg, ${customPrimary}, ${customSecondary})` }}>
                    Header Preview
                  </div>
                </div>
              </div>
            )}
          </CollapsibleSection>
        </div>

        {/* Design summary */}
        <div className="mt-4 flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
          <Eye className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          <span className="text-xs text-indigo-700 dark:text-indigo-300">
            <span className="font-bold">Design:</span>{' '}
            {TEMPLATES[template].label} · {COLOR_PRESETS[colorPreset].label} · {BARCODE_TYPES[barcodeType].label}
            {photoMap && ` · ${photoMatchCount} photos matched`}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: activeColors.primary }} />
            <div className="w-3 h-3 rounded-sm" style={{ background: activeColors.secondary }} />
            <div className="w-3 h-3 rounded-sm" style={{ background: activeColors.accent }} />
            {barcodeType === 'qrcode' ? <QrCode className="w-3 h-3 text-gray-400 ml-1" /> : <BarChart3 className="w-3 h-3 text-gray-400 ml-1" />}
          </div>
        </div>
      </Card>

      {/* ═══ ID Card Preview Grid ═══ */}
      {students.length > 0 && (
        <Card>
          {/* Header + Filters */}
          <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${activeColors.primary}, ${activeColors.accent})` }}>
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                    ID Card Preview
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {filterClass && `${filterClass}`}{filterSection && ` – ${filterSection}`}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    {selectedStudents.length} of {filteredStudents.length} selected
                    {photoMap && ` · ${photoMatchCount} with photos`}
                    {` · ${BARCODE_TYPES[barcodeType].label}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={allSelected ? clearAll : selectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-all
                    ${allSelected ? 'bg-indigo-500' : !noneSelected ? 'bg-indigo-300' : 'border border-gray-400'}
                  `}>
                    {(allSelected || !noneSelected) && <Check className="w-2 h-2 text-white" />}
                  </div>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
                <Button onClick={handlePrint} disabled={!selectedStudents.length} size="sm"
                  className="!border-0 disabled:!opacity-50"
                  style={{ background: activeColors.primary }}>
                  <Printer className="w-3.5 h-3.5" />
                  Print ({selectedStudents.length})
                </Button>
              </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, ID, roll..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>

              {uniqueClasses.length > 1 && (
                <select
                  value={filterClass}
                  onChange={e => { setFilterClass(e.target.value); setFilterSection('') }}
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              {uniqueSections.length > 1 && (
                <select
                  value={filterSection}
                  onChange={e => setFilterSection(e.target.value)}
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              {(searchQuery || filterClass || filterSection) && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterClass(''); setFilterSection('') }}
                  className="text-xs text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          </div>

          {noneSelected && (
            <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No students selected. Use <strong>Select All</strong> or click individual cards.
              </p>
            </div>
          )}

          {/* Preview grid */}
          {filteredStudents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredStudents.map(s => (
                <IDCardPreview
                  key={s._id}
                  student={s}
                  schoolName={schoolName}
                  customAddress={schoolAddress}
                  colors={activeColors}
                  template={template}
                  photoUrl={findPhoto(s, photoMap)}
                  selected={selected.has(s._id)}
                  onToggle={() => toggleOne(s._id)}
                  barcodeType={barcodeType}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">
              No students match the current filters
            </div>
          )}

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3 h-3" />{students.length} total
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" />{selectedStudents.length} to print
              </span>
              {photoMap && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="inline-flex items-center gap-1.5">
                    <Camera className="w-3 h-3" />{photoMatchCount} photos
                  </span>
                </>
              )}
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1">
                {barcodeType === 'qrcode' ? <QrCode className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
                {BARCODE_TYPES[barcodeType].label}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: activeColors.primary }} />
                {tmpl.label}
              </span>
            </p>
            <Button onClick={handlePrint} disabled={!selectedStudents.length}
              className="!border-0 disabled:!opacity-50"
              style={{ background: activeColors.primary }}>
              <Printer className="w-4 h-4" />
              Print ID Cards
            </Button>
          </div>
        </Card>
      )}

      {/* ═══ Empty State ═══ */}
      {!loading && students.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 flex items-center justify-center mb-4 shadow-inner">
              <FileSpreadsheet className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
            </div>

            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
              Import an Excel file to get started
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Upload your student data spreadsheet in <strong>Step 1</strong> above. The system automatically
              maps common column names (Name, Father Name, Class, Roll No, Admission No, etc.)
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={downloadSampleExcel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample Template
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-gray-400">
              {[
                'Excel / CSV auto-import',
                'Smart column name mapping',
                'Local photo folder matching',
                '4 professional templates',
                '8+ colour themes + custom',
                'PDF417 or QR Code option',
                'Photo by AdmNo / Name / Roll',
                'Print-ready A4 layout',
                'Works 100% offline',
              ].map(f => (
                <span key={f} className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />{f}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}