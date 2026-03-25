// src/components/ui/SchoolSearch.jsx
//
// Search-first school selector. Replaces the full-list dropdown when
// HIDE_SCHOOL_LIST is true. Queries Supabase directly with ilike filters —
// only returns matching rows, never pre-loads or exposes the full school list.
//
// Props:
//   onSelect(school_code: string | null)  — fires when user picks a school
//   selectedCode?: string                 — controlled selected DISE code
//   placeholder?: string
//   className?: string

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, GraduationCap, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function SchoolSearch({
  onSelect,
  selectedCode,
  placeholder = 'Enter your School Name or DISE Code to search…',
  className = '',
}) {
  const [query,         setQuery]         = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [results,       setResults]       = useState([])
  const [loading,       setLoading]       = useState(false)
  const [open,          setOpen]          = useState(false)
  const containerRef = useRef(null)
  const debouncedQ   = useDebounce(query, 300)

  // Close on outside click
  useEffect(() => {
    const fn = e => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [])

  // Fire search when debounced query changes
  useEffect(() => {
    if (debouncedQ.length < 3) { setResults([]); setOpen(false); return }

    let cancelled = false
    setLoading(true)

    supabase
      .from('schools')
      .select('school_name, school_code, tagline, academic_session')
      .eq('is_active', true)
      .or(`school_name.ilike.%${debouncedQ}%,school_code.ilike.%${debouncedQ}%`)
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return
        setResults((data ?? []).slice(0, 5))
        setOpen(true)
      })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedQ])

  const handleSelect = school => {
    setSelectedLabel(school.school_name)
    setQuery('')
    setOpen(false)
    onSelect(school.school_code)
  }

  const handleClear = () => {
    setSelectedLabel('')
    setQuery('')
    setResults([])
    onSelect(null)
  }

  const displayValue = selectedLabel || query
  const showHelper   = !selectedLabel && query.length > 0 && query.length < 3

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={displayValue}
          onChange={e => {
            const v = e.target.value
            setQuery(v)
            if (selectedLabel) { setSelectedLabel(''); onSelect(null) }
          }}
          onFocus={() => { if (results.length > 0 && !selectedLabel) setOpen(true) }}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          className="w-full pl-10 pr-9 py-3 rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-gray-100
            placeholder-gray-400 focus:outline-none focus:border-primary-500
            focus:ring-4 focus:ring-primary-500/15 transition-all duration-200"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {!loading && selectedLabel && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Helper text */}
      {showHelper && (
        <p className="mt-1.5 ml-1 text-xs text-gray-400">
          Please type at least 3 characters to search
        </p>
      )}

      {/* Results dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full overflow-hidden rounded-xl border
          border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
          shadow-2xl shadow-black/10 dark:shadow-black/30">
          {results.length === 0 ? (
            <div className="flex flex-col items-center py-8 px-4">
              <Search className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm font-medium text-gray-400">No schools found</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">
                Try a different name or DISE code
              </p>
            </div>
          ) : (
            results.map(s => (
              <button
                key={s.school_code}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left
                  hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors
                  border-b border-gray-100 dark:border-gray-700/50 last:border-0"
              >
                <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center
                  bg-gradient-to-br from-primary-100 to-primary-200
                  dark:from-primary-900/40 dark:to-primary-800/40">
                  <GraduationCap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {s.school_name}
                  </p>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                    DISE: {s.school_code}{s.tagline ? ` · ${s.tagline}` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
