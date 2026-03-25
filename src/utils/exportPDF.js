import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReportCard from '../components/results/ReportCard'

// ── Collect all <style> and <link rel="stylesheet"> from the current page ────
function collectPageStyles() {
  const parts = []

  // Inline <style> tags (Tailwind injects here in dev + prod)
  document.querySelectorAll('style').forEach(el => {
    parts.push(el.outerHTML)
  })

  // External <link rel="stylesheet"> sheets
  document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
    // Clone and make href absolute
    const href = el.href  // already absolute in browser
    parts.push(`<link rel="stylesheet" href="${href}"/>`)
  })

  return parts.join('\n')
}

// ── Build a full print-ready HTML page from a result + school ────────────────
function buildPrintPage(result, school, title) {
  // Render the React component to static HTML
  const cardHTML = renderToStaticMarkup(
    React.createElement(ReportCard, {
      result,
      school,
      showActions:   false,  // no buttons in the print window
      allowDownload: false,
    })
  )

  const styles = collectPageStyles()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title || 'Report Card'}</title>
  ${styles}
  <style>
    /* Print-specific overrides */
    @media print {
      @page { size: A4 portrait; margin: 12mm 10mm; }
      body  { background: white !important; }
      *     { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    body { background: #f8fafc; padding: 16px; }
    .print-wrapper { max-width: 900px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${cardHTML}
  </div>
</body>
</html>`
}

// ── Open a new browser window with the HTML ──────────────────────────────────
function openWindow(html, title) {
  const win = window.open('', '_blank', 'width=960,height=720,menubar=yes,toolbar=yes')
  if (!win) {
    alert('Popup blocked!\n\nPlease allow popups for this site, then try again.')
    return null
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.document.title = title || 'Report Card'
  return win
}

function triggerPrint(win, delay = 600) {
  if (!win) return
  const go = () => { try { win.focus(); win.print() } catch (e) {} }
  if (win.document.readyState === 'complete') {
    setTimeout(go, delay)
  } else {
    win.onload = () => setTimeout(go, delay)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function downloadReportCardPDF(result, school) {
  const title = `Report Card — ${result.student.name}`
  const html  = buildPrintPage(result, school, title)
  const win   = openWindow(html, title)
  triggerPrint(win, 600)
}

export function printReportCard(result, school) {
  const title = `Report Card — ${result.student.name}`
  const html  = buildPrintPage(result, school, title)
  const win   = openWindow(html, title)
  triggerPrint(win, 600)
}

// ── Bulk PDF: all cards in one window, page-break between each ────────────────
export async function exportBulkPDF(results, school, onProgress) {
  if (!results?.length) return

  const schoolObj = typeof school === 'string' ? { school_name: school } : (school || {})
  const total = results.length
  let done = 0

  const styles = collectPageStyles()

  let body = ''
  for (const r of results) {
    const cardHTML = renderToStaticMarkup(
      React.createElement(ReportCard, {
        result: r,
        school: schoolObj,
        showActions:   false,
        allowDownload: false,
      })
    )
    const isLast = done === total - 1
    body += `<div class="rc-page${isLast ? ' last' : ''}">${cardHTML}</div>`
    done++
    if (onProgress) onProgress(done, total)
    // yield to browser every 5 cards
    if (done % 5 === 0) await new Promise(res => setTimeout(res, 0))
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Bulk Report Cards (${total} students)</title>
  ${styles}
  <style>
    @media print {
      @page { size: A4 portrait; margin: 12mm 10mm; }
      body  { background: white !important; }
      *     { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .rc-page         { page-break-after: always; }
      .rc-page.last    { page-break-after: avoid; }
    }
    body { background: #f8fafc; }
    .rc-page { max-width: 900px; margin: 0 auto 32px; padding: 16px; }
    .rc-page.last { margin-bottom: 0; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`

  const win = openWindow(html, `Bulk Report Cards (${total} students)`)
  triggerPrint(win, 800)
}
