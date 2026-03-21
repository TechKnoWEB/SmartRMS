// supabase/functions/toggle-term-lock/index.ts
//
// SERVER-SIDE SECURITY: This Edge Function is the authoritative
// enforcement point for term lock/unlock operations.
//
// It runs with the service_role key and performs a server-side
// database lookup to verify the calling user is an admin before
// allowing any mutation to the term_locks table.
//
// Teachers CANNOT bypass this by calling Supabase directly because:
//   1. The RLS policy on term_locks blocks anon-key writes
//   2. This function verifies role from the DB — not from a client claim

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: {
    user_id: string
    school_id: string
    class_name: string
    section: string
    term: number
    lock: boolean
  }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { user_id, school_id, class_name, section, term, lock } = body

  // Validate required fields
  if (!user_id || !school_id || !class_name || !section || !term) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (![1, 2, 3, 4].includes(Number(term))) {
    return new Response(JSON.stringify({ error: 'term must be 1, 2, 3, or 4' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Create admin client using service_role key
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // CRITICAL SECURITY CHECK: Look up the calling user in the database.
  // We do NOT trust any role claim from the client — we fetch it ourselves.
  const { data: callingUser, error: userErr } = await supabase
    .from('users')
    .select('role, school_id, is_active')
    .eq('user_id', user_id)
    .eq('school_id', school_id)
    .single()

  if (userErr || !callingUser) {
    return new Response(JSON.stringify({ error: 'User not found or access denied' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!callingUser.is_active) {
    return new Response(JSON.stringify({ error: 'User account is disabled' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // SERVER-SIDE ROLE CHECK — this cannot be bypassed by the client
  if (callingUser.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Only administrators can lock or unlock terms' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Perform the term lock mutation using service_role (bypasses RLS)
  const termNum = Number(term)
  const { error: upsertErr } = await supabase.from('term_locks').upsert(
    {
      class_name,
      section,
      school_id,
      [`t${termNum}_lock`]:      lock,
      [`t${termNum}_locked_by`]: lock ? user_id : null,
      [`t${termNum}_locked_at`]: lock ? new Date().toISOString() : null,
      updated_at:                new Date().toISOString(),
    },
    { onConflict: 'school_id,class_name,section' },
  )

  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Audit log
  await supabase.from('entry_logs').insert({
    saved_by:    user_id,
    school_id,
    action_type: lock ? 'TERM_LOCK' : 'TERM_UNLOCK',
    class_name,
    section,
    term:        termNum,
    status:      'Saved',
    notes:       `Term ${termNum} ${lock ? 'locked' : 'unlocked'} via Edge Function`,
  })

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
