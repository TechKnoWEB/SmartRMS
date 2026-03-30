import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, BookOpen, FileText, Tag,
  BarChart2, ClipboardList, Settings, UserCog,
  ChevronRight, ChevronDown, Calendar, ArrowUpCircle,
  CreditCard, Wrench,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin','teacher','viewer'] },
  { to: '/students',   label: 'Students',    icon: Users,           roles: ['admin','teacher'] },
  { to: '/marks',      label: 'Marks Entry', icon: BookOpen,        roles: ['admin','teacher'] },
  { to: '/attendance', label: 'Attendance',  icon: Calendar,        roles: ['admin','teacher'] },
  { to: '/results',    label: 'Results',     icon: FileText,        roles: ['admin','teacher','viewer'] },
  { to: '/analytics',  label: 'Analytics',   icon: BarChart2,       roles: ['admin','teacher','viewer'] },
  null,
  { to: '/audit',      label: 'Activity Log',  icon: ClipboardList, roles: ['admin'] },
  { to: '/users',      label: 'Users',         icon: UserCog,       roles: ['admin'] },
  { to: '/settings',   label: 'Settings',      icon: Settings,      roles: ['admin'] },
  null,
  {
    type: 'group',
    label: 'Tools',
    icon: Wrench,
    roles: ['admin'],
    children: [
      { to: '/promotion',  label: 'Bulk Promote',  icon: ArrowUpCircle, roles: ['admin'], beta: true },
      { to: '/id-cards',    label: 'ID Cards',    icon: CreditCard },
      { to: '/exam-labels', label: 'Exam Labels', icon: Tag },
    ],
  },
]

const ROLE_COLOR = {
  admin:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  teacher: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  viewer:  'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
}

export default function Sidebar({ open, onClose, collapsed }) {
  const { user }    = useAuth()
  const location    = useLocation()

  // Track which groups are expanded; auto-open if a child route is active
  const [openGroups, setOpenGroups] = useState(() => {
    const init = {}
    NAV.forEach(item => {
      if (item?.type === 'group') {
        init[item.label] = item.children.some(c => location.pathname.startsWith(c.to))
      }
    })
    return init
  })

  // Auto-expand group when navigating to a child route directly
  useEffect(() => {
    NAV.forEach(item => {
      if (item?.type === 'group') {
        if (item.children.some(c => location.pathname.startsWith(c.to))) {
          setOpenGroups(prev => ({ ...prev, [item.label]: true }))
        }
      }
    })
  }, [location.pathname])

  const toggleGroup = (label) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  const visible = NAV.map(n => {
    if (n === null) return null
    return n.roles.includes(user?.role) ? n : null
  })

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside className={clsx(
        'fixed top-14 left-0 h-[calc(100vh-3.5rem)] z-30 flex flex-col',
        'bg-white dark:bg-gray-900',
        'border-r border-gray-100 dark:border-gray-800',
        'shadow-sidebar transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-16' : 'w-64',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pt-5 pb-4 scrollbar-hide"
             style={{ overflowX: 'hidden' }}>
          <div className={clsx('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
            {visible.map((item, idx) => {

              /* ── Divider ── */
              if (item === null) {
                const hasMore = visible.slice(idx + 1).some(Boolean)
                if (!hasMore) return null
                return (
                  <div
                    key={`div-${idx}`}
                    className={clsx(
                      'border-t border-gray-100 dark:border-gray-800',
                      collapsed ? 'my-2 mx-1' : 'my-3'
                    )}
                  />
                )
              }
              if (!item) return null

              /* ── Collapsible group ── */
              if (item.type === 'group') {
                const { label, icon: Icon, children } = item
                const isOpen = !!openGroups[label]
                const hasActiveChild = children.some(c => location.pathname.startsWith(c.to))

                // Collapsed sidebar: show children icons directly, skip header
                if (collapsed) {
                  return (
                    <div key={`group-${label}`} className="space-y-0.5">
                      {children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={onClose}
                          title={child.label}
                          className={({ isActive }) => clsx(
                            'group flex items-center justify-center rounded-xl py-2.5 transition-all duration-150',
                            isActive
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                          )}
                        >
                          {({ isActive }) => (
                            <child.icon className={clsx(
                              'w-4 h-4 flex-shrink-0 transition-transform duration-150',
                              !isActive && 'group-hover:scale-110'
                            )} />
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )
                }

                // Expanded sidebar: collapsible group
                return (
                  <div key={`group-${label}`}>
                    {/* Group trigger button */}
                    <button
                      onClick={() => toggleGroup(label)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                        'text-sm font-semibold transition-all duration-150',
                        hasActiveChild && !isOpen
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{label}</span>
                      <ChevronDown className={clsx(
                        'w-3.5 h-3.5 opacity-60 transition-transform duration-250 ease-in-out',
                        isOpen && 'rotate-180'
                      )} />
                    </button>

                    {/* Animated children container */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: isOpen ? '1fr' : '0fr',
                        transition: 'grid-template-rows 250ms ease',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div className="pt-0.5 pl-3 space-y-0.5">
                          {children.map(child => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={onClose}
                              className={({ isActive }) => clsx(
                                'group flex items-center gap-3 px-3 py-2 rounded-xl',
                                'text-sm font-semibold transition-all duration-150',
                                isActive
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                              )}
                            >
                              {({ isActive }) => (
                                <>
                                  {/* Connector line */}
                                  <span className={clsx(
                                    'w-px h-4 rounded-full flex-shrink-0',
                                    isActive
                                      ? 'bg-white/40'
                                      : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                                  )} />
                                  <child.icon className={clsx(
                                    'w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150',
                                    !isActive && 'group-hover:scale-110'
                                  )} />
                                  <span className="flex-1 truncate">{child.label}</span>
                                  {child.beta && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                      Beta
                                    </span>
                                  )}
                                  {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                                </>
                              )}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              /* ── Regular nav item ── */
              const { to, label, icon: Icon, beta } = item
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) => clsx(
                    'group flex items-center rounded-xl text-sm font-semibold transition-all duration-150',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={clsx(
                        'w-4 h-4 flex-shrink-0 transition-transform duration-150',
                        !isActive && 'group-hover:scale-110'
                      )} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{label}</span>
                          {beta && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                              Beta
                            </span>
                          )}
                          {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className={clsx(
          'border-t border-gray-100 dark:border-gray-800',
          collapsed ? 'px-2 py-4 flex justify-center' : 'px-4 py-4'
        )}>
          <div className={clsx('flex items-center', collapsed ? '' : 'gap-3')}>
            <div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0"
              title={collapsed ? user?.name : undefined}
            >
              <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase">
                {user?.name?.[0] || '?'}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">
                  {user?.name}
                </p>
                <span className={clsx(
                  'inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold capitalize',
                  ROLE_COLOR[user?.role] || ROLE_COLOR.viewer
                )}>
                  {user?.role}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
