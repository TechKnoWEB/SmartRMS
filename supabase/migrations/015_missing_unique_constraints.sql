-- ================================================================
-- Migration 015 — Missing UNIQUE Constraints
-- Run in Supabase SQL Editor
-- ================================================================
-- Fixes upsert-creates-duplicates bugs and prevents concurrent-insert races
-- across marks, config, term_locks, and publish_settings tables.

-- ── 1. marks — CRITICAL ────────────────────────────────────────
-- useMarks.saveMarks() calls:
--   supabase.from('marks').upsert(batch, { onConflict: 'student_id,school_id,subject_name,term' })
-- Without this constraint, every save INSERTs a new row instead of updating.
ALTER TABLE public.marks
  ADD CONSTRAINT marks_unique_entry
  UNIQUE (student_id, school_id, subject_name, term);

-- ── 2. config — CRITICAL ───────────────────────────────────────
-- Subject configuration must be unique per school + class + subject.
-- Without this, Settings.jsx upserts can create duplicate config rows,
-- causing buildStudentResult() to pick up stale/wrong max marks.
ALTER TABLE public.config
  ADD CONSTRAINT config_unique_subject
  UNIQUE (school_id, class_name, subject_name);

-- ── 3. term_locks ──────────────────────────────────────────────
-- toggle-term-lock Edge Function uses upsert to set lock state.
-- Without this constraint, concurrent lock toggles create duplicate rows
-- and the lock check reads an indeterminate row.
ALTER TABLE public.term_locks
  ADD CONSTRAINT term_locks_unique_entry
  UNIQUE (school_id, class_name, section);

-- ── 4. publish_settings ────────────────────────────────────────
-- Results.jsx upserts publish state per class/section.
-- Without this, concurrent publish actions create duplicate rows.
ALTER TABLE public.publish_settings
  ADD CONSTRAINT publish_settings_unique_entry
  UNIQUE (school_id, class_name, section);
