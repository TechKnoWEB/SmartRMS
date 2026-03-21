// src/utils/exportExcel.js
//
// DEP-03 FIX: Replaced 'xlsx' (SheetJS) with 'exceljs'.
//
// SheetJS (xlsx 0.18.5 / 0.20.x) carries two unpatched CVEs:
//   - GHSA-4r6h-8v6p-xvw6  Prototype Pollution
//   - GHSA-5pgg-2g8v-p4x9  ReDoS
// npm audit reports "No fix available" — there is no safe version of that package.
//
// exceljs (4.4.0) is actively maintained, MIT licensed, and has no known CVEs.
// The external API exposed by this file is IDENTICAL to before — no other file needs to change.

import ExcelJS from 'exceljs'

// ── Internal helpers ─────────────────────────────────────────────────────────

function _download(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function _styleHeaderRow(row, colCount) {
  row.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  row.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  row.alignment = { vertical: 'middle', horizontal: 'center' }
  row.height    = 20
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = {
      top: { style: 'thin', color: { argb: 'FF6366F1' } },
      bottom: { style: 'thin', color: { argb: 'FF6366F1' } },
      left: { style: 'thin', color: { argb: 'FF6366F1' } },
      right: { style: 'thin', color: { argb: 'FF6366F1' } },
    }
  }
}

function _styleDataRow(row, rowIndex, colCount) {
  row.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowIndex % 2 === 0 ? 'FFF5F3FF' : 'FFFFFFFF' } }
  row.alignment = { vertical: 'middle' }
  row.height    = 18
  for (let i = 1; i <= colCount; i++)
    row.getCell(i).border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportResultsToExcel(results, className, section) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RMS v3'; wb.created = new Date()
  const ws = wb.addWorksheet(`${className}-${section}`)

  const subjectCols = []
  if (results[0]) {
    results[0].subjects.forEach(s => {
      subjectCols.push(
        { header: `${s.subject_name} Total`, key: `${s.subject_name}_total`, width: 14 },
        { header: `${s.subject_name} Max`,   key: `${s.subject_name}_max`,   width: 12 },
        { header: `${s.subject_name} Grade`, key: `${s.subject_name}_grade`, width: 12 },
        { header: `${s.subject_name} Pass`,  key: `${s.subject_name}_pass`,  width: 10 },
      )
    })
  }

  ws.columns = [
    { header: 'Roll', key: 'roll', width: 8 }, { header: 'Name', key: 'name', width: 28 },
    { header: 'Adm No', key: 'admission_no', width: 12 }, ...subjectCols,
    { header: 'Grand Total', key: 'grand_total', width: 13 }, { header: 'Grand Max', key: 'grand_max', width: 11 },
    { header: 'Percentage', key: 'percentage', width: 12 }, { header: 'Grade', key: 'grade', width: 8 },
    { header: 'Result', key: 'result', width: 12 }, { header: 'Rank', key: 'rank', width: 7 },
  ]
  _styleHeaderRow(ws.getRow(1), ws.columns.length)

  results.forEach((r, idx) => {
    const rowData = { roll: r.student.roll, name: r.student.name, admission_no: r.student.admission_no }
    r.subjects.forEach(s => {
      rowData[`${s.subject_name}_total`] = s.final_total
      rowData[`${s.subject_name}_max`]   = s.final_max
      rowData[`${s.subject_name}_grade`] = s.subject_grade
      rowData[`${s.subject_name}_pass`]  = s.subject_pass ? 'Pass' : 'Fail'
    })
    Object.assign(rowData, { grand_total: r.grand_total, grand_max: r.grand_max, percentage: r.percentage + '%', grade: r.grade, result: r.result_status, rank: r.rank || '' })
    _styleDataRow(ws.addRow(rowData), idx, ws.columns.length)
  })
  ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } }
  _download(await wb.xlsx.writeBuffer(), `Results_${className}_${section}_${Date.now()}.xlsx`)
}

export async function exportStudentsToExcel(students, className, section) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RMS v3'; wb.created = new Date()
  const ws = wb.addWorksheet('Students')
  ws.columns = [
    { header: 'Roll', key: 'roll', width: 8 }, { header: 'Name', key: 'name', width: 28 },
    { header: 'Class', key: 'class_name', width: 12 }, { header: 'Section', key: 'section', width: 10 },
    { header: 'Father', key: 'father_name', width: 22 }, { header: 'Mother', key: 'mother_name', width: 22 },
    { header: 'DOB', key: 'dob', width: 14 }, { header: 'Adm No', key: 'admission_no', width: 14 },
    { header: 'Remedial', key: 'remedial', width: 11 },
  ]
  _styleHeaderRow(ws.getRow(1), ws.columns.length)
  students.forEach((s, idx) => _styleDataRow(ws.addRow({
    roll: s.roll, name: s.name, class_name: s.class_name, section: s.section,
    father_name: s.father_name, mother_name: s.mother_name, dob: s.dob,
    admission_no: s.admission_no, remedial: s.remedial_flag ? 'Yes' : 'No',
  }), idx, ws.columns.length))
  _download(await wb.xlsx.writeBuffer(), `Students_${className || 'All'}_${section || 'All'}.xlsx`)
}

