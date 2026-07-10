-- StudyFlow Phase 2: extensions and enums

create extension if not exists pgcrypto;

create type public.app_theme as enum ('light', 'dark', 'system');
create type public.task_category as enum (
  'study', 'assignment', 'personal', 'work', 'health', 'finance', 'other'
);
create type public.priority_level as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum (
  'todo', 'in_progress', 'completed', 'cancelled'
);
create type public.assignment_type as enum (
  'homework', 'report', 'presentation', 'project', 'quiz',
  'midterm', 'final_exam', 'lab', 'viva', 'other'
);
create type public.assignment_status as enum (
  'not_started', 'in_progress', 'ready_to_submit',
  'submitted', 'graded', 'missed'
);
create type public.calendar_event_type as enum (
  'class', 'study_session', 'assignment', 'exam',
  'meeting', 'personal_event', 'task'
);
create type public.syllabus_status as enum (
  'not_started', 'in_progress', 'completed'
);
create type public.study_session_type as enum (
  'reading', 'revision', 'assignment', 'practice',
  'lecture_review', 'skill_learning', 'other'
);
create type public.study_session_status as enum (
  'running', 'paused', 'completed', 'discarded'
);
create type public.reading_status as enum (
  'want_to_read', 'currently_reading', 'completed', 'paused', 'abandoned'
);
create type public.transaction_type as enum ('expense', 'income');
create type public.skill_status as enum ('planned', 'learning', 'paused', 'completed');
create type public.skill_level as enum (
  'beginner', 'elementary', 'intermediate', 'advanced'
);
create type public.resource_type as enum (
  'course', 'video', 'article', 'book',
  'practice_project', 'documentation', 'other'
);
create type public.habit_frequency as enum (
  'daily', 'weekdays', 'weekly', 'custom'
);
