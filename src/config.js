// src/config.js — Application-level feature flags
//
// HIDE_SCHOOL_LIST
//   true  (default) → Search-only mode: no school list is ever pre-loaded or
//                      exposed to anonymous visitors. School selection requires
//                      typing ≥ 3 characters into a search bar.
//   false           → Legacy mode: full dropdown of all active schools is
//                      fetched on page load (backward-compatible).
//
// To disable, set VITE_HIDE_SCHOOL_LIST=false in your .env file.

export const HIDE_SCHOOL_LIST = import.meta.env.VITE_HIDE_SCHOOL_LIST !== 'false'
