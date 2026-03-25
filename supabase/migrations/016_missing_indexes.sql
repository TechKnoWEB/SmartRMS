-- ================================================================
-- Migration 016 — Missing Indexes on High-Traffic Tables
-- Run in Supabase SQL Editor
-- ================================================================
-- These indexes cover the most common query patterns. Each uses
-- CONCURRENTLY so it does not lock the table during creation —
-- safe to run on a live database.
-- NOTE: CONCURRENTLY cannot run inside a transaction block.
--       Run each statement individually if your client wraps in BEGIN.

-- ── 1. marks — highest-traffic table ──────────────────────────
-- Covers: fetchMarks() — filters by school_id + class_name + section
--         MarksEntry loads this on every subject/term switch
CREATE INDEX CONCURRENTLY IF NOT EXISTS marks_school_class_section_idx
  ON public.marks (school_id, class_name, section);

-- Covers: fetchMarks() / fetchMarksAllTerms() — IN(student_ids) + term filter
--         Also covers buildStudentResult() data fetch in Results.jsx
CREATE INDEX CONCURRENTLY IF NOT EXISTS marks_student_term_idx
  ON public.marks (student_id, term);

-- ── 2. entry_logs — audit trail page ──────────────────────────
-- Covers: AuditTrail.jsx — filters by school_id, orders by created_at DESC
--         Without this, every audit page load does a full table scan
CREATE INDEX CONCURRENTLY IF NOT EXISTS entry_logs_school_created_idx
  ON public.entry_logs (school_id, created_at DESC);

-- ── 3. students — class listing + BulkPromotion ───────────────
-- Covers: fetchStudents() — filters by school_id + class_name + section + is_active
--         BulkPromotion.jsx loads all active students per class in one query
CREATE INDEX CONCURRENTLY IF NOT EXISTS students_school_class_section_idx
  ON public.students (school_id, class_name, section, is_active);
