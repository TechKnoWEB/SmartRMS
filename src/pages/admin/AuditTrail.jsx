import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Select from '../../components/ui/Select'
import { RefreshCw, Shield, Clock, User, BookOpen, FileText, Activity, Search, Filter, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import Button from '../../components/ui/Button'

const actionColor = (a) => {
  if (!a) return 'gray'
  if (a.includes('SAVE'))    return 'green'
  if (a.includes('DELETE'))  return 'red'
  if (a.includes('LOGIN'))   return 'blue'
  if (a.includes('PUBLISH')) return 'yellow'
  if (a.includes('LOCK'))    return 'red'
  return 'gray'
}

const actionIcon = (a) => {
  if (!a) return Activity
  if (a.includes('SAVE') || a.includes('UPDATE'))  return FileText
  if (a.includes('DELETE'))  return AlertCircle
  if (a.includes('LOGIN') || a.includes('LOGOUT'))  return User
  if (a.includes('PUBLISH')) return BookOpen
  if (a.includes('LOCK') || a.includes('UNLOCK'))   return Shield
  if (a.includes('EXPORT'))  return FileText
  if (a.includes('CONFIG'))  return Activity
  return Activity
}

const colorClasses = {
  green: {
    iconBg: 'bg-green-100 dark:bg-green-900/20',
    iconText: 'text-green-500',
    statDot: 'bg-green-500',
    statText: 'text-green-600 dark:text-green-400',
  },
  red: {
    iconBg: 'bg-red-100 dark:bg-red-900/20',
    iconText: 'text-red-500',
    statDot: 'bg-red-500',
    statText: 'text-red-600 dark:text-red-400',
  },
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    iconText: 'text-blue-500',
    statDot: 'bg-blue-500',
    statText: 'text-blue-600 dark:text-blue-400',
  },
  yellow: {
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
    iconText: 'text-yellow-500',
    statDot: 'bg-yellow-500',
    statText: 'text-yellow-600 dark:text-yellow-400',
  },
  gray: {
    iconBg: 'bg-gray-100 dark:bg-gray-900/20',
    iconText: 'text-gray-500',
    statDot: 'bg-gray-400',
    statText: 'text-gray-500 dark:text-gray-400',
  },
}

const getColorClasses = (color) => colorClasses[color] || colorClasses.gray