export async function downloadBulkTemplate(className, section) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RMS v3'; wb.created = new Date()

  const wsI = wb.addWorksheet('Instructions')
  wsI.getColumn(1).width = 72
  const instructions = [
    ['BULK STUDENT IMPORT TEMPLATE — RMS v3'], [''],
    ['INSTRUCTIONS:'],
    ['1. Do NOT change column headers in the Students sheet'],
    ['2. Class and Sec are REQUIRED for every row'],
    ['3. Roll must be a unique number per class+section'],
    ['4. Name is required. Father, Mother, DOB, Adm No, Remedial are optional.'],
    ['5. DOB format: YYYY-MM-DD (e.g. 2008-05-15)'],
    ['6. Remedial: write Yes or No (blank = No)'],
    ['7. You can mix multiple classes/sections in one file'],
    [''], ['COLUMN REFERENCE:'],
    ['Class     — Class name exactly as you want it stored (e.g. Class 9, 10A, VI)'],
    ['Sec       — Section letter (e.g. A, B, C)'],
    ['Roll      — Unique roll number for that class+section'],
    ['Name      — Student full name (required)'],
    ['Father    — Father\'s name (optional)'],
    ['Mother    — Mother\'s name (optional)'],
    ['DOB       — Date of birth YYYY-MM-DD (optional)'],
    ['Adm No    — Admission number (optional)'],
    ['Remedial  — Yes or No (optional, default No)'],
  ]
  instructions.forEach(r => wsI.addRow(r))
  wsI.getRow(1).font = { bold: true, size: 12 }

  const wsD = wb.addWorksheet('Students')
  wsD.columns = [
    { header: 'Class', key: 'class', width: 14 }, { header: 'Sec', key: 'sec', width: 7 },
    { header: 'Roll', key: 'roll', width: 9 }, { header: 'Name', key: 'name', width: 26 },
    { header: 'Father', key: 'father', width: 22 }, { header: 'Mother', key: 'mother', width: 22 },
    { header: 'DOB (YYYY-MM-DD)', key: 'dob', width: 18 }, { header: 'Adm No', key: 'admno', width: 14 },
    { header: 'Remedial (Yes/No)', key: 'remedial', width: 18 },
  ]
  _styleHeaderRow(wsD.getRow(1), wsD.columns.length)

  const cls = className || 'Class 9', sec = section || 'A'
  const samples = [
    [cls, sec, 1, 'Aarav Sharma', 'Rajesh Sharma', 'Priya Sharma', '2008-05-15', 'ADM001', 'No'],
    [cls, sec, 2, 'Priya Patel', 'Suresh Patel', 'Meena Patel', '2008-09-22', 'ADM002', 'No'],
    [cls, sec, 3, 'Ravi Kumar', 'Anil Kumar', 'Sunita Kumar', '2009-01-10', 'ADM003', 'Yes'],
    [cls, 'B', 1, 'Sample B-1', '', '', '', '', 'No'],
  ]
  samples.forEach((r, idx) => _styleDataRow(wsD.addRow(r), idx, wsD.columns.length))
  _download(await wb.xlsx.writeBuffer(), className && section ? `BulkImport_Template_${className}_${section}.xlsx` : 'BulkImport_Template.xlsx')
}

export function parseBulkExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(e.target.result)
        const ws = wb.getWorksheet('Students') || wb.worksheets[0]
        if (!ws) { resolve([]); return }
        const headers = [], rows = []
        ws.eachRow((row, rowNum) => {
          const values = row.values.slice(1)
          if (rowNum === 1) {
            values.forEach(v => headers.push(v == null ? '' : String(v)))
          } else {
            if (!values.some(v => v != null && v !== '')) return
            const obj = {}
            headers.forEach((h, i) => {
              let val = values[i]
              if (val instanceof Date) val = val.toISOString().split('T')[0]
              obj[h] = val == null ? '' : val
            })
            rows.push(obj)
          }
        })
        resolve(rows)
      } catch (err) { reject(new Error('Could not read file: ' + err.message)) }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}

