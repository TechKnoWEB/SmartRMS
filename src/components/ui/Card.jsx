import clsx from 'clsx'

export default function Card({ children, title, subtitle, className = '', actions, noPad = false }) {
  return (
    <div className={clsx(
      'bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-card',
      'transition-shadow duration-200',
      !noPad && 'p-5',
      className
    )}>
      {(title || actions) && (
        <div className={clsx('flex items-start justify-between gap-4', !noPad ? 'mb-5' : 'px-5 pt-5 mb-5')}>
          <div>
            {title && <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">{title}</h2>}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
