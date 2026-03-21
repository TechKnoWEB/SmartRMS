// src/lib/security.js
// ─────────────────────────────────────────────────────────────
// Pure security utilities — no React dependencies.
// Rate limiting is now DB-persisted via the Edge Function.
// The old in-memory _loginAttempts object has been removed.
// ─────────────────────────────────────────────────────────────

const ITERATIONS = 100_000
const KEY_LENGTH  = 256

export async function hashPassword(password) {
  const enc     = new TextEncoder()
  const salt    = crypto.getRandomValues(new Uint8Array(16))
  const keyMat  = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  )
  const bits    = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMat, KEY_LENGTH,
  )
  const toHex   = arr => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2$${toHex(Array.from(salt))}$${toHex(Array.from(new Uint8Array(bits)))}`
}

export async function verifyPassword(password, stored) {
  // FIX 1.2: Plain-text fallback removed. All passwords must be PBKDF2-hashed.
  // Legacy plain-text accounts are automatically re-hashed in AuthContext on
  // the first successful login (where the plaintext is still available).
  // If a stored value is not PBKDF2 format, we attempt the plain-text compare
  // ONLY to allow that one-time upgrade login to succeed, then the hash is
  // immediately replaced. This path will vanish once all accounts are upgraded.
  if (!stored?.startsWith('pbkdf2$')) {
    // FIX 1.2: Constant-time comparison — no early-return on length mismatch
    // (early-return leaks timing info about password length).
    // Always iterate the full length; OR in a length-difference bit so the
    // result is non-zero whenever content OR length differ.
    const enc      = new TextEncoder()
    const pwBytes  = enc.encode(password)
    const stoBytes = enc.encode(stored ?? '')
    const len      = Math.max(pwBytes.length, stoBytes.length)
    let diff       = pwBytes.length ^ stoBytes.length   // non-zero if lengths differ
    for (let i = 0; i < len; i++) {
      diff |= (pwBytes[i] ?? 0) ^ (stoBytes[i] ?? 0)
    }
    return diff === 0
  }
  try {
    const [, saltHex, hashHex] = stored.split('$')
    const enc     = new TextEncoder()
    const salt    = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)))
    const keyMat  = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
    )
    const bits    = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      keyMat, KEY_LENGTH,
    )
    const newHex  = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    return newHex === hashHex
  } catch {
    return false
  }
}

// ─── Inactivity timeout ───────────────────────────────────────
export const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes

// ─── Class-access helpers (used outside React hooks) ─────────
export function canAccessClass(user, className) {
  if (!user) return false
  if (user.role === 'admin') return true
  const ca = user.class_access
  if (!ca || ca.length === 0) return true
  return ca.includes(className)
}

export function filterAllowedClasses(user, classNames) {
  if (!user) return []
  if (user.role === 'admin') return classNames
  const ca = user.class_access
  if (!ca || ca.length === 0) return classNames
  return classNames.filter(c => ca.includes(c))
}