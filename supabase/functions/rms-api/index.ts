// supabase/functions/rms-api/index.ts
//
// ── WHY 503s HAPPEN & WHAT THIS FILE FIXES ───────────────────
//
// A 503 from a Supabase Edge Function means the Deno runtime crashed
// before it could serve a request. Common causes:
//
//   1. Import URL unreachable at cold-start (esm.sh flakes under load)
//   2. Unhandled promise rejection escaping the serve() handler
//   3. TypeScript type errors that Deno's strict compiler rejects
//   4. Missing env vars causing null-dereference at startup
//   5. Top-level code (outside serve()) that throws
//
// Fixes applied in this version:
//   • Pinned import URLs with fallback CDN comments
//   • All route handlers wrapped in try/catch — no unhandled rejections
//   • Top-level env var validation deferred inside serve() not outside
//   • Explicit return type annotations to help Deno's type checker
//   • No top-level await, no top-level side-effects
//   • Body parsing always inside try/catch
//   • All new Phase 1 routes included (stats, packages, config, users)
//   • /users/reset-password included (admin password recovery)

// ── Imports ───────────────────────────────────────────────────
// Using pinned std version. If esm.sh is unavailable at cold-start,
// try switching to: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ── Types ─────────────────────────────────────────────────────
type JsonBody = Record<string, unknown>

// ── CORS ──────────────────────────────────────────────────────
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sa-id, x-sa-pass',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age':       '86400',
}

function respond(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ── Auth ──────────────────────────────────────────────────────
// Constant-time string comparison — prevents timing attacks
function safeEq(a: string, b: string): boolean {
  const la = a.length
  const lb = b.length
  const len = Math.max(la, lb)
  let diff = la ^ lb
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0)
  }
  return diff === 0
}

function authenticate(req: Request): string | null {
  const expectedId   = (Deno.env.get('SUPER_ADMIN_ID')   ?? '').trim()
  const expectedPass = (Deno.env.get('SUPER_ADMIN_PASS') ?? '').trim()
  if (!expectedId || !expectedPass) {
    console.error('[rms-api] SUPER_ADMIN_ID or SUPER_ADMIN_PASS env vars not set')
    return null
  }
  const id   = (req.headers.get('x-sa-id')   ?? '').trim()
  const pass = (req.headers.get('x-sa-pass') ?? '').trim()
  if (!id || !pass)               return null
  if (!safeEq(id,   expectedId))  return null
  if (!safeEq(pass, expectedPass)) return null
  return id
}

// ── Helpers ───────────────────────────────────────────────────
function mkCode(): string {
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b: number) => b.toString(10).padStart(3, '0'))
    .join('')
    .slice(0, 12)
  return raw.padEnd(12, '0')
}

