// src/pages/superadmin/SidebarLayout.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LayoutDashboard, Clock, CheckCircle2, XCircle, FileText, Building2,
  Power, ChevronLeft, Menu, X, Search, Bell, LogOut, Shield,
  School, ChevronDown, Moon, Sun, BarChart2, Zap, Sliders,
  Users, RefreshCw,
} from 'lucide-react'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONFIGURATION
   Single source of truth for navigation structure.
   To add a new page: append an object to the relevant group.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Registrations',
    items: [
      { key: 'pending',  label: 'Pending',  icon: Clock,        badge: 'pending',  badgeColor: 'amber',   pulse: true },
      { key: 'approved', label: 'Approved', icon: CheckCircle2, badge: 'approved', badgeColor: 'emerald' },
      { key: 'rejected', label: 'Rejected', icon: XCircle,      badge: 'rejected', badgeColor: 'red' },
      { key: 'all',      label: 'All Regs', icon: FileText,     badge: 'total',    badgeColor: 'indigo' },
    ],
  },
  {
    label: 'Schools',
    items: [
      { key: 'schools',  label: 'All Schools', icon: Building2, badge: 'active',   badgeColor: 'teal' },
      { key: 'inactive', label: 'Inactive',    icon: Power,     badge: 'inactive', badgeColor: 'gray' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { key: 'analytics',  label: 'Analytics', icon: BarChart2 },
      { key: 'packages',   label: 'Packages',  icon: Zap },
      { key: 'platform',   label: 'Platform',  icon: Sliders },
      { key: 'users_mgmt', label: 'Users',     icon: Users },
    ],
  },
]

