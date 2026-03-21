import clsx from 'clsx'

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"
            style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  )
}

export default function Table({ columns = [], data = [], loading = false, emptyText = 'No data found.', emptyIcon }) {
  if (loading) {
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80 dark:bg-gray-800/50">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800/50">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50/80 dark:bg-gray-800/50">
          <tr>
            {columns.map(col => (
              <th key={col.key}
                className="px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800/50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  {emptyIcon && <div className="text-gray-300 dark:text-gray-600 mb-1">{emptyIcon}</div>}
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id ?? i}
                className="group hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors duration-100">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
