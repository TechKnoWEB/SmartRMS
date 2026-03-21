import clsx from 'clsx'

export default function Input({ label, error, hint, className = '', id, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150',
          'bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-normal',
          error
            ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 focus:border-red-400'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary-500 focus:ring-primary-500/20',
          'focus:outline-none focus:ring-4 focus:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900',
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}