// PBKDF2-SHA256 — same algorithm as frontend security.js
async function hashPassword(password: string): Promise<string> {
  const enc    = new TextEncoder()
  const salt   = crypto.getRandomValues(new Uint8Array(16))
  const keyMat = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMat, 256
  )
  const toHex = (arr: Uint8Array): string =>
    Array.from(arr).map((b: number) => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2$${toHex(salt)}$${toHex(new Uint8Array(bits))}`
}

async function safeJson(req: Request): Promise<[JsonBody | null, string | null]> {
  try {
    const body = await req.json() as JsonBody
    return [body, null]
  } catch {
    return [null, 'Invalid JSON body']
  }
}

// ── Main handler ──────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {

  // ── OPTIONS preflight ──────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed. Use POST.' }, 405)
  }

  // ── Route extraction ───────────────────────────────────────
  let path: string
  try {
    const url = new URL(req.url)
    path = url.pathname.replace(/^.*\/rms-api/, '').replace(/\/$/, '') || '/'
  } catch {
    return respond({ error: 'Invalid request URL' }, 400)
  }

  console.log(`[rms-api] ${req.method} ${path}`)

  // ── Supabase client ────────────────────────────────────────
  const supabaseUrl     = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[rms-api] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    return respond({ error: 'Server configuration error' }, 503)
  }

  const db: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // ── Wrap everything in a top-level try/catch ───────────────
  // This prevents any unhandled exception from causing a 503.
  try {

    // ════════════════════════════════════════════════════════
    // PUBLIC ROUTES (no auth required)
    // ════════════════════════════════════════════════════════

    // ── /portal/rate-check ───────────────────────────────────
    if (path === '/portal/rate-check') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const identifier = (body!.identifier as string | undefined)?.trim()
      const school_id  =  body!.school_id  as string | undefined

      if (!identifier || !school_id)
        return respond({ error: 'identifier and school_id required' }, 400)
      if (!/^[\w-]{1,200}$/.test(identifier))
        return respond({ error: 'Invalid identifier format' }, 400)

      const RATE_MAX    = 3
      const RATE_WINDOW = 35 * 60 * 1000
      const now         = new Date()
      const windowStart = new Date(now.getTime() - RATE_WINDOW)

      const { data: ex } = await db
        .from('rate_limits')
        .select('attempt_count, timestamp')
        .eq('identifier', identifier)
        .maybeSingle()

      if (!ex) {
        await db.from('rate_limits').insert({
          identifier, attempt_count: 1, timestamp: now.toISOString(),
        })
        return respond({ allowed: true }, 200)
      }

      const lastTs = new Date(ex.timestamp as string)
      if (lastTs < windowStart) {
        await db.from('rate_limits')
          .update({ attempt_count: 1, timestamp: now.toISOString() })
          .eq('identifier', identifier)
        return respond({ allowed: true }, 200)
      }

      if ((ex.attempt_count as number) >= RATE_MAX) {
        const resetMinutes = Math.ceil(
          (lastTs.getTime() + RATE_WINDOW - now.getTime()) / 60000
        )
        return respond({ allowed: false, resetMinutes }, 200)
      }

      await db.from('rate_limits')
        .update({ attempt_count: (ex.attempt_count as number) + 1 })
        .eq('identifier', identifier)
      return respond({ allowed: true }, 200)
    }

    // ── /auth/login ──────────────────────────────────────────
    if (path === '/auth/login') {
      const adminId = authenticate(req)
      if (!adminId) return respond({ error: 'Invalid Admin ID or password.' }, 401)
      return respond({ ok: true, admin_id: adminId }, 200)
    }


// ── /auth/forgot-password  (PUBLIC) ──────────────────────────
// Takes { user_id, school_code } — finds the school's contact_email
// and sends a reset link. The token is a time-limited HMAC stored
// in platform_config with a 15-minute TTL.
// Required env vars: RESEND_API_KEY, APP_URL (e.g. https://yourapp.com)

  if (path === '/auth/forgot-password') {
    const [body, parseErr] = await safeJson(req)
    if (parseErr) return respond({ error: parseErr }, 400)

    const userId    = (body!.user_id    as string | undefined)?.trim()
    const schoolCode = (body!.school_code as string | undefined)?.trim()

    if (!userId || !schoolCode)
      return respond({ error: 'user_id and school_code required' }, 400)

    // Rate limit: max 3 reset attempts per user per hour
    const rateLimitKey = `forgot_pw:${userId}:${schoolCode}`
    const { data: rl } = await db.from('rate_limits')
      .select('attempt_count, timestamp')
      .eq('identifier', rateLimitKey)
      .maybeSingle()

    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    if (rl) {
      const lastTs = new Date(rl.timestamp as string)
      if (lastTs > hourAgo && (rl.attempt_count as number) >= 3) {
        // Return 200 (not 429) — don't reveal whether the user exists
        return respond({ ok: true, message: 'If that account exists, a reset email was sent.' }, 200)
      }
      if (lastTs < hourAgo) {
        await db.from('rate_limits').update({ attempt_count: 1, timestamp: now.toISOString() }).eq('identifier', rateLimitKey)
      } else {
        await db.from('rate_limits').update({ attempt_count: (rl.attempt_count as number) + 1 }).eq('identifier', rateLimitKey)
      }
    } else {
      await db.from('rate_limits').insert({ identifier: rateLimitKey, attempt_count: 1, timestamp: now.toISOString() })
    }

    // Look up school — select both email columns; contact_email is primary, email is fallback
    const { data: school } = await db
      .from('schools')
      .select('id, contact_email, email, school_name')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .maybeSingle()

    // Look up user — must belong to this school
    const { data: user } = school
      ? await db.from('users').select('user_id, name, school_id').eq('user_id', userId).eq('school_id', school.id).maybeSingle()
      : { data: null }

    // Always return the same message — don't leak user existence
    if (!school || !user) {
      return respond({ ok: true, message: 'If that account exists, a reset email was sent.' }, 200)
    }

    // Generate a secure token: 32 random bytes → hex
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token      = Array.from(tokenBytes).map((b: number) => b.toString(16).padStart(2, '0')).join('')
    const expiresAt  = new Date(now.getTime() + 15 * 60 * 1000).toISOString()

    // Store token in platform_config (keyed, will be cleaned up on use)
    const tokenKey = `pw_reset:${token}`
    await db.from('platform_config').upsert({
      key:        tokenKey,
      value:      JSON.stringify({ user_id: userId, school_id: school.id, expires_at: expiresAt }),
      updated_at: now.toISOString(),
    }, { onConflict: 'key' })

    // Send reset email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const APP_URL        = (Deno.env.get('APP_URL') ?? 'https://yourapp.com').replace(/\/$/, '')

    if (!RESEND_API_KEY) {
      console.error('[forgot-password] RESEND_API_KEY not set')
      return respond({ error: 'Email service not configured' }, 503)
    }

    const resetLink = `${APP_URL}/reset-password?token=${token}`
    const schoolName = (school as { school_name: string }).school_name

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center">
    <div style="width:56px;height:56px;background:rgba(255,255,255,.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:28px">🔑</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">Password Reset</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,.75);font-size:14px">${schoolName} · RMS</p>
  </div>
  <div style="padding:32px 24px">
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px">Hi <strong>${(user as { name: string }).name}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
      We received a request to reset the password for your RMS account (<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px">${userId}</code>).
      This link expires in <strong>15 minutes</strong>.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${resetLink}"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
                font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none">
        Reset My Password
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;padding-top:20px;border-top:1px solid #f3f4f6">
      If you didn't request this, ignore this email — your password won't change.<br>
      This link is single-use and expires in 15 minutes.
    </p>
  </div>
</div>
</body></html>`

    const recipientEmail =
      (school as { contact_email: string | null; email: string | null }).contact_email ||
      (school as { contact_email: string | null; email: string | null }).email

    if (!recipientEmail) {
      console.error('[forgot-password] School has no email address configured:', schoolCode)
      // Still return 200 — don't reveal to the caller that no email is set
      return respond({ ok: true, message: 'If that account exists, a reset email was sent.' }, 200)
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'RMS <noreply@yourapp.com>',
        to:      [recipientEmail],
        subject: `Password reset for ${userId} — ${schoolName}`,
        html,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text().catch(() => '')
      console.error('[forgot-password] Resend error:', errText)
      // Don't expose email errors to client
    }

    return respond({ ok: true, message: 'If that account exists, a reset email was sent.' }, 200)
  }

