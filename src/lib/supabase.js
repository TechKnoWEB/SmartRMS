import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate env vars — but NEVER throw at module level.
// A module-level throw kills the JS runtime before React mounts = blank white page with no error.
// Instead, export ENV_ERRORS so App.jsx can render a readable setup screen.
const _envErrors = []
if (!supabaseUrl)     _envErrors.push('VITE_SUPABASE_URL is not set.')
if (!supabaseAnonKey) _envErrors.push('VITE_SUPABASE_ANON_KEY is not set.')
if (supabaseUrl && !/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl))
  _envErrors.push(`VITE_SUPABASE_URL looks malformed: "${supabaseUrl}". Expected: https://<ref>.supabase.co`)
if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ'))
  _envErrors.push('VITE_SUPABASE_ANON_KEY looks invalid — expected a JWT starting with "eyJ".')

/** Non-empty when .env is missing or misconfigured. Read by App.jsx. */
export const ENV_ERRORS = _envErrors

// Only create the client when env vars are valid — avoids a secondary crash
export const supabase = _envErrors.length === 0
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ── School session initialisation ────────────────────────────
// Sets the Postgres session variable app.school_id so all RLS
// school-scoped policies resolve correctly for this connection.
export async function setSessionSchool(dise_code) {
  if (!supabase) return false
  const { error } = await supabase.rpc('set_session_school', { dise_code })
  if (error) {
    console.error('[RMS] Failed to set session school:', error.message)
    return false
  }
  return true
}
