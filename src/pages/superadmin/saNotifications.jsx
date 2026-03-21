// src/pages/superadmin/saNotifications.jsx
// Email alert settings modal. Self-contained — reads/writes
// notification_settings and admin_alert_log directly via Supabase.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { SUPABASE_URL, ANON_KEY } from './saConstants'
import { useToast, Tooltip } from './saComponents'
import {
  Bell, BellRing, BellOff, X, Save, Send, Loader2,
  MailOpen, Info, AlertCircle, CheckCircle2, XCircle,
  History, Trash2, MailCheck, MailX, Settings,
} from 'lucide-react'

export function NotificationSettingsModal({ onClose }) {
  const { toast }         = useToast()
  const [email,           setEmail]         = useState('')
  const [enabled,         setEnabled]       = useState(true)
  const [loading,         setLoading]       = useState(true)
  const [saving,          setSaving]        = useState(false)
  const [testing,         setTesting]       = useState(false)
  const [logs,            setLogs]          = useState([])
  const [activeLogTab,    setActiveLogTab]  = useState('settings')

  useEffect(() => {
    ;(async () => {
      try {
        const [{ data: cfg }, { data: logData }] = await Promise.all([
          supabase.from('notification_settings').select('*').eq('id', 1).single(),
          supabase.from('admin_alert_log').select('*').order('created_at', { ascending: false }).limit(20),
        ])
        if (cfg) { setEmail(cfg.admin_email || ''); setEnabled(cfg.notify_new_registration !== false) }
        setLogs(logData || [])
      } catch (e) {
        console.error('Failed to load notification settings:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('Please enter a valid email address', 'warning'); return
    }
    setSaving(true)
    const { error } = await supabase.from('notification_settings').upsert({
      id: 1, admin_email: email || null, notify_new_registration: enabled, updated_at: new Date().toISOString(),
    })
    setSaving(false)
    error ? toast(error.message, 'error') : toast('Notification settings saved!', 'success')
  }

  const testAlert = async () => {
    if (!email) { toast('Save an email address first', 'warning'); return }
    setTesting(true)
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/notify-new-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ record: {
          school_name: '🧪 Test School (Ignore This)', school_code: 'TEST001',
          contact_email: 'test@example.com', contact_phone: '+91 98765 43210',
          admin_name: 'Test Admin', address: 'Test Address', academic_session: '2025-26',
          created_at: new Date().toISOString(),
        }}),
      })
      const data = await res.json()
      if      (data.success) { toast('Test email sent! Check your inbox 📬', 'success'); const { data: nl } = await supabase.from('admin_alert_log').select('*').order('created_at', { ascending: false }).limit(20); if (nl) setLogs(nl) }
      else if (data.skipped) { toast('Notifications are disabled. Enable them first.', 'warning') }
      else                   { toast(data.error || 'Test failed', 'error') }
    } catch (e) { toast(e.message, 'error') }
    setTesting(false)
  }

  const clearLogs = async () => {
    const { error } = await supabase.from('admin_alert_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (!error) { setLogs([]); toast('Alert logs cleared', 'info') } else { toast(error.message, 'error') }
  }

  const sentCount   = logs.filter(l => l.status === 'sent').length
  const failedCount = logs.filter(l => l.status === 'failed').length

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md mx-4 overflow-hidden animate-[scaleIn_0.2s_ease-out] max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">Email Alerts</h2>
                <p className="text-[11px] text-gray-400">Get notified on new registrations</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0 px-2">
          {[
            { key: 'settings', label: 'Settings',      icon: Settings },
            { key: 'logs',     label: 'Alert History', icon: History, count: logs.length },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveLogTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${activeLogTab === t.key
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : activeLogTab === 'settings' ? (
            <div className="p-6 space-y-5">
              {/* Status indicator */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ring-1 ${
                enabled && email ? 'bg-emerald-50 dark:bg-emerald-900/10 ring-emerald-200 dark:ring-emerald-800/40' :
                !enabled         ? 'bg-gray-50 dark:bg-gray-800/50 ring-gray-200 dark:ring-gray-700' :
                'bg-amber-50 dark:bg-amber-900/10 ring-amber-200 dark:ring-amber-800/40'
              }`}>
                {enabled && email ? (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                    <div className="flex-1"><p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Alerts Active</p><p className="text-[11px] text-emerald-500/70">Sending to {email}</p></div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </>
                ) : !enabled ? (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><BellOff className="w-4 h-4 text-gray-400" /></div>
                    <div className="flex-1"><p className="text-sm font-bold text-gray-500">Alerts Disabled</p><p className="text-[11px] text-gray-400">No emails will be sent</p></div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-amber-500" /></div>
                    <div className="flex-1"><p className="text-sm font-bold text-amber-700 dark:text-amber-400">No Email Set</p><p className="text-[11px] text-amber-500/70">Add your email to receive alerts</p></div>
                  </>
                )}
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${enabled ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Bell className={`w-4 h-4 transition-colors ${enabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">New Registration Alerts</p>
                    <p className="text-[11px] text-gray-400">Email when a school registers</p>
                  </div>
                </div>
                <button onClick={() => setEnabled(e => !e)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${enabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Email input */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">Your Email Address</label>
                <div className="relative">
                  <MailOpen className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="youremail@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 pl-1">You'll receive an email every time a new school registers.</p>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 ring-1 ring-indigo-100 dark:ring-indigo-900/30">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 leading-relaxed">
                  <p className="font-bold mb-1">How it works:</p>
                  <ul className="space-y-0.5 list-disc list-inside text-indigo-500/80 dark:text-indigo-400/80">
                    <li>A school fills out the registration form</li>
                    <li>Database trigger detects the new row</li>
                    <li>Edge Function sends you a styled email alert</li>
                    <li>You log in and approve/reject from here</li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={save} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Settings
                </button>
                <Tooltip text="Send a test email to verify it works">
                  <button onClick={testAlert} disabled={testing || !email}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50">
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Test
                  </button>
                </Tooltip>
              </div>
            </div>
          ) : (
            /* Logs tab */
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40">
                  <MailCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{sentCount} sent</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40">
                    <MailX className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{failedCount} failed</span>
                  </div>
                )}
                <div className="flex-1" />
                {logs.length > 0 && (
                  <button onClick={clearLogs} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <Trash2 className="w-3 h-3" />Clear
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <History className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">No alerts sent yet</p>
                  <p className="text-xs text-gray-400 mt-1">Notifications will appear here once triggered</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${log.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {log.status === 'sent' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{log.school_name || 'Unknown'}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${log.status === 'sent' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                            {log.status === 'sent' ? 'DELIVERED' : 'FAILED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">To: {log.recipient_email || '—'}</p>
                        {log.error_message && <p className="text-[11px] text-red-500 mt-0.5 truncate">Error: {log.error_message}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
