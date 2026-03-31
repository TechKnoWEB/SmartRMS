// src/pages/superadmin/saConstants.js
// Shared constants and the callApi utility used by every super admin file.
// Import from here — never duplicate these in tab files.

import {
  Edit3, FileText, BarChart2, BookOpen, Globe,
  MessageSquare, Database,
} from 'lucide-react'

/* ── Env ─────────────────────────────────────────────────────── */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '')
export const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

/* ── API helper ──────────────────────────────────────────────── */
export async function callApi(path, creds, body = {}) {
  if (!ANON_KEY)     throw new Error('VITE_SUPABASE_ANON_KEY is not set in .env')
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is not set in .env')

  const url = `${SUPABASE_URL}/functions/v1/rms-api${path}`

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey':        ANON_KEY,
        'x-sa-id':       creds.adminId.trim(),
        'x-sa-pass':     creds.password.trim(),
      },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    throw new Error(
      `Cannot reach Edge Function at ${url}. ` +
      `Check: 1) VITE_SUPABASE_URL 2) Edge function deployed 3) Function name is "rms-api"`
    )
  }

  const ct   = res.headers.get('content-type') || ''
  let   data = {}

  if (ct.includes('application/json')) {
    try { data = await res.json() } catch { data = {} }
  } else {
    const text = await res.text().catch(() => '')
    if (res.status === 401) throw new Error('Invalid Admin ID or password.')
    if (res.status === 404) throw new Error('Edge Function route not found.')
    if (text.includes('Function not found') || text.includes('not found'))
      throw new Error('Edge Function "rms-api" not found.')
    throw new Error(`Edge Function error (HTTP ${res.status}): ${text.slice(0, 200)}`)
  }

  if (res.status === 401) throw new Error(data.error || 'Invalid Admin ID or password.')
  if (res.status === 404) throw new Error(data.error || 'Route not found.')
  if (!res.ok)            throw new Error(data.error || `HTTP ${res.status}`)

  return data
}

/* ── Plans ───────────────────────────────────────────────────── */
// Student count is the primary plan differentiator. All features are available on every plan.
export const PLANS = [
  { key: 'free',       label: 'Free',       color: 'gray',   price: '₹0',        maxStudents: 50    },
  { key: 'basic',      label: 'Basic',      color: 'blue',   price: '₹999/mo',   maxStudents: 500   },
  { key: 'pro',        label: 'Pro',        color: 'indigo', price: '₹2,499/mo', maxStudents: 1500  },
  { key: 'enterprise', label: 'Enterprise', color: 'violet', price: 'Custom',    maxStudents: '∞'   },
]

/* ── Features ────────────────────────────────────────────────── */
export const FEATURES = [
  { key: 'marks_entry',    label: 'Marks Entry',    icon: Edit3,        desc: 'Teachers can enter & edit marks'       },
  { key: 'report_cards',   label: 'Report Cards',   icon: FileText,     desc: 'Generate & print report cards'         },
  { key: 'analytics',      label: 'Analytics',      icon: BarChart2,    desc: 'Class & school analytics dashboards'   },
  { key: 'excel_export',   label: 'Excel Export',   icon: BookOpen,     desc: 'Download marks as Excel files'         },
  { key: 'student_portal', label: 'Student Portal', icon: Globe,        desc: 'Public result lookup portal'           },
  { key: 'sms_alerts',     label: 'SMS Alerts',     icon: MessageSquare,desc: 'Send results via SMS to parents'       },
  { key: 'bulk_operations',label: 'Bulk Operations',icon: Database,     desc: 'Bulk import/export operations'         },
]

// All features are free on every plan — pricing is based on student capacity only.
export const DEF_FEATURES = {
  marks_entry: true, report_cards: true, analytics: true,
  excel_export: true, student_portal: true, sms_alerts: true, bulk_operations: true,
}

export const PLAN_FEATURES = {
  free:       { marks_entry: true, report_cards: true, analytics: true, excel_export: true, student_portal: true, sms_alerts: true, bulk_operations: true },
  basic:      { marks_entry: true, report_cards: true, analytics: true, excel_export: true, student_portal: true, sms_alerts: true, bulk_operations: true },
  pro:        { marks_entry: true, report_cards: true, analytics: true, excel_export: true, student_portal: true, sms_alerts: true, bulk_operations: true },
  enterprise: { marks_entry: true, report_cards: true, analytics: true, excel_export: true, student_portal: true, sms_alerts: true, bulk_operations: true },
}
