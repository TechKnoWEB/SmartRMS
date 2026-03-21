import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders })

  try {
    const payload = await req.json()
    const record = payload.record || payload

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const FALLBACK_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL")

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured")

    const sb = createClient(SUPABASE_URL, SERVICE_KEY)

    const { data: cfg } = await sb
      .from("notification_settings")
      .select("admin_email, notify_new_registration")
      .eq("id", 1)
      .single()

    const adminEmail = cfg?.admin_email || FALLBACK_EMAIL

    if (cfg?.notify_new_registration === false) {
      return json({ skipped: true, reason: "Notifications disabled" })
    }
    if (!adminEmail) throw new Error("No admin email configured")

    const schoolName = record.school_name || "Unknown School"

    const rows = [
      ["DISE / School Code", record.school_code || "—"],
      ["Admin Name", record.admin_name || "—"],
      ["Email", record.contact_email || "—"],
      ["Phone", record.contact_phone || "—"],
      ["Address", record.address || "—"],
      ["Academic Session", record.academic_session || "—"],
      [
        "Registered At",
        record.created_at
          ? new Date(record.created_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : new Date().toLocaleString("en-IN"),
      ],
    ]

    const tableRows = rows
      .map(
        ([l, v]) => `
      <tr>
        <td style="padding:10px 0;color:#6b7280;font-size:13px;font-weight:600;
                    width:140px;vertical-align:top;border-bottom:1px solid #f3f4f6">${l}</td>
        <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:500;
                    border-bottom:1px solid #f3f4f6">${v}</td>
      </tr>`
      )
      .join("")

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;
            box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center">
    <div style="width:56px;height:56px;background:rgba(255,255,255,.15);border-radius:16px;
                display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
      <span style="font-size:28px">🏫</span>
    </div>
    <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0">New Registration Alert</h1>
    <p style="color:rgba(255,255,255,.7);font-size:14px;margin:8px 0 0">
      A new school wants to join RMS
    </p>
  </div>

  <div style="padding:28px 24px">
    <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 20px">${schoolName}</h2>
    <table style="width:100%;border-collapse:collapse">${tableRows}</table>

    <div style="margin:24px 0 0;padding:16px 20px;background:#fef3c7;border-radius:12px;
                border-left:4px solid #f59e0b">
      <p style="margin:0;color:#92400e;font-size:14px;font-weight:700">⏳ Action Required</p>
      <p style="margin:6px 0 0;color:#92400e;font-size:13px">
        This registration is <b>pending your approval</b>. Log in to the Super Admin Dashboard to review.
      </p>
    </div>
  </div>

  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:11px">RMS Super Admin Alert · Automated notification</p>
  </div>
</div>
</body></html>`

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RMS Alerts <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `🏫 New Registration: ${schoolName}`,
        html,
      }),
    })

    const emailData = await emailRes.json()

    // ✅ Fixed: use try-catch instead of .catch()
    try {
      await sb.from("admin_alert_log").insert({
        type: "new_registration",
        recipient_email: adminEmail,
        subject: `New Registration: ${schoolName}`,
        school_name: schoolName,
        registration_id: record.id || null,
        status: emailRes.ok ? "sent" : "failed",
        error_message: emailRes.ok ? null : JSON.stringify(emailData),
      })
    } catch (_) {
      // Silently ignore log write failures
    }

    if (!emailRes.ok) throw new Error(`Resend error: ${JSON.stringify(emailData)}`)

    return json({ success: true, emailId: emailData.id })
  } catch (err) {
    console.error("Notification error:", err)
    return json({ error: err.message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}