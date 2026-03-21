/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',

  // ── Safelist ──────────────────────────────────────────────────────────────
  // Tailwind's JIT scanner only sees static strings. Any class assembled at
  // runtime via template literals is invisible to the purger and will be
  // stripped from the production bundle — causing silent layout breakage.
  //
  // The only dynamic Tailwind classes in this codebase are in MarksEntry.jsx,
  // where grid column count is built from `maxTerms` (1–4, capped by the DB)
  // and `termList.length` (also 1–4):
  //
  //   `grid grid-cols-1 sm:grid-cols-${Math.min(termList.length, 4)}`   line 182
  //   `grid grid-cols-${maxTerms}`                                       lines 975, 990, 1018, 1053
  //
  // All possible values are enumerated below so they survive the purge step.
  safelist: [
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'sm:grid-cols-1',
    'sm:grid-cols-2',
    'sm:grid-cols-3',
    'sm:grid-cols-4',
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          DEFAULT: '#4f46e5',
        },
        surface: {
          DEFAULT: '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
        },
        success: '#16a34a',
        danger:  '#dc2626',
        warning: '#d97706',
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 16px 0 rgb(0 0 0 / 0.08)',
        'modal':      '0 20px 60px -10px rgb(0 0 0 / 0.25)',
        'sidebar':    '4px 0 24px 0 rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.125rem',
      },
      animation: {
        'fade-in':       'fadeIn 0.18s ease-out',
        'slide-up':      'slideUp 0.22s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(8px)' },   to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}