// src/pages/superadmin/saDashboardOverview.jsx
import { useMemo, useState } from 'react'
import {
  SubscriptionHealth,
  SystemHealth,
  ActivityTimeline,
} from './saComponents'
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Activity,
  Bell,
  School,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Shield,
  CalendarDays,
  X,
} from 'lucide-react'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REUSABLE PRIMITIVES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** Consistent section wrapper — the building block of every panel. */
function Panel({ children, className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200/60
                  bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </div>
  )
}

/** Standardized section header with icon · title · subtitle · action slot. */
function PanelHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div
      className="flex items-center justify-between border-b border-gray-100
                  px-5 py-4 dark:border-gray-800"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center
                        rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </div>
        )}
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {children /* right-side action slot */}
    </div>
  )
}

/* ─── Metric Card ─── */

const COLOR_MAP = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    num: 'text-indigo-700 dark:text-indigo-300',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    num: 'text-amber-700 dark:text-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    num: 'text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    text: 'text-violet-600 dark:text-violet-400',
    num: 'text-violet-700 dark:text-violet-300',
  },
}

function MetricCard({ label, value, icon: Icon, color = 'indigo', subtitle, onClick, pulse }) {
  const c = COLOR_MAP[color]
  return (
    <button
      onClick={onClick}
      aria-label={`${label}: ${value}${subtitle ? `. ${subtitle}` : ''}`}
      className="group relative flex flex-col rounded-2xl border border-gray-200/60
                 bg-white p-5 text-left transition-all duration-200
                 hover:border-gray-300 hover:shadow-md
                 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      {/* Icon row */}
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}>
          <Icon className={`h-[18px] w-[18px] ${c.text}`} strokeWidth={2} />
        </div>
        {pulse && value > 0 && (
          <span className="relative flex h-2.5 w-2.5" aria-label="Needs attention">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
        )}
      </div>

      {/* Value row */}
      <div className="mt-4">
        <p className={`text-2xl font-bold tracking-tight ${c.num}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {subtitle && (
          <p className="mt-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {subtitle}
          </p>
        )}
      </div>

      {/* Hover affordance */}
      <ChevronRight
        className="absolute right-4 bottom-5 h-4 w-4 text-gray-300 opacity-0
                    transition-all duration-200 group-hover:translate-x-0.5
                    group-hover:opacity-100 dark:text-gray-600"
      />
    </button>
  )
}

/* ─── 14-Day Trend Bar Chart ─── */

function TrendBarChart({ data = [], labels = [] }) {
  const max = Math.max(...data, 1)
  const total = data.reduce((a, b) => a + b, 0)
  const [hovered, setHovered] = useState(null)

  return (
    <div>
      {/* Summary header with hover state */}
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {total}
          </span>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            registrations
          </span>
        </div>
        {hovered !== null ? (
          <div className="text-right transition-opacity duration-150">
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {data[hovered]}
            </span>
            <span className="ml-1.5 text-xs text-gray-400">{labels[hovered]}</span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-400">Hover to explore</span>
        )}
      </div>

      {/* Bar chart */}
      <div
        className="flex items-end gap-1 sm:gap-1.5"
        style={{ height: 112 }}
        role="img"
        aria-label={`Registration trend: ${total} over 14 days`}
      >
        {data.map((v, i) => {
          const isHovered = hovered === i
          const isRecent = i >= data.length - 3
          return (
            <div
              key={i}
              className="relative flex-1 cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={`w-full rounded-md transition-all duration-200
                  ${isHovered
                    ? 'bg-indigo-500 dark:bg-indigo-400'
                    : isRecent
                      ? 'bg-indigo-400/70 dark:bg-indigo-500/70'
                      : 'bg-indigo-100 dark:bg-indigo-900/40'}`}
                style={{ height: `${Math.max((v / max) * 100, 3)}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between text-[10px] font-medium text-gray-400">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  )
}

/* ─── Horizontal Distribution Bar ─── */

function DistributionBar({ title, segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</p>

      {/* Stacked bar */}
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {segments
          .filter((s) => s.value > 0)
          .map((seg, i) => (
            <div
              key={i}
              className={`transition-all duration-500 ${seg.color}`}
              style={{ width: `${(seg.value / total) * 100}%` }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg, i) => (
          <button
            key={i}
            onClick={seg.onClick}
            className="group flex items-center gap-1.5 text-xs text-gray-500
                       transition-colors hover:text-gray-700
                       dark:text-gray-400 dark:hover:text-gray-300"
          >
            <span className={`inline-block h-2 w-2 rounded-full ${seg.dot}`} />
            <span>{seg.label}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-200">
              {seg.value}
            </span>
            <span className="text-gray-400">
              ({((seg.value / total) * 100).toFixed(0)}%)
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Alert Item ─── */

const SEVERITY_STYLES = {
  critical: {
    wrapper: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40',
    icon: 'text-red-500',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40',
    icon: 'text-amber-500',
  },
  info: {
    wrapper: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40',
    icon: 'text-indigo-500',
  },
}

function AlertItem({ icon: Icon, severity = 'warning', title, description, onClick }) {
  const s = SEVERITY_STYLES[severity]
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3.5 rounded-xl border px-4 py-3
                  text-left transition-all duration-200 hover:shadow-sm ${s.wrapper}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                    bg-white/80 shadow-sm dark:bg-gray-800 ${s.icon}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </p>
        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-gray-300 transition-transform duration-200
                    group-hover:translate-x-0.5 dark:text-gray-600"
      />
    </button>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN DASHBOARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function DashboardOverview({ regs, schools, onNavigate }) {
  const [alertDismissed, setAlertDismissed] = useState(false)

  /* ── derived counts ── */
  const counts = useMemo(
    () => ({
      pending: regs.filter((r) => r.status === 'pending').length,
      approved: regs.filter((r) => r.status === 'approved').length,
      rejected: regs.filter((r) => r.status === 'rejected').length,
      total: regs.length,
      active: schools.filter((s) => s.is_active).length,
      inactive: schools.filter((s) => !s.is_active).length,
      totalSchools: schools.length,
      expiring: schools.filter(
        (s) =>
          s.plan_expires_at &&
          new Date(s.plan_expires_at) < new Date(Date.now() + 7 * 86400000) &&
          new Date(s.plan_expires_at) > new Date()
      ).length,
      expired: schools.filter(
        (s) => s.plan_expires_at && new Date(s.plan_expires_at) < new Date()
      ).length,
    }),
    [regs, schools]
  )

  /* ── 14-day trend data ── */
  const { trendData, trendLabels } = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return d.toISOString().slice(0, 10)
    })
    return {
      trendData: days.map(
        (day) => regs.filter((r) => r.created_at?.slice(0, 10) === day).length
      ),
      trendLabels: days.map((d) =>
        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
    }
  }, [regs])

  const todayRegs = useMemo(
    () =>
      regs.filter(
        (r) =>
          r.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)
      ).length,
    [regs]
  )

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const alertCount =
    (counts.expired > 0 ? 1 : 0) +
    (counts.expiring > 0 ? 1 : 0) +
    (counts.pending > 0 ? 1 : 0)
  const hasAlerts = alertCount > 0

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════
          SECTION 1 — PAGE HEADER
          Compact greeting · role badge · date · CTAs
          ═══════════════════════════════════════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50
                          px-2.5 py-1 text-[11px] font-semibold text-indigo-600
                          dark:bg-indigo-900/30 dark:text-indigo-400"
            >
              <Shield className="h-3 w-3" />
              Super Admin
            </span>
            <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <CalendarDays className="h-3 w-3" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {greeting} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here's what's happening across your platform today.
          </p>
        </div>

        <div className="flex shrink-0 gap-2.5">
          {counts.pending > 0 && (
            <button
              onClick={() => onNavigate('pending')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4
                         py-2.5 text-sm font-semibold text-white shadow-sm
                         transition-all duration-200 hover:bg-indigo-700 hover:shadow-md
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Clock className="h-4 w-4" />
              Review Pending
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs">
                {counts.pending}
              </span>
            </button>
          )}
          <button
            onClick={() => onNavigate('schools')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300
                       bg-white px-4 py-2.5 text-sm font-semibold text-gray-700
                       shadow-sm transition-all duration-200 hover:bg-gray-50
                       hover:shadow-md dark:border-gray-700 dark:bg-gray-800
                       dark:text-gray-300 dark:hover:bg-gray-800/80
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Building2 className="h-4 w-4" />
            View Schools
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          SECTION 2 — ALERT STRIP
          Dismissable banner for urgent items.
          Ensures alerts are seen before scrolling.
          ═══════════════════════════════════════════ */}
      {hasAlerts && !alertDismissed && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-amber-200
                      bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                        bg-amber-100 dark:bg-amber-900/30"
          >
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {alertCount} item{alertCount !== 1 && 's'} need
              {alertCount === 1 && 's'} your attention
            </p>
            <p className="truncate text-xs text-amber-600/80 dark:text-amber-400/70">
              {[
                counts.expired > 0 &&
                  `${counts.expired} expired plan${counts.expired !== 1 ? 's' : ''}`,
                counts.expiring > 0 && `${counts.expiring} expiring soon`,
                counts.pending > 0 && `${counts.pending} pending review`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            onClick={() => setAlertDismissed(true)}
            className="shrink-0 rounded-lg p-1.5 text-amber-500 transition-colors
                       hover:bg-amber-100 dark:hover:bg-amber-900/30"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 3 — KPI METRIC CARDS
          4 primary cards — focused, scannable.
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Registrations"
          value={counts.total}
          icon={FileText}
          color="indigo"
          subtitle={todayRegs > 0 ? `+${todayRegs} today` : undefined}
          onClick={() => onNavigate('all')}
        />
        <MetricCard
          label="Pending Review"
          value={counts.pending}
          icon={Clock}
          color="amber"
          pulse={counts.pending > 0}
          onClick={() => onNavigate('pending')}
        />
        <MetricCard
          label="Total Schools"
          value={counts.totalSchools}
          icon={School}
          color="violet"
          onClick={() => onNavigate('schools')}
        />
        <MetricCard
          label="Active Schools"
          value={counts.active}
          icon={Building2}
          color="emerald"
          subtitle={
            counts.expiring > 0
              ? `${counts.expiring} expiring soon`
              : undefined
          }
          onClick={() => onNavigate('schools')}
        />
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 4 — TREND CHART + STATUS BREAKDOWN
          Left 2/3: interactive bar chart
          Right 1/3: distribution bars
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            icon={TrendingUp}
            title="Registration Trend"
            subtitle="New registrations over the last 14 days"
          />
          <div className="p-5">
            <TrendBarChart data={trendData} labels={trendLabels} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            icon={Activity}
            title="Status Breakdown"
            subtitle="Registration &amp; school distribution"
          />
          <div className="space-y-6 p-5">
            <DistributionBar
              title="Registrations"
              segments={[
                {
                  label: 'Approved',
                  value: counts.approved,
                  color: 'bg-emerald-500',
                  dot: 'bg-emerald-500',
                  onClick: () => onNavigate('approved'),
                },
                {
                  label: 'Pending',
                  value: counts.pending,
                  color: 'bg-amber-400',
                  dot: 'bg-amber-400',
                  onClick: () => onNavigate('pending'),
                },
                {
                  label: 'Rejected',
                  value: counts.rejected,
                  color: 'bg-red-500',
                  dot: 'bg-red-500',
                  onClick: () => onNavigate('rejected'),
                },
              ]}
            />
            <DistributionBar
              title="Schools"
              segments={[
                {
                  label: 'Active',
                  value: counts.active,
                  color: 'bg-emerald-500',
                  dot: 'bg-emerald-500',
                  onClick: () => onNavigate('schools'),
                },
                {
                  label: 'Inactive',
                  value: counts.inactive,
                  color: 'bg-gray-400',
                  dot: 'bg-gray-400',
                  onClick: () => onNavigate('inactive'),
                },
              ]}
            />
          </div>
        </Panel>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 5 — ACTIVITY + HEALTH
          Left 2/3: scrollable activity timeline
          Right 1/3: existing health components
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            icon={Activity}
            title="Recent Activity"
            subtitle="Latest registration events"
          >
            <button
              onClick={() => onNavigate('all')}
              className="text-xs font-medium text-indigo-600 transition-colors
                         hover:text-indigo-700 dark:text-indigo-400
                         dark:hover:text-indigo-300"
            >
              View all →
            </button>
          </PanelHeader>
          <div className="max-h-[400px] overflow-y-auto px-4 py-3">
            <ActivityTimeline regs={regs} />
          </div>
        </Panel>

        <div className="space-y-6">
          <SubscriptionHealth schools={schools} />
          <SystemHealth />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 6 — ATTENTION REQUIRED (detailed)
          Expanded rows with severity + description.
          Only renders when there are actionable items.
          ═══════════════════════════════════════════ */}
      {hasAlerts && (
        <Panel>
          <PanelHeader icon={Bell} title="Attention Required" subtitle="Items needing immediate action">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full
                          bg-red-500 text-[10px] font-bold text-white"
            >
              {alertCount}
            </span>
          </PanelHeader>
          <div className="space-y-2.5 p-4">
            {counts.expired > 0 && (
              <AlertItem
                icon={AlertTriangle}
                severity="critical"
                title={`${counts.expired} school${counts.expired !== 1 ? 's' : ''} with expired plans`}
                description="Action needed — renew or deactivate"
                onClick={() => onNavigate('schools')}
              />
            )}
            {counts.expiring > 0 && (
              <AlertItem
                icon={Clock}
                severity="warning"
                title={`${counts.expiring} plan${counts.expiring !== 1 ? 's' : ''} expiring within 7 days`}
                description="Send renewal reminders to schools"
                onClick={() => onNavigate('schools')}
              />
            )}
            {counts.pending > 0 && (
              <AlertItem
                icon={School}
                severity="info"
                title={`${counts.pending} pending registration${counts.pending !== 1 ? 's' : ''}`}
                description="Review and approve or reject"
                onClick={() => onNavigate('pending')}
              />
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}