-- ================================================================
-- Migration 014 — Attendance Table + Dynamic Grading System
-- Run in Supabase SQL Editor
-- ================================================================

-- ── 1. Attendance table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id             uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id      uuid,
  student_id     uuid NOT NULL,
  class_name     text NOT NULL,
  section        text NOT NULL,
  attendance_pct numeric CHECK (attendance_pct >= 0 AND attendance_pct <= 100),
  academic_year  text NOT NULL DEFAULT '2025-26'::text,
  updated_at     timestamp with time zone NOT NULL DEFAULT now(),
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT attendance_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT attendance_unique UNIQUE (student_id, school_id, academic_year)
);

-- Index for fast lookups by class/section
CREATE INDEX IF NOT EXISTS attendance_class_section_idx
  ON public.attendance (school_id, class_name, section);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies (school-scoped, same pattern as other tables)
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT USING (school_id = current_school_id());

DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
CREATE POLICY "attendance_insert" ON public.attendance
  FOR INSERT WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "attendance_update" ON public.attendance;
CREATE POLICY "attendance_update" ON public.attendance
  FOR UPDATE USING (school_id = current_school_id());

DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;
CREATE POLICY "attendance_delete" ON public.attendance
  FOR DELETE USING (school_id = current_school_id());

-- ── 2. Dynamic grading system ─────────────────────────────────
-- Stores per-school grading configuration.
-- Schools can define custom grade bands and pass mark.

CREATE TABLE IF NOT EXISTS public.grading_config (
  id          uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id   uuid NOT NULL,
  grade_label text NOT NULL,          -- e.g. 'A+', 'A', 'B+', ...
  min_pct     numeric NOT NULL,       -- e.g. 90
  max_pct     numeric NOT NULL,       -- e.g. 100
  color_class text DEFAULT 'text-emerald-700 bg-emerald-50',
  display_order integer NOT NULL DEFAULT 0,
  CONSTRAINT grading_config_pkey PRIMARY KEY (id),
  CONSTRAINT grading_config_school_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);

CREATE INDEX IF NOT EXISTS grading_config_school_idx ON public.grading_config (school_id);

ALTER TABLE public.grading_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grading_config_select" ON public.grading_config;
CREATE POLICY "grading_config_select" ON public.grading_config
  FOR SELECT USING (school_id = current_school_id());

DROP POLICY IF EXISTS "grading_config_write" ON public.grading_config;
CREATE POLICY "grading_config_write" ON public.grading_config
  FOR ALL USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

-- ── 3. School-level term count setting ────────────────────────
-- Add max_terms column to schools (defaults to 3 for backward compat)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS max_terms integer NOT NULL DEFAULT 3
    CHECK (max_terms BETWEEN 1 AND 6);

-- ── 4. Expand marks table to support up to 6 terms ────────────
-- The marks table uses term INTEGER — no schema change needed.
-- The config table needs new term columns for marks beyond 3.
ALTER TABLE public.config
  ADD COLUMN IF NOT EXISTS max_t4     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_t4_int integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_t5     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_t5_int integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_t6     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_t6_int integer NOT NULL DEFAULT 0;

-- Update marks term check constraint to allow up to 6
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_term_check;
ALTER TABLE public.marks
  ADD CONSTRAINT marks_term_check CHECK (term = ANY (ARRAY[1,2,3,4,5,6]));

-- Update term_locks to support up to 6 terms
ALTER TABLE public.term_locks
  ADD COLUMN IF NOT EXISTS t4_lock      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS t5_lock      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS t6_lock      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS t4_locked_by text REFERENCES public.users(user_id),
  ADD COLUMN IF NOT EXISTS t5_locked_by text REFERENCES public.users(user_id),
  ADD COLUMN IF NOT EXISTS t6_locked_by text REFERENCES public.users(user_id),
  ADD COLUMN IF NOT EXISTS t4_locked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS t5_locked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS t6_locked_at timestamp with time zone;

-- ── 5. Pass mark setting per school ───────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS pass_mark numeric NOT NULL DEFAULT 33
    CHECK (pass_mark >= 0 AND pass_mark <= 100);

-- ── 6. Seed default grading config for existing schools ───────
-- Insert default grades matching the current hardcoded system
-- (only for schools that don't have any grading_config rows yet)
INSERT INTO public.grading_config
  (school_id, grade_label, min_pct, max_pct, color_class, display_order)
SELECT
  s.id,
  g.grade_label,
  g.min_pct,
  g.max_pct,
  g.color_class,
  g.display_order
FROM public.schools s
CROSS JOIN (VALUES
  ('A+', 90, 100, 'text-emerald-700 bg-emerald-50', 1),
  ('A',  80,  89, 'text-emerald-600 bg-emerald-50', 2),
  ('B+', 70,  79, 'text-blue-700 bg-blue-50',       3),
  ('B',  60,  69, 'text-blue-600 bg-blue-50',        4),
  ('C+', 45,  59, 'text-amber-700 bg-amber-50',      5),
  ('C',  33,  44, 'text-amber-600 bg-amber-50',      6),
  ('D',   0,  32, 'text-red-600 bg-red-50',          7)
) AS g(grade_label, min_pct, max_pct, color_class, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.grading_config gc WHERE gc.school_id = s.id
);
