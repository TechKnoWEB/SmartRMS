// src/utils/grades.js
// Dynamic grading utility — supports custom grade bands fetched from DB,
// and up to 4 terms via the config table's max_t1…max_t4 columns.
// Term cap is 4 — T5/T6 columns were removed in migration 015.

export const DEFAULT_GRADE_BANDS = [
  { grade_label: 'A+', min_pct: 90, color_class: 'text-emerald-700 bg-emerald-50' },
  { grade_label: 'A',  min_pct: 80, color_class: 'text-emerald-600 bg-emerald-50' },
  { grade_label: 'B+', min_pct: 70, color_class: 'text-blue-700 bg-blue-50' },
  { grade_label: 'B',  min_pct: 60, color_class: 'text-blue-600 bg-blue-50' },
  { grade_label: 'C+', min_pct: 45, color_class: 'text-amber-700 bg-amber-50' },
  { grade_label: 'C',  min_pct: 33, color_class: 'text-amber-600 bg-amber-50' },
  { grade_label: 'D',  min_pct:  0, color_class: 'text-red-600 bg-red-50' },
]

export function getGrade(pct, gradeBands = null) {
  const bands = (gradeBands && gradeBands.length > 0)
    ? [...gradeBands].sort((a, b) => b.min_pct - a.min_pct)
    : DEFAULT_GRADE_BANDS
  for (const b of bands) {
    if (pct >= b.min_pct) return b.grade_label
  }
  return bands[bands.length - 1]?.grade_label || 'D'
}

export function getGradeColor(grade, gradeBands = null) {
  const bands = (gradeBands && gradeBands.length > 0) ? gradeBands : DEFAULT_GRADE_BANDS
  const found = bands.find(b => b.grade_label === grade)
  return found?.color_class || 'text-gray-600 bg-gray-100'
}

export function getTermCount(cfg) {
  if (!cfg) return 3
  // Max 4 terms — T5/T6 removed in migration 015
  for (let t = 4; t >= 1; t--) {
    if ((cfg[`max_t${t}`] || 0) > 0) return t
  }
  return 3
}

export function getMaxForTerm(cfg, termNum) {
  if (!cfg) return { w: 0, i: 0 }
  return { w: cfg[`max_t${termNum}`] || 0, i: cfg[`max_t${termNum}_int`] || 0 }
}

export function buildStudentResult(student, cfgRows, mRows, options = {}) {
  const { gradeBands = null, passMark = 33 } = options

  let maxTerms = 0
  cfgRows.forEach(cfg => { const tc = getTermCount(cfg); if (tc > maxTerms) maxTerms = tc })
  if (maxTerms < 1) maxTerms = 3
  if (maxTerms > 4) maxTerms = 4  // hard cap — migration 015 removed T5/T6

  const tnStr     = cfgRows[0]?.term_names || 'Term 1,Term 2,Term 3'
  const termNames = tnStr.split(',').map(t => t.trim())
  while (termNames.length < maxTerms) termNames.push(`Term ${termNames.length + 1}`)

  const mMap = {}
  mRows.forEach(m => {
    if (!mMap[m.subject_name]) mMap[m.subject_name] = {}
    mMap[m.subject_name][m.term] = { written: m.written, internal: m.internal }
  })

  const subjects = []
  let grandTotal = 0, grandMax = 0, overallPass = true

  cfgRows.forEach(cfg => {
    const hi  = cfg.has_internal !== false
    const div = parseFloat(cfg.divisor) || 1
    const tc  = getTermCount(cfg)

    const subj = {
      subject_name: cfg.subject_name, has_internal: hi, divisor: div,
      terms: [], raw_total: 0, max_total: 0, final_total: 0, final_max: 0,
      subject_pass: true, has_ab: false,
    }
    let rawT = 0, rawM = 0

    for (let t = 1; t <= tc; t++) {
      const { w: maxW, i: maxI } = getMaxForTerm(cfg, t)
      const tm   = mMap[cfg.subject_name]?.[t] || {}
      const wRaw = tm.written, iRaw = tm.internal
      const wAB  = typeof wRaw === 'string' && wRaw.toUpperCase() === 'AB'
      const iAB  = typeof iRaw === 'string' && iRaw.toUpperCase() === 'AB'
      const wNum = wAB ? 0 : (parseFloat(wRaw) || 0)
      const iNum = iAB ? 0 : (parseFloat(iRaw) || 0)
      const tTot = wNum + (hi ? iNum : 0)
      const tMax = maxW + (hi ? maxI : 0)
      if (wAB || iAB) subj.has_ab = true
      subj.terms.push({
        term: t, term_name: termNames[t - 1] || `Term ${t}`,
        written: wAB ? 'AB' : wNum, internal: hi ? (iAB ? 'AB' : iNum) : null,
        written_display:  wRaw == null || wRaw === '' ? '—' : (wAB ? 'AB' : String(wNum)),
        internal_display: !hi ? null : (iRaw == null || iRaw === '' ? '—' : (iAB ? 'AB' : String(iNum))),
        max_written: maxW, max_internal: hi ? maxI : 0,
        total: tTot, max: tMax,
      })
      rawT += tTot; rawM += tMax
    }

    subj.raw_total   = rawT; subj.max_total = rawM
    subj.final_total = rawT / div; subj.final_max = rawM / div
    const pct = subj.final_max > 0 ? (subj.final_total / subj.final_max * 100) : 0
    subj.subject_percentage = Math.round(pct * 100) / 100
    subj.subject_grade      = getGrade(pct, gradeBands)
    subj.subject_pass       = pct >= passMark
    if (!subj.subject_pass) overallPass = false
    grandTotal += subj.final_total; grandMax += subj.final_max
    subjects.push(subj)
  })

  const overallPct  = grandMax > 0 ? Math.round((grandTotal / grandMax * 100) * 100) / 100 : 0
  const d_count     = subjects.filter(s => !s.subject_pass).length
  const fail_count  = d_count

  return {
    student: {
      id: student.id, name: student.name, roll: student.roll,
      class_name: student.class_name, section: student.section,
      father_name: student.father_name || '', mother_name: student.mother_name || '',
      dob: student.dob || '', admission_no: student.admission_no || '',
    },
    term_names: termNames.slice(0, maxTerms), max_terms: maxTerms,
    subjects,
    grand_total: Math.round(grandTotal * 100) / 100,
    grand_max:   Math.round(grandMax   * 100) / 100,
    percentage: overallPct,
    grade:      getGrade(overallPct, gradeBands),
    pass:       overallPass,
    result_status: overallPass ? 'PASS' : 'FAIL',
    d_count, fail_count,
    rank: null, total_students: null,
    attendance_pct: student.attendance_pct ?? null,
  }
}

export function rankComparator(a, b) {
  if (a.d_count    !== b.d_count)    return a.d_count    - b.d_count
  if (a.fail_count !== b.fail_count) return a.fail_count - b.fail_count
  return b.percentage - a.percentage
}