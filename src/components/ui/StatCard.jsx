import clsx from 'clsx'

const colorMap = {
  blue:   { bg: 'bg-blue-500',    light: 'bg-blue-50   dark:bg-blue-900/20',  text: 'text-blue-600   dark:text-blue-400',   ring: 'ring-blue-100   dark:ring-blue-900/30' },
  green:  { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-900/20',text:'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-100 dark:ring-emerald-900/30' },
  purple: { bg: 'bg-violet-500',  light: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600  dark:text-violet-400',  ring: 'ring-violet-100  dark:ring-violet-900/30' },
  yellow: { bg: 'bg-amber-500',   light: 'bg-amber-50  dark:bg-amber-900/20',  text: 'text-amber-600   dark:text-amber-400',   ring: 'ring-amber-100   dark:ring-amber-900/30' },
  red:    { bg: 'bg-red-500',     light: 'bg-red-50    dark:bg-red-900/20',    text: 'text-red-600     dark:text-red-400',     ring: 'ring-red-100     dark:ring-red-900/30' },
  indigo: { bg: 'bg-indigo-500',  light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600  dark:text-indigo-400',  ring: 'ring-indigo-100  dark:ring-indigo-900/30' },
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', sub, trend }) {
  const c = colorMap[color] || colorMap.blue
  const isLoading = value === null || value === undefined || value === '—'

  return (
    <div className={clsx(
      'relative rounded-xl p-4 ring-1 overflow-hidden transition-all duration-200 hover:shadow-card-hover',
      c.light, c.ring
    )}>
      {/* Decorative background blob */}
      <div className={clsx('absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10', c.bg)} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{title}</p>
          {isLoading ? (
            <div className="h-7 w-16 mt-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : (
            <p className={clsx('text-3xl font-black mt-1 tabular-nums', c.text)}>{value}</p>
          )}
          {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
        </div>
        {Icon && (
          <div className={clsx('flex-shrink-0 p-2.5 rounded-xl ring-1', c.light, c.ring)}>
            <Icon className={clsx('w-5 h-5', c.text)} />
          </div>
        )}
      </div>
    </div>
  )
}
