import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, ClipboardList, Settings, UserCog,
  ChevronRight, Calendar, ArrowUpCircle,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, roles: ['admin','teacher','viewer'] },
  { to: '/students',   label: 'Students',     icon: Users,           roles: ['admin','teacher'] },
  { to: '/marks',      label: 'Marks Entry',  icon: BookOpen,        roles: ['admin','teacher'] },
  { to: '/attendance', label: 'Attendance',   icon: Calendar,        roles: ['admin','teacher'] },
  { to: '/results',    label: 'Results',      icon: FileText,        roles: ['admin','teacher','viewer'] },
  { to: '/analytics',  label: 'Analytics',    icon: BarChart2,       roles: ['admin','teacher','viewer'] },
  null,
  { to: '/promotion',  label: 'Bulk Promote', icon: ArrowUpCircle,   roles: ['admin'] },
  { to: '/audit',      label: 'Activity Log', icon: ClipboardList,   roles: ['admin'] },
  { to: '/users',      label: 'Users',        icon: UserCog,         roles: ['admin'] },
  { to: '/settings',   label: 'Settings',     icon: Settings,        roles: ['admin'] },
]

const ROLE_COLOR = {
  admin:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  teacher: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  viewer:  'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
}

export default function Sidebar({ open, onClose, collapsed }) {
  const { user } = useAuth()
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
        // desktop width driven by collapsed state
        collapsed ? 'w-16' : 'w-64',
        // mobile: slide in/out; on desktop always visible
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pt-5 pb-4 scrollbar-hide"
             style={{ overflowX: 'hidden' }}>
          <div className={clsx('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
            {visible.map((item, idx) => {
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
              const { to, label, icon: Icon } = item
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0"
                 title={collapsed ? user?.name : undefined}>
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