export function validateBulkRows(rows, overrideClass, overrideSection) {
  const valid = [], errors = [], seenRolls = {}
  const COL = {
    class_name:  ['class', 'Class', 'CLASS', 'class name', 'Class Name'],
    section:     ['sec', 'Sec', 'SEC', 'section', 'Section', 'SECTION'],
    roll:        ['roll', 'Roll', 'ROLL', 'roll no', 'Roll No'],
    name:        ['name', 'Name', 'NAME', 'student name', 'Student Name'],
    father_name: ['father', 'Father', 'FATHER', 'father name', 'Father Name'],
    mother_name: ['mother', 'Mother', 'MOTHER', 'mother name', 'Mother Name'],
    dob:         ['dob (yyyy-mm-dd)', 'DOB (YYYY-MM-DD)', 'dob', 'DOB', 'date of birth'],
    admission_no:['adm no', 'Adm No', 'ADM NO', 'admission no', 'Admission No'],
    remedial:    ['remedial (yes/no)', 'Remedial (Yes/No)', 'remedial', 'Remedial'],
  }
  const getCol = (row, keys) => { for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k]; return '' }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2, rowErrors = []
    const class_name   = String(overrideClass   || getCol(row, COL.class_name) || '').trim()
    const section      = String(overrideSection || getCol(row, COL.section)    || '').trim().toUpperCase()
    const roll         = parseInt(getCol(row, COL.roll))
    const name         = String(getCol(row, COL.name)         || '').trim()
    const father_name  = String(getCol(row, COL.father_name)  || '').trim()
    const mother_name  = String(getCol(row, COL.mother_name)  || '').trim()
    const dobRaw       = getCol(row, COL.dob)
    const admission_no = String(getCol(row, COL.admission_no) || '').trim()
    const remedialRaw  = String(getCol(row, COL.remedial)     || '').trim().toLowerCase()
    const remedial_flag = remedialRaw === 'yes' || remedialRaw === '1' || remedialRaw === 'true'

    if (!class_name) rowErrors.push('Class is required')
    if (!section)    rowErrors.push('Section is required')
    if (!name)       rowErrors.push('Name is required')
    if (!roll || isNaN(roll) || roll <= 0) rowErrors.push('Roll must be a positive number')
    if (class_name && section && roll) {
      const key = `${class_name}|${section}|${roll}`
      if (seenRolls[key]) rowErrors.push(`Duplicate roll ${roll} in ${class_name}-${section}`)
      seenRolls[key] = true
    }

    let dob = null
    if (dobRaw) {
      const s = String(dobRaw).trim()
      if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s)) rowErrors.push(`DOB format invalid: got "${s}"`)
      else dob = s || null
    }

    if (rowErrors.length) errors.push({ rowNum, name: name || '(blank)', roll: roll || '?', issues: rowErrors })
    else valid.push({ roll, name, class_name, section, father_name, mother_name, dob, admission_no, remedial_flag })
  })
  return { valid, errors }
}

export async function downloadSubjectsTemplate(className, existingSubjects = []) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RMS v3'; wb.created = new Date()
  const wsI = wb.addWorksheet('Instructions')
  wsI.getColumn(1).width = 72
  ;[
    ['BULK SUBJECTS IMPORT TEMPLATE — RMS v3'], [''], ['INSTRUCTIONS:'],
    ['1. Do NOT change column headers in the Subjects sheet'],
    ['2. Subject Name is required and must be unique per class'],
    ['3. Order — display order number (1, 2, 3...)'],
    ['4. Has Internal — Yes or No'], ['5. Divisor — number to divide raw total by (usually 1)'],
    ['6. Max marks fields are integers (0 = term not used)'],
    ['7. T4 columns — leave 0 if your school uses 3 terms or fewer.'], [''],
    ['Leave a field blank to use defaults.'],
  ].forEach(r => wsI.addRow(r))
  wsI.getRow(1).font = { bold: true, size: 12 }

  const wsD = wb.addWorksheet('Subjects')
  wsD.columns = [
    { header: 'Subject Name', key: 'subject_name', width: 24 }, { header: 'Order', key: 'display_order', width: 9 },
    { header: 'Has Internal', key: 'has_internal', width: 14 },
    { header: 'Max T1', key: 'max_t1', width: 9 }, { header: 'Max T1 Int', key: 'max_t1_int', width: 11 },
    { header: 'Max T2', key: 'max_t2', width: 9 }, { header: 'Max T2 Int', key: 'max_t2_int', width: 11 },
    { header: 'Max T3', key: 'max_t3', width: 9 }, { header: 'Max T3 Int', key: 'max_t3_int', width: 11 },
    { header: 'Max T4', key: 'max_t4', width: 9 }, { header: 'Max T4 Int', key: 'max_t4_int', width: 11 },
    { header: 'Divisor', key: 'divisor', width: 10 },
  ]
  _styleHeaderRow(wsD.getRow(1), wsD.columns.length)
  const dataRows = existingSubjects.length
    ? existingSubjects.map(s => [s.subject_name, s.display_order, s.has_internal ? 'Yes' : 'No', s.max_t1, s.max_t1_int, s.max_t2, s.max_t2_int, s.max_t3, s.max_t3_int, s.max_t4 || 0, s.max_t4_int || 0, s.divisor])
    : [['English', 1, 'Yes', 80, 20, 80, 20, 80, 20, 0, 0, 1], ['Mathematics', 2, 'No', 100, 0, 100, 0, 100, 0, 0, 0, 1], ['Science', 3, 'Yes', 80, 20, 80, 20, 80, 20, 0, 0, 1]]
  dataRows.forEach((r, idx) => _styleDataRow(wsD.addRow(r), idx, wsD.columns.length))
  _download(await wb.xlsx.writeBuffer(), className ? `SubjectsTemplate_${className}.xlsx` : 'SubjectsTemplate.xlsx')
}