const BADGE_COLORS = {
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  red:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  indigo:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  teal:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  gray:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NAV ITEM
   Extracted so each item is independently renderable
   and doesn't re-render siblings when badge counts change.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function NavItem({ item, active, expanded, count, onClick }) {
  const hasBadge = count !== null && count !== undefined && count > 0
  const showPulse = item.pulse && hasBadge && !active

  return (
    <button
      onClick={onClick}
      title={!expanded ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`
        group relative flex w-full items-center rounded-lg px-3 py-2
        text-left                                           /* ← ADD THIS */
        text-[13px] font-medium transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-indigo-500 focus-visible:ring-offset-1
        ${expanded ? 'gap-3' : 'justify-center'}
        ${active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
        }
      `}
    >
      {/* Active indicator — left edge bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2
                     rounded-r-full bg-indigo-600 dark:bg-indigo-400"
        />
      )}

      {/* Icon with optional pulse dot (collapsed state) */}
      <span className="relative shrink-0">
        <item.icon
          className={`h-[18px] w-[18px] ${
            active
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
          }`}
          strokeWidth={active ? 2.2 : 1.8}
        />
        {/* Pulse dot on icon — visible only in collapsed state */}
        {showPulse && !expanded && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-amber-500" />
          </span>
        )}
      </span>

      {/* Label + badges — visible only in expanded state */}
      {expanded && (
        <>
          <span className="flex-1 truncate">{item.label}</span>

          {/* Pulse dot next to label */}
          {showPulse && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-amber-500" />
            </span>
          )}

          {/* Count badge */}
          {hasBadge && item.badgeColor && (
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px]
                          font-semibold tabular-nums ${BADGE_COLORS[item.badgeColor]}`}
            >
              {count}
            </span>
          )}
        </>
      )}

      {/* Mini count badge — visible only in collapsed state */}
      {!expanded && hasBadge && (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center
                     justify-center rounded-full bg-indigo-600 px-1 text-[9px]
                     font-bold tabular-nums text-white dark:bg-indigo-500"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SIDEBAR CONTENT
   Top-level component (not nested inside SidebarLayout).
   Receives `expanded` as a prop so it works identically
   for both mobile (always expanded) and desktop (togglable).
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SidebarContent({
  expanded,
  activeTab,
  onNavigate,
  counts,
  dark,
  onToggleDark,
  onNotifClick,
  notifConfigured,
  onSignOut,
  onRefresh,
  loading,
  adminId,
  // Controls
  isMobile,
  onCollapse,
  onCloseMobile,
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  // Close profile dropdown on click outside
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  // Close profile dropdown when sidebar collapses
  useEffect(() => {
    if (!expanded) setProfileOpen(false)
  }, [expanded])

  const getBadge = (key) => (key ? counts[key] ?? null : null)

  return (
    <div className="flex h-full flex-col">
      {/* ─── Brand Bar ─── */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                     bg-gradient-to-br from-indigo-600 to-violet-600"
        >
          <School className="h-[18px] w-[18px] text-white" />
        </div>

        {expanded && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
              SchoolAdmin
            </p>
            <p className="truncate text-[10px] font-medium text-gray-400">
              Super Admin Panel
            </p>
          </div>
        )}

        {/* Desktop: collapse toggle */}
        {!isMobile && onCollapse && (
          <button
            onClick={onCollapse}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`hidden shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors
                       hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800
                       dark:hover:text-gray-300 lg:flex
                       ${!expanded ? 'ml-0' : 'ml-auto'}`}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-200
                         ${!expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {/* Mobile: close button */}
        {isMobile && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="ml-auto shrink-0 rounded-lg p-1.5 text-gray-400
                       hover:bg-gray-100 hover:text-gray-600
                       dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ─── Search ─── */}
      {expanded && (
        <div className="px-3 pb-4">
          <div
            className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2
                       transition-colors focus-within:bg-gray-100
                       dark:bg-gray-800 dark:focus-within:bg-gray-750"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Search…"
              className="w-full bg-transparent text-xs text-gray-700 placeholder:text-gray-400
                         focus:outline-none dark:text-gray-300"
            />
            <kbd
              className="hidden shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px]
                         font-semibold text-gray-400 shadow-sm ring-1 ring-gray-200
                         dark:bg-gray-700 dark:ring-gray-600 sm:inline"
            >
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* ─── Navigation Groups ─── */}
      <nav
        className="flex-1 space-y-5 overflow-y-auto px-3 pb-4"
        aria-label="Main navigation"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} role="group" aria-label={group.label}>
            {/* Group label — visible in expanded state */}
            {expanded ? (
              <p
                className="mb-1.5 px-3 text-[10px] font-semibold uppercase
                           tracking-widest text-gray-400 dark:text-gray-500"
              >
                {group.label}
              </p>
            ) : (
              /* Subtle divider in collapsed state */
              <div className="mx-auto mb-1.5 h-px w-5 bg-gray-200 dark:bg-gray-700" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  active={activeTab === item.key}
                  expanded={expanded}
                  count={getBadge(item.badge)}
                  onClick={() => onNavigate(item.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Bottom Utilities ─── */}
      <div className="border-t border-gray-100 px-3 pt-2 pb-1 dark:border-gray-800">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          title={!expanded ? (dark ? 'Light mode' : 'Dark mode') : undefined}
          className={`flex w-full items-center text-leftrounded-lg px-3 py-2 text-[13px]
                     font-medium text-gray-600 transition-colors hover:bg-gray-100
                     hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800
                     dark:hover:text-gray-200 ${expanded ? 'gap-3' : 'justify-center'}`}
        >
          {dark
            ? <Sun className="h-[18px] w-[18px] text-gray-400" />
            : <Moon className="h-[18px] w-[18px] text-gray-400" />}
          {expanded && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Notifications */}
        <button
          onClick={onNotifClick}
          title={!expanded ? 'Notifications' : undefined}
          className={`relative flex w-full items-center rounded-lg px-3 py-2
                     text-[13px] font-medium text-gray-600 transition-colors
                     hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400
                     dark:hover:bg-gray-800 dark:hover:text-gray-200
                     ${expanded ? 'gap-3' : 'justify-center'}`}
        >
          <span className="relative">
            <Bell className="h-[18px] w-[18px] text-gray-400" />
            <span
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2
                         ring-white dark:ring-gray-900
                         ${notifConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}
            />
          </span>
          {expanded && <span>Notifications</span>}
        </button>
      </div>

      {/* ─── Profile Section ─── */}
      <div
        ref={profileRef}
        className="border-t border-gray-100 px-3 py-3 dark:border-gray-800"
      >
        <button
          onClick={() => expanded && setProfileOpen((p) => !p)}
          title={!expanded ? 'Super Admin' : undefined}
          aria-expanded={profileOpen}
          className={`flex w-full items-center rounded-lg px-2 py-2
                     transition-colors hover:bg-gray-100 dark:hover:bg-gray-800
                     ${expanded ? 'gap-3' : 'justify-center'}`}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center
                       rounded-lg bg-indigo-600 text-[11px] font-bold text-white"
          >
            SA
          </div>
          {expanded && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Super Admin
                </p>
                <p className="truncate text-[10px] text-gray-400">{adminId}</p>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform
                           duration-200 ${profileOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {/* Dropdown */}
        {profileOpen && expanded && (
          <div className="mt-1.5 space-y-0.5 rounded-lg bg-gray-50 p-1.5 dark:bg-gray-800">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs
                         font-medium text-gray-600 transition-colors hover:bg-gray-100
                         dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing…' : 'Refresh Data'}
            </button>
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs
                         font-medium text-red-600 transition-colors hover:bg-red-50
                         dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SIDEBAR LAYOUT — MAIN EXPORT
   Orchestrates mobile/desktop sidebars + top bar + content.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function SidebarLayout({
  activeTab,
  onNavigate,
  counts = {},
  dark,
  onToggleDark,
  onRefresh,
  onSignOut,
  onNotifClick,
  loading,
  adminId,
  lastRefresh,
  notifConfigured,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileSidebarRef = useRef(null)

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [activeTab])

  // Click outside mobile sidebar to close
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e) => {
      if (mobileSidebarRef.current && !mobileSidebarRef.current.contains(e.target)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobileOpen])

  // Escape key closes mobile sidebar
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobileOpen])

  // Shared props for SidebarContent
  const contentProps = {
    activeTab,
    onNavigate,
    counts,
    dark,
    onToggleDark,
    onNotifClick,
    notifConfigured,
    onSignOut,
    onRefresh,
    loading,
    adminId,
  }

  // Find current page title
  const currentLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeTab)?.label
    || 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* ═══════ MOBILE OVERLAY ═══════ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ═══════ MOBILE SIDEBAR ═══════ */}
      <aside
        ref={mobileSidebarRef}
        aria-label="Sidebar navigation"
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-gray-200
                   bg-white transition-transform duration-300 ease-in-out
                   dark:border-gray-800 dark:bg-gray-900 lg:hidden
                   ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent
          {...contentProps}
          expanded
          isMobile
          onCloseMobile={() => setMobileOpen(false)}
        />
      </aside>

      {/* ═══════ DESKTOP SIDEBAR ═══════ */}
      <aside
        aria-label="Sidebar navigation"
        className={`hidden lg:flex lg:flex-col border-r border-gray-200 bg-white
                   transition-[width] duration-200 ease-in-out
                   dark:border-gray-800 dark:bg-gray-900
                   ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        <SidebarContent
          {...contentProps}
          expanded={!collapsed}
          isMobile={false}
          onCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* ═══════ MAIN CONTENT AREA ═══════ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top Bar ── */}
        <header
          className="flex h-14 shrink-0 items-center justify-between border-b
                     border-gray-200 bg-white px-4 dark:border-gray-800
                     dark:bg-gray-900 md:px-6"
        >
          {/* Left side */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
              className="rounded-lg p-2 text-gray-500 transition-colors
                         hover:bg-gray-100 hover:text-gray-700
                         dark:hover:bg-gray-800 dark:hover:text-gray-300
                         lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title */}
            <div className="flex items-center gap-2">
              <Shield className="hidden h-4 w-4 text-indigo-500 lg:block" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {currentLabel}
              </h2>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Last refresh timestamp + connection dot */}
            {lastRefresh && (
              <div className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-gray-400">
                  {lastRefresh.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh data"
              className="rounded-lg p-2 text-gray-400 transition-colors
                         hover:bg-gray-100 hover:text-gray-600
                         dark:hover:bg-gray-800 dark:hover:text-gray-300
                         disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Mobile-only: notifications */}
            <button
              onClick={onNotifClick}
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-gray-400 transition-colors
                         hover:bg-gray-100 hover:text-gray-600
                         dark:hover:bg-gray-800 dark:hover:text-gray-300
                         lg:hidden"
            >
              <Bell className="h-4 w-4" />
              {counts.pending > 0 && (
                <span
                  className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center
                             justify-center rounded-full bg-red-500 px-1 text-[9px]
                             font-bold text-white"
                >
                  {counts.pending}
                </span>
              )}
            </button>

            {/* Mobile-only: avatar */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg
                         bg-indigo-600 text-[10px] font-bold text-white lg:hidden"
            >
              SA
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}