export default function AuditTrail() {
  const { user } = useAuth()
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState({ action: '' })
  const [expandedRow, setExpandedRow] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const load = async () => {
    setLoading(true)
    let q = supabase.from('entry_logs').select('*')
      .eq('school_id', user.school_id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter.action) q = q.eq('action_type', filter.action)
    const { data } = await q
    setLogs(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [filter])

  const actionTypes = [
    'MARKS_SAVE','MARKS_DELETE','STUDENT_ADD','STUDENT_UPDATE','STUDENT_DELETE',
    'CONFIG_CHANGE','TERM_LOCK','TERM_UNLOCK','PUBLISH','UNPUBLISH',
    'USER_LOGIN','USER_LOGOUT','EXPORT_PDF','EXPORT_EXCEL'
  ]
  const actionOpts = [{ value:'', label:'All Actions' }, ...actionTypes.map(a => ({ value:a, label:a.replace(/_/g,' ') }))]

  const filteredLogs = searchTerm
    ? logs.filter(log =>
        (log.saved_by?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.action_type?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.class_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.subject?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : logs

  const formatRelativeTime = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const stats = {
    total: logs.length,
    saves: logs.filter(l => l.action_type?.includes('SAVE')).length,
    deletes: logs.filter(l => l.action_type?.includes('DELETE')).length,
    logins: logs.filter(l => l.action_type?.includes('LOGIN')).length,
  }

  const getStatusColor = (status) => {
    if (status === 'success' || status === 'completed') return 'green'
    if (status === 'failed' || status === 'error') return 'red'
    return 'gray'
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <Shield className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Audit Trail
              </h1>
              <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                Monitor all system activities and changes
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={load} loading={loading}
            className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20 backdrop-blur-sm transition-all duration-300 !rounded-xl !px-5 !py-2.5 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Total Events', value: stats.total, color: 'blue', icon: Activity },
            { label: 'Saves', value: stats.saves, color: 'green', icon: FileText },
            { label: 'Deletions', value: stats.deletes, color: 'red', icon: AlertCircle },
            { label: 'Logins', value: stats.logins, color: 'blue', icon: User },
          ].map((stat) => {
            const cls = getColorClasses(stat.color)
            return (
              <div key={stat.label}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-3.5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${cls.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-5 h-5 ${cls.iconText}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card className="!p-0 !overflow-visible !rounded-2xl !shadow-lg !border-0 dark:!bg-gray-900/50 backdrop-blur-sm">
        <div className="p-4 md:p-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, action, class, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-300"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-300"
            >
              <Filter className="w-4 h-4" />
              Filters
              {filter.action && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold">1</span>
              )}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable Filter Panel */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showFilters ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action Type:</span>
              <Select
                options={actionOpts}
                value={filter.action}
                onChange={e => setFilter({ action: e.target.value })}
                className="w-64 !rounded-lg !text-sm"
              />
              {filter.action && (
                <button
                  onClick={() => setFilter({ action: '' })}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium underline underline-offset-2 transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card className="!p-0 !overflow-hidden !rounded-2xl !shadow-lg !border-0 dark:!bg-gray-900/50 backdrop-blur-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700" />
              <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <p className="text-gray-400 text-sm font-medium animate-pulse">Loading audit logs...</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/80 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Showing <span className="text-gray-900 dark:text-white font-semibold">{filteredLogs.length}</span> of{' '}
                <span className="text-gray-900 dark:text-white font-semibold">{logs.length}</span> entries
              </span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/80">
                    {['Time', 'Action', 'Performed By', 'Class', 'Subject', 'Status', 'Notes'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {filteredLogs.map((log) => {
                    const IconComponent = actionIcon(log.action_type)
                    const color = actionColor(log.action_type)
                    const cls = getColorClasses(color)
                    const statusColor = getStatusColor(log.status)
                    const statusCls = getColorClasses(statusColor)

                    return (
                      <tr
                        key={log.id}
                        className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {formatRelativeTime(log.created_at)}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`w-3.5 h-3.5 opacity-60 ${cls.iconText}`} />
                            <Badge variant={color}>
                              {log.action_type?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase">
                              {log.saved_by?.charAt(0) || '?'}
                            </div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{log.saved_by}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {log.class_name ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                              {log.class_name} {log.section}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                          {log.subject || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {log.status ? (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusCls.statText}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCls.statDot}`} />
                              {log.status}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs text-gray-500 max-w-[180px] truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" title={log.notes}>
                            {log.notes || '—'}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                  {!filteredLogs.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Shield className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No audit logs found</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                              {searchTerm ? 'Try adjusting your search terms' : 'Activity logs will appear here'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800/60">
              {filteredLogs.map((log) => {
                const IconComponent = actionIcon(log.action_type)
                const color = actionColor(log.action_type)
                const cls = getColorClasses(color)
                const isExpanded = expandedRow === log.id

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all duration-200"
                    onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${cls.iconBg} flex-shrink-0 mt-0.5`}>
                          <IconComponent className={`w-4 h-4 ${cls.iconText}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={color}>
                              {log.action_type?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1.5">{log.saved_by}</p>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(log.created_at)}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-60 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 text-xs">
                        <div>
                          <p className="text-gray-400 font-medium mb-0.5">Class</p>
                          <p className="text-gray-700 dark:text-gray-300">{log.class_name ? `${log.class_name} ${log.section}` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium mb-0.5">Subject</p>
                          <p className="text-gray-700 dark:text-gray-300">{log.subject || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium mb-0.5">Status</p>
                          <p className="text-gray-700 dark:text-gray-300">{log.status || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium mb-0.5">Full Time</p>
                          <p className="text-gray-700 dark:text-gray-300">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                        {log.notes && (
                          <div className="col-span-2">
                            <p className="text-gray-400 font-medium mb-0.5">Notes</p>
                            <p className="text-gray-700 dark:text-gray-300">{log.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {!filteredLogs.length && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">No audit logs found</p>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}