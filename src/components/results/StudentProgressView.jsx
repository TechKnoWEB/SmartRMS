// src/components/results/StudentProgressView.jsx
// Term-over-term sparkline progress view for a single student.
// All data comes from the result object produced by buildStudentResult() —
// no additional Supabase fetch needed.

import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info } from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Per-term percentage from the terms[] array already on each subject. */
function termPcts(subject) {
  return subject.terms.map(t => ({
    label:  t.term_name.replace('Term ', 'T'),
    pct:    t.max > 0 ? Math.round((t.total / t.max) * 10000) / 100 : null,
    total:  t.total,
    max:    t.max,
  }))
}

/**
 * Trend = comparison of first vs last valid term.
 * ≥  pp rise → 'improving', ≥ 8 pp drop → 'declining', else 'stable'.
 * < 2 valid terms → 'neutral'.
 */
function getTrend(pcts) {
  const valid = pcts.filter(p => p.pct !== null)
  if (valid.length < 2) return 'neutral'
  const diff = valid[valid.length - 1].pct - valid[0].pct
  if (diff <= -6)  return 'declining'
  if (diff >=  6)  return 'improving'
  return 'stable'
}

// ── sparkline SVG ─────────────────────────────────────────────────────────────

const SPARK_W = 120
const SPARK_H = 40
const PAD     = 5

const LINE_COLOR = {
  declining: '#f87171',
  improving: '#34d399',
  stable:    '#a5b4fc',
  neutral:   '#d1d5db',
}