export function parseSubjectsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(e.target.result)
        const ws = wb.getWorksheet('Subjects') || wb.worksheets[0]
        if (!ws) { resolve([]); return }
        const headers = [], rows = []
        ws.eachRow((row, rowNum) => {
          const values = row.values.slice(1)
          if (rowNum === 1) values.forEach(v => headers.push(v == null ? '' : String(v)))
          else {
            if (!values.some(v => v != null && v !== '')) return
            const obj = {}
            headers.forEach((h, i) => { obj[h] = values[i] == null ? '' : values[i] })
            rows.push(obj)
          }
        })
        resolve(rows)
      } catch (err) { reject(new Error('Could not read file: ' + err.message)) }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}

export function validateSubjectRows(rows, className, schoolId) {
  const valid = [], errors = [], seen = new Set()
  const g     = (row, keys) => { for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k]; return '' }
  const toInt = v => (v === '' || v == null) ? 0 : (parseInt(v) || 0)
  const toFlt = v => (v === '' || v == null) ? 1 : (parseFloat(v) || 1)
  const toBool = v => String(v).toLowerCase() === 'yes' || String(v) === '1' || String(v).toLowerCase() === 'true'

  rows.forEach((row, idx) => {
    const rowNum = idx + 2, rowErrors = []
    const subject_name  = String(g(row, ['Subject Name', 'subject name', 'Subject', 'NAME']) || '').trim()
    const display_order = toInt(g(row, ['Order', 'order', 'Display Order']))
    const has_internal  = toBool(g(row, ['Has Internal', 'has_internal']) || 'Yes')
    const max_t1        = toInt(g(row, ['Max T1', 'max_t1']))
    const max_t1_int    = toInt(g(row, ['Max T1 Int', 'max_t1_int']))
    const max_t2        = toInt(g(row, ['Max T2', 'max_t2']))
    const max_t2_int    = toInt(g(row, ['Max T2 Int', 'max_t2_int']))
    const max_t3        = toInt(g(row, ['Max T3', 'max_t3']))
    const max_t3_int    = toInt(g(row, ['Max T3 Int', 'max_t3_int']))
    const divisor       = toFlt(g(row, ['Divisor', 'divisor']))
    const max_t4        = toInt(g(row, ['Max T4', 'max_t4']))
    const max_t4_int    = toInt(g(row, ['Max T4 Int', 'max_t4_int']))
    // term_names is not imported from Excel — it is controlled by the school's
    // Terms Configuration setting and synced automatically. We use a placeholder
    // that will be overwritten on the next saveTerms() call.
    const term_names    = 'Term 1,Term 2,Term 3'

    if (!subject_name) rowErrors.push('Subject Name is required')
    if (seen.has(subject_name.toLowerCase())) rowErrors.push(`Duplicate: "${subject_name}"`)
    if (subject_name) seen.add(subject_name.toLowerCase())

    if (rowErrors.length) errors.push({ rowNum, subject_name: subject_name || '(blank)', issues: rowErrors })
    else valid.push({ subject_name, display_order, has_internal, max_t1, max_t1_int, max_t2, max_t2_int, max_t3, max_t3_int, max_t4, max_t4_int, divisor, term_names, class_name: className, school_id: schoolId })
  })
  return { valid, errors }
}