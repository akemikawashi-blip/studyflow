-- ATLAS ACADÊMICO — Etapa 2: disciplinas, semestres, materiais e calendário
-- Additive and idempotent. Reuses existing tables; nothing is duplicated.

-- ---------------------------------------------------------------------------
-- Semesters: academic_semesters becomes the semester entity. The legacy GPA
-- page keeps working; GPA is now optional (Brazilian courses rarely use it).
-- ---------------------------------------------------------------------------

alter table public.academic_semesters alter column gpa drop not null;
alter table public.academic_semesters add column if not exists start_date date;
alter table public.academic_semesters add column if not exists end_date date;
alter table public.academic_semesters add column if not exists is_current boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'academic_semesters_dates_order' and conrelid = 'public.academic_semesters'::regclass
  ) then
    alter table public.academic_semesters
      add constraint academic_semesters_dates_order
      check (start_date is null or end_date is null or end_date >= start_date);
  end if;
end;
$$;

create unique index if not exists academic_semesters_one_current_per_user
  on public.academic_semesters(user_id)
  where is_current;

-- ---------------------------------------------------------------------------
-- Courses (disciplinas): semester link and the discipline's own notes
-- ---------------------------------------------------------------------------

alter table public.courses add column if not exists semester_id uuid;
alter table public.courses add column if not exists description text;
alter table public.courses add column if not exists references_text text;
alter table public.courses add column if not exists difficulties text;
alter table public.courses add column if not exists review_topics text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_semester_owner_fk' and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_semester_owner_fk
      foreign key (semester_id, user_id)
      references public.academic_semesters(id, user_id)
      on delete set null (semester_id);
  end if;
end;
$$;

create index if not exists courses_semester_idx on public.courses(semester_id);

-- ---------------------------------------------------------------------------
-- Materials can belong to an exam
-- ---------------------------------------------------------------------------

alter table public.materials add column if not exists exam_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'materials_exam_owner_fk' and conrelid = 'public.materials'::regclass
  ) then
    alter table public.materials
      add constraint materials_exam_owner_fk
      foreign key (exam_id, user_id)
      references public.exam_schedules(id, user_id)
      on delete set null (exam_id);
  end if;
end;
$$;

create index if not exists materials_exam_idx on public.materials(exam_id);

-- ---------------------------------------------------------------------------
-- Calendar categories requested for the academic calendar
-- ---------------------------------------------------------------------------

alter type public.calendar_event_type add value if not exists 'seminar';
alter type public.calendar_event_type add value if not exists 'presentation';
alter type public.calendar_event_type add value if not exists 'deadline';
alter type public.calendar_event_type add value if not exists 'university_event';
alter type public.calendar_event_type add value if not exists 'project_deadline';
alter type public.calendar_event_type add value if not exists 'extracurricular';

create index if not exists calendar_events_user_course_idx on public.calendar_events(user_id, course_id);
