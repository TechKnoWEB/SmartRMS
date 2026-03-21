// src/pages/superadmin/saSchoolsTab.jsx
import { Loader2, Building2 } from 'lucide-react'
import { EmptyState } from './saComponents'
import { SchoolRow } from './saSchoolDrawer'

export function SchoolsTab({ schools, creds, onUpdated, loading, tab }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {tab === 'inactive' ? 'Inactive Schools' : 'All Active Schools'}
          </h2>
          <p className="text-[11px] text-gray-400">{schools.length} school{schools.length !== 1 ? 's' : ''}</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
      </div>

      {schools.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={tab === 'inactive' ? 'No inactive schools' : 'No schools yet'}
          subtitle="Schools will appear here once registrations are approved"
        />
      ) : (
        schools.map(s => (
          <SchoolRow key={s.id} school={s} creds={creds} onUpdated={onUpdated} />
        ))
      )}
    </div>
  )
}