// ── /auth/reset-password  (PUBLIC) ───────────────────────────
// Takes { token, new_password } — validates token, hashes + saves password,
// then deletes the token.

  if (path === '/auth/reset-password') {
    const [body, parseErr] = await safeJson(req)
    if (parseErr) return respond({ error: parseErr }, 400)

    const token        = (body!.token        as string | undefined)?.trim()
    const new_password = (body!.new_password as string | undefined)?.trim()

    if (!token)        return respond({ error: 'token required' }, 400)
    if (!new_password) return respond({ error: 'new_password required' }, 400)
    if (new_password.length < 8)
      return respond({ error: 'Password must be at least 8 characters' }, 400)

    // Validate token
    const tokenKey = `pw_reset:${token}`
    const { data: tokenRow } = await db.from('platform_config')
      .select('key, value')
      .eq('key', tokenKey)
      .maybeSingle()

    if (!tokenRow) return respond({ error: 'Invalid or expired reset link.' }, 400)

    let tokenData: { user_id: string; school_id: string; expires_at: string }
    try {
      tokenData = JSON.parse(tokenRow.value as string)
    } catch {
      return respond({ error: 'Invalid token format.' }, 400)
    }

    // Check expiry
    if (new Date(tokenData.expires_at) < new Date())
      return respond({ error: 'Reset link has expired. Please request a new one.' }, 400)

    // Hash new password (PBKDF2 — same as frontend security.js)
    const enc    = new TextEncoder()
    const salt   = crypto.getRandomValues(new Uint8Array(16))
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(new_password), 'PBKDF2', false, ['deriveBits'])
    const bits   = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMat, 256)
    const toHex  = (arr: Uint8Array) => Array.from(arr).map((b: number) => b.toString(16).padStart(2, '0')).join('')
    const hashed = `pbkdf2$${toHex(salt)}$${toHex(new Uint8Array(bits))}`

    // Update password
    const { error: updateErr } = await db.from('users')
      .update({ password: hashed })
      .eq('user_id', tokenData.user_id)
      .eq('school_id', tokenData.school_id)

    if (updateErr) return respond({ error: updateErr.message }, 500)

    // Delete token (single-use)
    await db.from('platform_config').delete().eq('key', tokenKey)

    // Audit log
    await db.from('entry_logs').insert({
      saved_by:    tokenData.user_id,
      school_id:   tokenData.school_id,
      action_type: 'PASSWORD_CHANGE',
      status:      'Saved',
      notes:       'Password reset via forgot-password email link',
    }).catch(() => {})

    return respond({ ok: true }, 200)
  }

