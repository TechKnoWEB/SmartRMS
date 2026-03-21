import clsx from 'clsx'

const variants = {
  green:  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800',
  red:    'bg-red-50    text-red-700    ring-red-200    dark:bg-red-900/20    dark:text-red-400    dark:ring-red-800',
  blue:   'bg-blue-50   text-blue-700   ring-blue-200   dark:bg-blue-900/20   dark:text-blue-400   dark:ring-blue-800',
  yellow: 'bg-amber-50  text-amber-700  ring-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:ring-amber-800',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:ring-violet-800',
  gray:   'bg-gray-100  text-gray-600   ring-gray-200   dark:bg-gray-800      dark:text-gray-400   dark:ring-gray-700',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:ring-indigo-800',
}

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset gap-1',
      variants[variant] || variants.gray,
      className,
    )}>
      {children}
    </span>
  )
}
