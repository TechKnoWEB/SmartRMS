import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard, Users, BookOpen, FileText,
  BarChart2, ClipboardList, Settings, UserCog,
  GraduationCap, ChevronRight, Calendar, ArrowUpCircle,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, roles: ['admin','teacher','viewer'] },
  { to: '/students',   label: 'Students',    icon: Users,            roles: ['admin','teacher'] },
  { to: '/marks',      label: 'Marks Entry', icon: BookOpen,         roles: ['admin','teacher'] },
  { to: '/attendance', label: 'Attendance',  icon: Calendar,         roles: ['admin','teacher'] },
  { to: '/results',    label: 'Results',     icon: FileText,         roles: ['admin','teacher','viewer'] },
  { to: '/analytics',  label: 'Analytics',   icon: BarChart2,        roles: ['admin','teacher','viewer'] },
  null,
  { to: '/promotion',  label: 'Bulk Promote',icon: ArrowUpCircle,    roles: ['admin'] },
  { to: '/audit',      label: 'Audit Trail', icon: ClipboardList,    roles: ['admin'] },
  { to: '/users',      label: 'Users',       icon: UserCog,          roles: ['admin'] },
  { to: '/settings',   label: 'Settings',    icon: Settings,         roles: ['admin'] },
]

const ROLE_COLOR = {
  admin:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  teacher: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  viewer:  'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
}

export default function Sidebar({ open, onClose }) {
  const { user, school } = useAuth()
  const visible = NAV.map(n => {
    if (n === null) return null
    return n.roles.includes(user?.role) ? n : null
  })

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 z-30 flex flex-col',
        'bg-white dark:bg-gray-900',
        'border-r border-gray-100 dark:border-gray-800',
        'shadow-sidebar transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>

        {/* Logo / School branding */}
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {/* Show school logo if available, otherwise gradient icon */}
            {school?.logo_url ? (
              <img
                src={school.logo_url}
                alt="School logo"
                className="w-9 h-9 rounded-xl object-contain bg-white border border-gray-100 dark:border-gray-700 flex-shrink-0 p-0.5"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-black text-sm text-gray-900 dark:text-white truncate leading-tight">
                {school?.school_name || 'School RMS'}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {school?.academic_session || 'Result Management'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          <div className="space-y-0.5">
            {visible.map((item, idx) => {
              if (item === null) {
                const hasMore = visible.slice(idx + 1).some(Boolean)
                if (!hasMore) return null
                return <div key={`div-${idx}`} className="my-3 border-t border-gray-100 dark:border-gray-800" />
              }
              if (!item) return null
              const { to, label, icon: Icon } = item
              return (
                <NavLink
                  key={to} to={to}
                  onClick={onClose}
                  className={({ isActive }) => clsx(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={clsx('w-4 h-4 flex-shrink-0 transition-transform duration-150',
                        !isActive && 'group-hover:scale-110')} />
                      <span className="flex-1 truncate">{label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase">
                {user?.name?.[0] || '?'}
              </span>
            </div>
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
          </div>

        </div>
      </aside>
    </>
  )
}