// ================================================================
// END OF PATCH — place both blocks right after the /auth/login block,
// ================================================================


    // ════════════════════════════════════════════════════════
    // PROTECTED ROUTES (super admin credentials required)
    // ════════════════════════════════════════════════════════

    const adminId = authenticate(req)
    if (!adminId) return respond({ error: 'Unauthorized' }, 401)

    // ── /packages/update ─────────────────────────────────────
    // Update any field of a package row. Called by PackageManagement.jsx when admin clicks Save in the edit drawer.
    if (path === '/packages/update') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const id = (body!.id as string | undefined)?.trim()
      if (!id) return respond({ error: 'id required' }, 400)

      // Verify package exists
      const { data: existing, error: findErr } = await db
        .from('packages')
        .select('id, plan_key')
        .eq('id', id)
        .maybeSingle()

      if (findErr) return respond({ error: findErr.message }, 500)
      if (!existing) return respond({ error: `Package "${id}" not found` }, 404)

      // Build update payload — only include fields that were sent
      const update: Record<string, unknown> = {}

      if (body!.name          !== undefined) update.name           = (body!.name as string).trim()
      if (body!.description   !== undefined) update.description    = body!.description || null
      if (body!.price_monthly !== undefined) update.price_monthly  = Number(body!.price_monthly)  ?? 0
      if (body!.price_yearly  !== undefined) update.price_yearly   = Number(body!.price_yearly)   ?? 0
      if (body!.max_students  !== undefined) update.max_students   = Number(body!.max_students)   ?? -1
      if (body!.max_teachers  !== undefined) update.max_teachers   = Number(body!.max_teachers)   ?? -1
      if (body!.display_order !== undefined) update.display_order  = Number(body!.display_order)  ?? 0
      if (body!.is_active     !== undefined) update.is_active      = Boolean(body!.is_active)
      if (body!.feature_preset !== undefined) {
        const fp = body!.feature_preset as Record<string, unknown>
        if (typeof fp !== 'object' || Array.isArray(fp))
          return respond({ error: 'feature_preset must be an object' }, 400)
        update.feature_preset = fp
      }

      if (Object.keys(update).length === 0)
        return respond({ error: 'No fields to update' }, 400)

      if (update.name !== undefined && !(update.name as string).trim())
        return respond({ error: 'Package name cannot be empty' }, 400)

      if (update.price_monthly !== undefined && (update.price_monthly as number) < 0)
        return respond({ error: 'price_monthly must be ≥ 0' }, 400)

      const { error: updateErr } = await db
        .from('packages')
        .update(update)
        .eq('id', id)

      if (updateErr) return respond({ error: updateErr.message }, 500)

      await db.from('entry_logs').insert({
        saved_by:    adminId,
        action_type: 'PACKAGE_UPDATE',
        status:      'Saved',
        notes:       `Package "${update.name ?? existing.plan_key}" updated by super admin ${adminId}`,
      }).catch(() => {})

      return respond({ ok: true, id }, 200)
    }

    // ── /registrations/approve ───────────────────────────────
    if (path === '/registrations/approve') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const registration_id = (body!.registration_id as string | undefined)?.trim()
      if (!registration_id) return respond({ error: 'registration_id required' }, 400)

      const { data: reg, error: e1 } = await db
        .from('school_registrations')
        .select('*')
        .eq('id', registration_id)
        .single()
      if (e1 || !reg) return respond({ error: 'Registration not found' }, 404)
      if (reg.status !== 'pending') return respond({ error: `Already ${reg.status}` }, 409)

      // Generate or validate DISE code
      let code: string = (reg.school_code as string | null)?.trim() ?? ''
      if (!code || !/^\d{11,12}$/.test(code)) {
        code = mkCode()
        for (let i = 0; i < 5; i++) {
          const { data: clash } = await db
            .from('schools').select('id').eq('school_code', code).maybeSingle()
          if (!clash) break
          code = mkCode()
        }
      } else {
        const { data: clash } = await db
          .from('schools').select('id').eq('school_code', code).maybeSingle()
        if (clash) return respond({ error: `DISE code ${code} is already registered.` }, 409)
      }

      // Create school record
      const { data: school, error: e2 } = await db.from('schools').insert({
        school_code:      code,
        school_name:      reg.school_name,
        tagline:          reg.tagline          ?? null,
        address:          reg.address          ?? null,
        contact_email:    reg.contact_email,
        contact_phone:    reg.contact_phone    ?? null,
        academic_session: reg.academic_session,
        is_active:        true,
      }).select().single()

      if (e2 || !school) {
        return respond({ error: 'Failed to create school: ' + (e2?.message ?? 'unknown') }, 500)
      }

      // Create admin user
      const { error: e3 } = await db.from('users').insert({
        user_id:   reg.admin_user_id,
        name:      reg.admin_name,
        password:  reg.admin_password_hash,
        role:      'admin',
        school_id: (school as { id: string }).id,
        is_active: true,
      })
      if (e3) {
        // Rollback school creation
        await db.from('schools').delete().eq('id', (school as { id: string }).id)
        return respond({ error: 'Failed to create admin user: ' + e3.message }, 500)
      }

      // Mark registration approved
      await db.from('school_registrations').update({
        status:      'approved',
        school_id:   (school as { id: string }).id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        updated_at:  new Date().toISOString(),
      }).eq('id', registration_id)

      return respond({
        ok:          true,
        school_id:   (school as { id: string }).id,
        school_code: code,
      }, 200)
    }

    // ── /registrations/reject ────────────────────────────────
    if (path === '/registrations/reject') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const registration_id = (body!.registration_id as string | undefined)?.trim()
      const reason          = (body!.reason          as string | undefined)?.trim()

      if (!registration_id) return respond({ error: 'registration_id required' }, 400)
      if (!reason)          return respond({ error: 'reason required' }, 400)

      const { data: reg, error: e1 } = await db
        .from('school_registrations')
        .select('id, status, school_name')
        .eq('id', registration_id)
        .single()
      if (e1 || !reg) return respond({ error: 'Registration not found' }, 404)
      if (reg.status !== 'pending') return respond({ error: `Already ${reg.status}` }, 409)

      await db.from('school_registrations').update({
        status:            'rejected',
        rejection_reason:  reason,
        reviewed_at:       new Date().toISOString(),
        reviewed_by:       adminId,
        updated_at:        new Date().toISOString(),
      }).eq('id', registration_id)

      return respond({ ok: true }, 200)
    }

    // ── /schools/toggle-active ───────────────────────────────
    if (path === '/schools/toggle-active') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const school_id = (body!.school_id as string | undefined)?.trim()
      const is_active =  body!.is_active as boolean | undefined

      if (!school_id || typeof is_active !== 'boolean')
        return respond({ error: 'school_id (string) and is_active (boolean) required' }, 400)

      const { error } = await db.from('schools').update({ is_active }).eq('id', school_id)
      if (error) return respond({ error: error.message }, 500)
      return respond({ ok: true }, 200)
    }

    // ── /schools/set-plan ────────────────────────────────────
    if (path === '/schools/set-plan') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const school_id      = (body!.school_id      as string | undefined)?.trim()
      const plan           = (body!.plan           as string | undefined)?.trim()
      const plan_expires_at = body!.plan_expires_at as string | null | undefined
      const plan_note      = (body!.plan_note      as string | undefined) ?? null

      if (!school_id || !plan) return respond({ error: 'school_id and plan required' }, 400)
      if (!['free', 'basic', 'pro', 'enterprise'].includes(plan))
        return respond({ error: `Invalid plan "${plan}". Must be: free, basic, pro, enterprise` }, 400)

      const { error } = await db.from('schools').update({
        plan,
        plan_expires_at: plan_expires_at ?? null,
        plan_note,
      }).eq('id', school_id)
      if (error) return respond({ error: error.message }, 500)
      return respond({ ok: true }, 200)
    }

    // ── /schools/set-features ────────────────────────────────
    if (path === '/schools/set-features') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const school_id = (body!.school_id as string | undefined)?.trim()
      const features  =  body!.features  as Record<string, boolean> | undefined

      if (!school_id || !features)
        return respond({ error: 'school_id and features object required' }, 400)

      const { error } = await db.from('schools').update({ features }).eq('id', school_id)
      if (error) return respond({ error: error.message }, 500)
      return respond({ ok: true }, 200)
    }

    // ── /schools/set-notes ───────────────────────────────────
    if (path === '/schools/set-notes') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const school_id = (body!.school_id as string | undefined)?.trim()
      const notes     = (body!.notes     as string | undefined) ?? null

      if (!school_id) return respond({ error: 'school_id required' }, 400)

      const { error } = await db.from('schools').update({ admin_notes: notes }).eq('id', school_id)
      if (error) return respond({ error: error.message }, 500)
      return respond({ ok: true }, 200)
    }

    // ── /schools/set-package ─────────────────────────────────
    // Atomically assigns a package via the apply_package() DB function.
    // Requires migration 015 to be applied first.
    if (path === '/schools/set-package') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const school_id  = (body!.school_id  as string | undefined)?.trim()
      const package_id = (body!.package_id as string | undefined)?.trim()
      const expires_at = (body!.expires_at as string | undefined) ?? null
      const notes      = (body!.notes      as string | undefined) ?? null

      if (!school_id || !package_id)
        return respond({ error: 'school_id and package_id required' }, 400)

      const { data, error } = await db.rpc('apply_package', {
        p_school_id:   school_id,
        p_package_id:  package_id,
        p_assigned_by: adminId,
        p_expires_at:  expires_at,
        p_notes:       notes,
      })

      if (error) return respond({ error: error.message }, 500)

      const result = data as { ok: boolean; error?: string; plan?: string; package?: string; features?: unknown }
      if (!result?.ok) return respond({ error: result?.error ?? 'apply_package failed' }, 400)

      return respond({ ok: true, plan: result.plan, package: result.package }, 200)
    }

    // ════════════════════════════════════════════════════════
    // PHASE 1: PLATFORM ANALYTICS
    // ════════════════════════════════════════════════════════

    // ── /stats/platform ──────────────────────────────────────
    if (path === '/stats/platform') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()

      // Parallel fetches for performance
      const [
        { data: schools,  error: se },
        { data: students, error: ste },
        { data: marks,    error: me },
        { data: users,    error: ue },
        { data: regs,     error: re },
        { data: logs,     error: le },
      ] = await Promise.all([
        db.from('schools').select('id, plan, is_active, plan_expires_at, created_at'),
        db.from('students').select('id, school_id, created_at').eq('is_active', true),
        db.from('marks').select('id, school_id'),
        db.from('users').select('id, school_id, role, is_active, last_login'),
        db.from('school_registrations').select('id, status, created_at'),
        db.from('entry_logs')
          .select('id, school_id, action_type, created_at')
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1000),
      ])

      // Non-fatal: log errors but don't 500 — return what we have
      if (se)  console.error('[stats/platform] schools error:', se.message)
      if (ste) console.error('[stats/platform] students error:', ste.message)
      if (me)  console.error('[stats/platform] marks error:', me.message)
      if (ue)  console.error('[stats/platform] users error:', ue.message)
      if (re)  console.error('[stats/platform] regs error:', re.message)
      if (le)  console.error('[stats/platform] logs error:', le.message)

      const schoolList  = schools  ?? []
      const studentList = students ?? []
      const marksList   = marks    ?? []
      const userList    = users    ?? []
      const regList     = regs     ?? []
      const logList     = logs     ?? []

      // Plan distribution
      const planDist: Record<string, number> = { free: 0, basic: 0, pro: 0, enterprise: 0 }
      for (const s of schoolList) {
        const p = (s.plan as string) ?? 'free'
        planDist[p] = (planDist[p] ?? 0) + 1
      }

      // Students per school
      const studentsPerSchool: Record<string, number> = {}
      for (const s of studentList) {
        const sid = s.school_id as string
        studentsPerSchool[sid] = (studentsPerSchool[sid] ?? 0) + 1
      }

      // Counts
      const now     = Date.now()
      const week    = 7 * 86_400_000
      const active  = schoolList.filter(s => s.is_active).length
      const expired = schoolList.filter(s => {
        const exp = s.plan_expires_at as string | null
        return exp && new Date(exp).getTime() < now
      }).length
      const expiring = schoolList.filter(s => {
        const exp = s.plan_expires_at as string | null
        if (!exp) return false
        const t = new Date(exp).getTime()
        return t > now && t < now + week
      }).length

      // Registrations by day — last 14 days
      const regsByDay: Array<{ date: string; count: number }> = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * 86_400_000)
        const dateStr = d.toISOString().slice(0, 10)
        regsByDay.push({
          date:  dateStr,
          count: regList.filter(r => (r.created_at as string).slice(0, 10) === dateStr).length,
        })
      }

      // Activity by type
      const activityByType: Record<string, number> = {}
      for (const l of logList) {
        const t = (l.action_type as string) ?? 'UNKNOWN'
        activityByType[t] = (activityByType[t] ?? 0) + 1
      }

      // Activity by school
      const actBySchool: Record<string, number> = {}
      for (const l of logList) {
        const sid = l.school_id as string | null
        if (sid) actBySchool[sid] = (actBySchool[sid] ?? 0) + 1
      }

      const topSchools = Object.entries(actBySchool)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => {
          const s = schoolList.find(sc => sc.id === id)
          return {
            id,
            school_id:      id,
            plan:           (s?.plan as string) ?? 'free',
            activity_count: count,
            student_count:  studentsPerSchool[id] ?? 0,
          }
        })

      return respond({
        ok: true,
        totals: {
          schools:          schoolList.length,
          students:         studentList.length,
          marks:            marksList.length,
          users:            userList.length,
          registrations:    regList.length,
          active_schools:   active,
          expired_schools:  expired,
          expiring_schools: expiring,
          pending_regs:     regList.filter(r => r.status === 'pending').length,
          admins:           userList.filter(u => u.role === 'admin').length,
          teachers:         userList.filter(u => u.role === 'teacher').length,
        },
        plan_distribution:   planDist,
        students_per_school: studentsPerSchool,
        regs_by_day:         regsByDay,
        activity_by_type:    activityByType,
        top_schools:         topSchools,
      }, 200)
    }

    // ════════════════════════════════════════════════════════
    // PHASE 1: PLATFORM CONFIG
    // ════════════════════════════════════════════════════════

    // ── /platform/config/list ────────────────────────────────
    if (path === '/platform/config/list') {
      const { data, error } = await db
        .from('platform_config')
        .select('key, value, description, updated_by, updated_at')
        .order('key')
      if (error) return respond({ error: error.message }, 500)
      return respond({ ok: true, config: data ?? [] }, 200)
    }

    // ── /platform/config/update ──────────────────────────────
    if (path === '/platform/config/update') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const key   = (body!.key   as string | undefined)?.trim()
      const value =  body!.value

      if (!key)              return respond({ error: 'key required' }, 400)
      if (value === undefined) return respond({ error: 'value required' }, 400)
      if (key.startsWith('__'))
        return respond({ error: 'Cannot modify protected keys' }, 403)

      const { error } = await db.from('platform_config').upsert({
        key,
        value,
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

      if (error) return respond({ error: error.message }, 500)
      return respond({ ok: true }, 200)
    }

    // ════════════════════════════════════════════════════════
    // PHASE 1: CROSS-SCHOOL USER MANAGEMENT
    // ════════════════════════════════════════════════════════

    // ── /users/list ──────────────────────────────────────────
    if (path === '/users/list') {
      const [rawBody] = await safeJson(req)
      const body = rawBody ?? {}

      const page      = Math.max(1, (body.page     as number | undefined) ?? 1)
      const per_page  = Math.min(100, (body.per_page as number | undefined) ?? 50)
      const from      = (page - 1) * per_page
      const to        = from + per_page - 1
      const schoolFlt = (body.school_id as string | undefined)?.trim()
      const roleFlt   = (body.role      as string | undefined)?.trim()

      let query = db
        .from('users')
        .select('user_id, name, role, school_id, is_active, last_login, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (schoolFlt) query = query.eq('school_id', schoolFlt)
      if (roleFlt)   query = query.eq('role', roleFlt)

      const { data: userRows, error, count } = await query
      if (error) return respond({ error: error.message }, 500)

      // Attach school names in one batch
      const sids = [...new Set((userRows ?? []).map(u => u.school_id as string).filter(Boolean))]
      let schoolMap: Record<string, string> = {}
      if (sids.length > 0) {
        const { data: schoolRows } = await db
          .from('schools')
          .select('id, school_name')
          .in('id', sids)
        for (const s of schoolRows ?? []) {
          schoolMap[(s as { id: string; school_name: string }).id] =
            (s as { id: string; school_name: string }).school_name
        }
      }

      const enriched = (userRows ?? []).map(u => ({
        ...u,
        school_name: schoolMap[u.school_id as string] ?? '—',
      }))

      return respond({ ok: true, users: enriched, total: count ?? 0, page, per_page }, 200)
    }

    // ── /users/toggle-active ─────────────────────────────────
    if (path === '/users/toggle-active') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const user_id   = (body!.user_id   as string  | undefined)?.trim()
      const is_active =  body!.is_active as boolean | undefined

      if (!user_id || typeof is_active !== 'boolean')
        return respond({ error: 'user_id (string) and is_active (boolean) required' }, 400)

      const { error } = await db.from('users').update({ is_active }).eq('user_id', user_id)
      if (error) return respond({ error: error.message }, 500)

      // Best-effort audit log
      await db.from('entry_logs').insert({
        saved_by:    user_id,
        action_type: is_active ? 'USER_ENABLED' : 'USER_DISABLED',
        status:      'Saved',
        notes:       `${is_active ? 'Enabled' : 'Disabled'} by super admin ${adminId}`,
      }).catch((e: Error) => console.warn('[users/toggle] audit log failed:', e.message))

      return respond({ ok: true }, 200)
    }

    // ── /users/reset-password ────────────────────────────────
    // Super admin resets a school user's password.
    // Used for admin lockout recovery from the School drawer.
    if (path === '/users/reset-password') {
      const [body, parseErr] = await safeJson(req)
      if (parseErr) return respond({ error: parseErr }, 400)

      const user_id      = (body!.user_id      as string | undefined)?.trim()
      const new_password = (body!.new_password as string | undefined)?.trim()

      if (!user_id)      return respond({ error: 'user_id required' }, 400)
      if (!new_password) return respond({ error: 'new_password required' }, 400)
      if (new_password.length < 8)
        return respond({ error: 'Password must be at least 8 characters' }, 400)

      // Verify user exists
      const { data: target, error: findErr } = await db
        .from('users')
        .select('user_id, name, school_id')
        .eq('user_id', user_id)
        .maybeSingle()

      if (findErr) return respond({ error: findErr.message }, 500)
      if (!target) return respond({ error: `User "${user_id}" not found` }, 404)

      // Hash and save
      const hashed = await hashPassword(new_password)
      const { error: updateErr } = await db
        .from('users')
        .update({ password: hashed })
        .eq('user_id', user_id)

      if (updateErr) return respond({ error: updateErr.message }, 500)

      // Best-effort audit log
      await db.from('entry_logs').insert({
        saved_by:    user_id,
        school_id:   (target as { school_id: string }).school_id,
        action_type: 'PASSWORD_CHANGE',
        status:      'Saved',
        notes:       `Password reset by super admin ${adminId}`,
      }).catch((e: Error) => console.warn('[users/reset-password] audit log failed:', e.message))

      return respond({ ok: true, user_id }, 200)
    }

    // ════════════════════════════════════════════════════════
    // FALLTHROUGH — unknown route
    // ════════════════════════════════════════════════════════
    return respond({
      error:  `Unknown route: ${path}`,
      hint:   'Check the path and ensure the function is up to date.',
      routes: [
        '/portal/rate-check',
        '/auth/login',
        '/registrations/approve',
        '/registrations/reject',
        '/schools/toggle-active',
        '/schools/set-plan',
        '/schools/set-features',
        '/schools/set-notes',
        '/schools/set-package',
        '/stats/platform',
        '/platform/config/list',
        '/platform/config/update',
        '/users/list',
        '/users/toggle-active',
        '/users/reset-password',
      ],
    }, 404)

  // ── Top-level catch — prevents 503 from unhandled exceptions ──
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[rms-api] Unhandled exception:', message)
    return respond({
      error:   'Internal server error',
      detail:  message,
    }, 500)
  }
})