function Sparkline({ pcts, trend }) {
  const n      = pcts.length
  const plotW  = SPARK_W - 2 * PAD
  const plotH  = SPARK_H - 2 * PAD
  const color  = LINE_COLOR[trend] || LINE_COLOR.neutral

  const xOf = i => n === 1 ? SPARK_W / 2 : PAD + (i / (n - 1)) * plotW
  const yOf = pct => SPARK_H - PAD - (Math.min(Math.max(pct, 0), 100) / 100) * plotH
  const passY = yOf(33)

  // Segments between consecutive valid points
  const segments = []
  for (let i = 0; i < n - 1; i++) {
    const a = pcts[i], b = pcts[i + 1]
    if (a.pct !== null && b.pct !== null)
      segments.push({ x1: xOf(i), y1: yOf(a.pct), x2: xOf(i + 1), y2: yOf(b.pct) })
  }

  const validPts = pcts
    .map((p, i) => p.pct !== null ? { x: xOf(i), y: yOf(p.pct) } : null)
    .filter(Boolean)

  const areaPoints = validPts.length >= 2
    ? [
        `${validPts[0].x},${SPARK_H - PAD}`,
        ...validPts.map(p => `${p.x},${p.y}`),
        `${validPts[validPts.length - 1].x},${SPARK_H - PAD}`,
      ].join(' ')
    : null

  if (validPts.length === 0)
    return (
      <div style={{ width: SPARK_W, height: SPARK_H }}
        className="flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0">
        No data
      </div>
    )

  return (
    <svg width={SPARK_W} height={SPARK_H} className="flex-shrink-0 overflow-visible">
      {/* Pass-threshold dashed line at 33 % */}
      <line
        x1={PAD} y1={passY} x2={SPARK_W - PAD} y2={passY}
        stroke="#fca5a5" strokeWidth="1" strokeDasharray="3,2" opacity={0.8}
      />

      {/* Area fill */}
      {areaPoints && (
        <polygon points={areaPoints} fill={color} fillOpacity="0.12" />
      )}

      {/* Line segments */}
      {segments.map((s, i) => (
        <line key={i}
          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
        />
      ))}

      {/* Dots */}
      {pcts.map((p, i) =>
        p.pct !== null ? (
          <circle key={i}
            cx={xOf(i)} cy={yOf(p.pct)} r="3.5"
            fill={color} stroke="white" strokeWidth="1.5"
          />
        ) : null
      )}
    </svg>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function StudentProgressView({ result }) {
  const { subjects } = result

  // Enrich each subject with per-term pcts and trend, then sort:
  // declining first → stable → improving, then by overall % asc within group
  const enriched = subjects
    .map(sub => {
      const pcts  = termPcts(sub)
      const trend = getTrend(pcts)
      return { ...sub, pcts, trend }
    })
    .sort((a, b) => {
      const order = { declining: 0, stable: 1, improving: 2, neutral: 3 }
      if (order[a.trend] !== order[b.trend]) return order[a.trend] - order[b.trend]
      return a.subject_percentage - b.subject_percentage
    })

  const decliningCount = enriched.filter(s => s.trend === 'declining').length
  const improvingCount = enriched.filter(s => s.trend === 'improving').length

  return (
    <div className="space-y-4">

      {/* ── summary chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {decliningCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800/40
            text-xs font-bold text-red-600 dark:text-red-400">
            <TrendingDown className="w-3 h-3" />
            {decliningCount} declining
          </span>
        )}
        {improvingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800/40
            text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            {improvingCount} improving
          </span>
        )}
        {decliningCount === 0 && improvingCount === 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
            bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Minus className="w-3 h-3" />
            All subjects stable
          </span>
        )}
        <span className="ml-auto hidden sm:flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
          <Info className="w-3 h-3" />
          Declining subjects sorted to top · Trend = first vs last term
        </span>
      </div>

      {/* ── subject rows ── */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-gray-200/80 dark:ring-gray-800/80">

        {/* Column header */}
        <div className="grid items-center gap-4 px-4 py-2.5
          bg-gray-50 dark:bg-gray-800/50
          border-b border-gray-100 dark:border-gray-800"
          style={{ gridTemplateColumns: '1fr 120px 72px' }}>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subject</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Trend</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Overall</span>
        </div>

        {enriched.map(sub => {
          const { trend, pcts } = sub
          const isDecline = trend === 'declining'
          const isImprove = trend === 'improving'

          const TrendIcon  = isDecline ? TrendingDown : isImprove ? TrendingUp : Minus
          const trendColor = isDecline
            ? 'text-red-500 dark:text-red-400'
            : isImprove
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-gray-400 dark:text-gray-500'
          const pctColor = (pct) =>
            pct === null   ? 'text-gray-300 dark:text-gray-600' :
            pct < 33       ? 'text-red-500 dark:text-red-400' :
            pct < 50       ? 'text-amber-500 dark:text-amber-400' :
            pct >= 75      ? 'text-emerald-600 dark:text-emerald-400'
                           : 'text-blue-500 dark:text-blue-400'

          return (
            <div
              key={sub.subject_name}
              className={[
                'px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0',
                'transition-colors duration-150',
                isDecline
                  ? 'bg-red-50/40 dark:bg-red-900/10'
                  : 'bg-white dark:bg-gray-900 hover:bg-gray-50/60 dark:hover:bg-gray-800/30',
              ].join(' ')}
            >
              <div className="grid items-center gap-4"
                style={{ gridTemplateColumns: '1fr 120px 72px' }}>

                {/* Subject name + per-term scores */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {isDecline && (
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {sub.subject_name}
                    </span>
                    <TrendIcon className={`w-3.5 h-3.5 flex-shrink-0 ${trendColor}`} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {pcts.map((p, i) => (
                      <span key={i} className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                        {p.label}:{' '}
                        <span className={`font-black ${pctColor(p.pct)}`}>
                          {p.pct !== null ? `${p.pct}%` : '—'}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sparkline */}
                <Sparkline pcts={pcts} trend={trend} />

                {/* Overall % + grade */}
                <div className="text-right">
                  <span className={`text-sm font-black tabular-nums leading-none ${pctColor(sub.subject_percentage)}`}>
                    {sub.subject_percentage.toFixed(1)}%
                  </span>
                  <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                    {sub.subject_grade}
                  </div>
                </div>

              </div>
            </div>
          )
        })}
      </div>

      {/* ── legend ── */}
      <div className="flex items-center gap-5 flex-wrap text-[11px] text-gray-400 dark:text-gray-500 px-1">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="3,2" /></svg>
          Pass threshold (33%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
          Declining (≥ 8 pp drop)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
          Improving (≥ 8 pp rise)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-300 flex-shrink-0" />
          Stable (within ± 8 pp)
        </span>
      </div>

    </div>
  )
}
