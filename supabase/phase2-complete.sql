-- ==================================================
-- 202607100001_extensions_and_enums.sql
-- ==================================================

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


-- ==================================================
-- 202607100002_tables.sql
-- ==================================================

-- StudyFlow Phase 2: normalized application tables

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  university_name text,
  department text,
  academic_year text,
  avatar_path text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 80)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency_code varchar(3) not null default 'BDT',
  time_zone text not null default 'Asia/Dhaka',
  date_format text not null default 'dd-MM-yyyy',
  week_starts_on smallint not null default 6,
  daily_study_goal_minutes integer not null default 60,
  weekly_study_goal_minutes integer not null default 420,
  theme public.app_theme not null default 'system',
  assignment_reminders boolean not null default true,
  task_reminders boolean not null default true,
  habit_reminders boolean not null default true,
  budget_alerts boolean not null default true,
  study_goal_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_currency_code check (currency_code ~ '^[A-Z]{3}$'),
  constraint user_preferences_week_start check (week_starts_on between 1 and 7),
  constraint user_preferences_daily_goal check (daily_study_goal_minutes between 0 and 1440),
  constraint user_preferences_weekly_goal check (weekly_study_goal_minutes between 0 and 10080)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null,
  course_name text not null,
  instructor_name text,
  semester text,
  credit_hours numeric(4,1),
  color varchar(7) not null default '#24389c',
  target_grade text,
  current_grade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint courses_code_not_blank check (length(btrim(course_code)) > 0),
  constraint courses_name_not_blank check (length(btrim(course_name)) > 0),
  constraint courses_credit_hours check (credit_hours is null or credit_hours >= 0),
  constraint courses_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid,
  title text not null,
  description text,
  assignment_type public.assignment_type not null default 'other',
  assigned_date date,
  due_date date not null,
  due_time time,
  total_marks numeric(8,2),
  obtained_marks numeric(8,2),
  submission_status public.assignment_status not null default 'not_started',
  priority public.priority_level not null default 'medium',
  progress_percentage smallint not null default 0,
  submission_link text,
  attachment_path text,
  reminder_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint assignments_title_not_blank check (length(btrim(title)) > 0),
  constraint assignments_progress_range check (progress_percentage between 0 and 100),
  constraint assignments_total_marks check (total_marks is null or total_marks >= 0),
  constraint assignments_obtained_marks check (
    obtained_marks is null or (
      obtained_marks >= 0
      and total_marks is not null
      and obtained_marks <= total_marks
    )
  ),
  constraint assignments_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category public.task_category not null default 'other',
  priority public.priority_level not null default 'medium',
  status public.task_status not null default 'todo',
  due_date date,
  due_time time,
  estimated_minutes integer,
  actual_minutes integer,
  course_id uuid,
  assignment_id uuid,
  recurrence_rule jsonb,
  recurrence_time_zone text,
  is_recurring_template boolean not null default false,
  parent_task_id uuid,
  reminder_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint tasks_title_not_blank check (length(btrim(title)) > 0),
  constraint tasks_estimated_minutes check (estimated_minutes is null or estimated_minutes >= 0),
  constraint tasks_actual_minutes check (actual_minutes is null or actual_minutes >= 0),
  constraint tasks_recurrence_consistency check (
    (is_recurring_template = false)
    or recurrence_rule is not null
  ),
  constraint tasks_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id),
  constraint tasks_assignment_owner_fk
    foreign key (assignment_id, user_id)
    references public.assignments(id, user_id)
    on delete set null (assignment_id),
  constraint tasks_parent_owner_fk
    foreign key (parent_task_id, user_id)
    references public.tasks(id, user_id)
    on delete set null (parent_task_id)
);

create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_subtasks_title_not_blank check (length(btrim(title)) > 0),
  constraint task_subtasks_sort_order check (sort_order >= 0),
  constraint task_subtasks_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete cascade
);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  scheduled_date date not null,
  scheduled_time time,
  status public.task_status not null default 'todo',
  completed_at timestamptz,
  override_title text,
  override_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_occurrences_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete cascade,
  unique nulls not distinct (task_id, scheduled_date, scheduled_time)
);

create table public.assignment_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_subtasks_title_not_blank check (length(btrim(title)) > 0),
  constraint assignment_subtasks_sort_order check (sort_order >= 0),
  constraint assignment_subtasks_assignment_owner_fk
    foreign key (assignment_id, user_id)
    references public.assignments(id, user_id)
    on delete cascade
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  event_type public.calendar_event_type not null default 'personal_event',
  course_id uuid,
  location text,
  meeting_url text,
  reminder_at timestamptz,
  repeat_rule jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_title_not_blank check (length(btrim(title)) > 0),
  constraint calendar_events_end_after_start check (end_at >= start_at),
  constraint calendar_events_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id)
);

create table public.syllabus_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  estimated_hours numeric(8,2),
  completed_hours numeric(8,2) not null default 0,
  status public.syllabus_status not null default 'not_started',
  completion_percentage numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint syllabus_units_title_not_blank check (length(btrim(title)) > 0),
  constraint syllabus_units_sort_order check (sort_order >= 0),
  constraint syllabus_units_estimated_hours check (estimated_hours is null or estimated_hours >= 0),
  constraint syllabus_units_completed_hours check (completed_hours >= 0),
  constraint syllabus_units_progress check (completion_percentage between 0 and 100),
  constraint syllabus_units_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete cascade
);

create table public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  syllabus_unit_id uuid not null,
  title text not null,
  notes text,
  estimated_minutes integer,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint syllabus_topics_title_not_blank check (length(btrim(title)) > 0),
  constraint syllabus_topics_estimated_minutes check (estimated_minutes is null or estimated_minutes >= 0),
  constraint syllabus_topics_sort_order check (sort_order >= 0),
  constraint syllabus_topics_unit_owner_fk
    foreign key (syllabus_unit_id, user_id)
    references public.syllabus_units(id, user_id)
    on delete cascade
);

create table public.syllabus_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  snapshot_date date not null default current_date,
  completion_percentage numeric(5,2) not null,
  created_at timestamptz not null default now(),
  constraint syllabus_progress_snapshots_progress check (
    completion_percentage between 0 and 100
  ),
  constraint syllabus_progress_snapshots_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete cascade,
  unique (course_id, snapshot_date)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  description text,
  motivation text,
  current_level public.skill_level not null default 'beginner',
  target_level public.skill_level not null default 'intermediate',
  status public.skill_status not null default 'planned',
  target_date date,
  weekly_target_minutes integer not null default 0,
  progress_percentage numeric(5,2) not null default 0,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint skills_title_not_blank check (length(btrim(title)) > 0),
  constraint skills_weekly_target check (weekly_target_minutes between 0 and 10080),
  constraint skills_progress check (progress_percentage between 0 and 100)
);

create table public.skill_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null,
  title text not null,
  description text,
  target_date date,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_milestones_title_not_blank check (length(btrim(title)) > 0),
  constraint skill_milestones_sort_order check (sort_order >= 0),
  constraint skill_milestones_skill_owner_fk
    foreign key (skill_id, user_id)
    references public.skills(id, user_id)
    on delete cascade
);

create table public.skill_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null,
  title text not null,
  resource_type public.resource_type not null default 'other',
  url text,
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_resources_title_not_blank check (length(btrim(title)) > 0),
  constraint skill_resources_skill_owner_fk
    foreign key (skill_id, user_id)
    references public.skills(id, user_id)
    on delete cascade
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid,
  task_id uuid,
  skill_id uuid,
  session_type public.study_session_type not null default 'other',
  status public.study_session_status not null default 'completed',
  title text not null,
  started_at timestamptz not null,
  last_resumed_at timestamptz,
  paused_at timestamptz,
  ended_at timestamptz,
  accumulated_seconds integer not null default 0,
  duration_minutes integer not null default 0,
  focus_rating smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_title_not_blank check (length(btrim(title)) > 0),
  constraint study_sessions_accumulated_seconds check (accumulated_seconds >= 0),
  constraint study_sessions_duration check (duration_minutes >= 0),
  constraint study_sessions_focus_rating check (
    focus_rating is null or focus_rating between 1 and 5
  ),
  constraint study_sessions_end_after_start check (
    ended_at is null or ended_at >= started_at
  ),
  constraint study_sessions_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id),
  constraint study_sessions_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete set null (task_id),
  constraint study_sessions_skill_owner_fk
    foreign key (skill_id, user_id)
    references public.skills(id, user_id)
    on delete set null (skill_id)
);

create table public.reading_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  total_pages integer not null,
  current_page integer not null default 0,
  start_date date,
  target_completion_date date,
  status public.reading_status not null default 'want_to_read',
  reading_minutes integer not null default 0,
  notes text,
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint reading_items_title_not_blank check (length(btrim(title)) > 0),
  constraint reading_items_total_pages check (total_pages > 0),
  constraint reading_items_current_page check (
    current_page between 0 and total_pages
  ),
  constraint reading_items_minutes check (reading_minutes >= 0)
);

create table public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_item_id uuid not null,
  logged_at timestamptz not null default now(),
  pages_read integer not null default 0,
  minutes_read integer not null default 0,
  start_page integer,
  end_page integer,
  notes text,
  created_at timestamptz not null default now(),
  constraint reading_logs_pages check (pages_read >= 0),
  constraint reading_logs_minutes check (minutes_read >= 0),
  constraint reading_logs_page_range check (
    start_page is null
    or end_page is null
    or end_page >= start_page
  ),
  constraint reading_logs_item_owner_fk
    foreign key (reading_item_id, user_id)
    references public.reading_items(id, user_id)
    on delete cascade
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type public.transaction_type not null,
  category text not null,
  amount numeric(12,2) not null,
  currency varchar(3) not null default 'BDT',
  transaction_date date not null default current_date,
  description text,
  payment_method text,
  recurring boolean not null default false,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_category_not_blank check (length(btrim(category)) > 0),
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_currency check (currency ~ '^[A-Z]{3}$')
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_month date not null,
  category text,
  amount numeric(12,2) not null,
  currency varchar(3) not null default 'BDT',
  alert_threshold_percent smallint not null default 80,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_month_first_day check (
    budget_month = date_trunc('month', budget_month)::date
  ),
  constraint budgets_amount_positive check (amount > 0),
  constraint budgets_currency check (currency ~ '^[A-Z]{3}$'),
  constraint budgets_alert_threshold check (alert_threshold_percent between 1 and 100)
);

create unique index budgets_user_month_category_unique
  on public.budgets (
    user_id,
    budget_month,
    coalesce(category, '__overall__')
  );

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  frequency_type public.habit_frequency not null default 'daily',
  selected_weekdays smallint[] not null default '{}',
  target_value numeric(10,2) not null default 1,
  target_unit text not null default 'times',
  reminder_time time,
  start_date date not null default current_date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint habits_title_not_blank check (length(btrim(title)) > 0),
  constraint habits_weekdays check (
    selected_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
  ),
  constraint habits_target_value check (target_value > 0)
);

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null,
  completion_date date not null,
  completed_value numeric(10,2) not null default 1,
  completed boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_completions_value check (completed_value >= 0),
  constraint habit_completions_habit_owner_fk
    foreign key (habit_id, user_id)
    references public.habits(id, user_id)
    on delete cascade,
  unique (habit_id, completion_date)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid,
  title text not null,
  content text not null default '',
  plain_text_preview text not null default '',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_title_not_blank check (length(btrim(title)) > 0),
  constraint notes_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text,
  read boolean not null default false,
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_type_not_blank check (length(btrim(type)) > 0),
  constraint notifications_title_not_blank check (length(btrim(title)) > 0)
);

create unique index notifications_user_source_key_unique
  on public.notifications (user_id, source_key)
  where source_key is not null;

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  entity_type text not null,
  entity_id uuid,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_logs_type_not_blank check (length(btrim(activity_type)) > 0),
  constraint activity_logs_entity_type_not_blank check (length(btrim(entity_type)) > 0),
  constraint activity_logs_title_not_blank check (length(btrim(title)) > 0)
);


-- ==================================================
-- 202607100003_triggers.sql
-- ==================================================

-- StudyFlow Phase 2: triggers and derived progress

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.refresh_syllabus_unit_progress(
  target_unit_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  topic_total integer;
  topic_completed integer;
  progress numeric(5,2);
begin
  select
    count(*)::integer,
    count(*) filter (where completed)::integer
  into topic_total, topic_completed
  from public.syllabus_topics
  where syllabus_unit_id = target_unit_id
    and user_id = target_user_id;

  progress := case
    when topic_total = 0 then 0
    else round((topic_completed::numeric / topic_total::numeric) * 100, 2)
  end;

  update public.syllabus_units
  set
    completion_percentage = progress,
    status = case
      when progress = 100 then 'completed'::public.syllabus_status
      when progress > 0 then 'in_progress'::public.syllabus_status
      else 'not_started'::public.syllabus_status
    end,
    updated_at = now()
  where id = target_unit_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.sync_syllabus_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_syllabus_unit_progress(
      old.syllabus_unit_id,
      old.user_id
    );
    return old;
  end if;

  perform public.refresh_syllabus_unit_progress(
    new.syllabus_unit_id,
    new.user_id
  );

  if tg_op = 'UPDATE'
    and (
      old.syllabus_unit_id is distinct from new.syllabus_unit_id
      or old.user_id is distinct from new.user_id
    )
  then
    perform public.refresh_syllabus_unit_progress(
      old.syllabus_unit_id,
      old.user_id
    );
  end if;

  return new;
end;
$$;

create trigger syllabus_topics_progress_trigger
  after insert or update or delete on public.syllabus_topics
  for each row execute procedure public.sync_syllabus_progress();

create or replace function public.refresh_skill_progress(
  target_skill_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  milestone_total integer;
  milestone_completed integer;
  progress numeric(5,2);
begin
  select
    count(*)::integer,
    count(*) filter (where completed)::integer
  into milestone_total, milestone_completed
  from public.skill_milestones
  where skill_id = target_skill_id
    and user_id = target_user_id;

  progress := case
    when milestone_total = 0 then 0
    else round((milestone_completed::numeric / milestone_total::numeric) * 100, 2)
  end;

  update public.skills
  set
    progress_percentage = progress,
    status = case
      when progress = 100 then 'completed'::public.skill_status
      when progress > 0 and status = 'planned'::public.skill_status
        then 'learning'::public.skill_status
      else status
    end,
    updated_at = now()
  where id = target_skill_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.sync_skill_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_skill_progress(old.skill_id, old.user_id);
    return old;
  end if;

  perform public.refresh_skill_progress(new.skill_id, new.user_id);

  if tg_op = 'UPDATE'
    and (
      old.skill_id is distinct from new.skill_id
      or old.user_id is distinct from new.user_id
    )
  then
    perform public.refresh_skill_progress(old.skill_id, old.user_id);
  end if;

  return new;
end;
$$;

create trigger skill_milestones_progress_trigger
  after insert or update or delete on public.skill_milestones
  for each row execute procedure public.sync_skill_progress();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_preferences',
    'courses',
    'assignments',
    'tasks',
    'task_subtasks',
    'task_occurrences',
    'assignment_subtasks',
    'calendar_events',
    'syllabus_units',
    'syllabus_topics',
    'skills',
    'skill_milestones',
    'skill_resources',
    'study_sessions',
    'reading_items',
    'transactions',
    'budgets',
    'habits',
    'habit_completions',
    'notes',
    'notifications'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;


-- ==================================================
-- 202607100004_rls_policies.sql
-- ==================================================

-- StudyFlow Phase 2: Row Level Security policies

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_preferences',
    'courses',
    'assignments',
    'tasks',
    'task_subtasks',
    'task_occurrences',
    'assignment_subtasks',
    'calendar_events',
    'syllabus_units',
    'syllabus_topics',
    'syllabus_progress_snapshots',
    'skills',
    'skill_milestones',
    'skill_resources',
    'study_sessions',
    'reading_items',
    'reading_logs',
    'transactions',
    'budgets',
    'habits',
    'habit_completions',
    'notes',
    'notifications',
    'activity_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_preferences',
    'courses',
    'assignments',
    'tasks',
    'task_subtasks',
    'task_occurrences',
    'assignment_subtasks',
    'calendar_events',
    'syllabus_units',
    'syllabus_topics',
    'syllabus_progress_snapshots',
    'skills',
    'skill_milestones',
    'skill_resources',
    'study_sessions',
    'reading_items',
    'reading_logs',
    'transactions',
    'budgets',
    'habits',
    'habit_completions',
    'notes',
    'notifications'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own',
      table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own',
      table_name
    );
  end loop;
end;
$$;

-- Activity logs are append-only from the user's perspective.
create policy "activity_logs_select_own"
on public.activity_logs for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "activity_logs_insert_own"
on public.activity_logs for insert
to authenticated
with check ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on schema public to authenticated;


-- ==================================================
-- 202607100005_indexes_and_views.sql
-- ==================================================

-- StudyFlow Phase 2: indexes and security-invoker views

create index courses_user_id_idx on public.courses(user_id);
create index assignments_user_due_idx on public.assignments(user_id, due_date, due_time);
create index assignments_user_status_idx on public.assignments(user_id, submission_status);
create index tasks_user_due_idx on public.tasks(user_id, due_date, due_time);
create index tasks_user_status_idx on public.tasks(user_id, status);
create index tasks_user_category_idx on public.tasks(user_id, category);
create index tasks_user_priority_idx on public.tasks(user_id, priority);
create index task_subtasks_task_idx on public.task_subtasks(task_id, sort_order);
create index task_occurrences_user_date_idx on public.task_occurrences(user_id, scheduled_date);
create index assignment_subtasks_assignment_idx on public.assignment_subtasks(assignment_id, sort_order);
create index calendar_events_user_start_idx on public.calendar_events(user_id, start_at);
create index syllabus_units_course_idx on public.syllabus_units(course_id, sort_order);
create index syllabus_topics_unit_idx on public.syllabus_topics(syllabus_unit_id, sort_order);
create index syllabus_snapshots_course_date_idx
  on public.syllabus_progress_snapshots(course_id, snapshot_date);
create index study_sessions_user_started_idx on public.study_sessions(user_id, started_at desc);
create index study_sessions_course_idx on public.study_sessions(course_id, started_at desc);
create index reading_items_user_status_idx on public.reading_items(user_id, status);
create index reading_logs_item_logged_idx on public.reading_logs(reading_item_id, logged_at desc);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index transactions_user_category_idx on public.transactions(user_id, category);
create index budgets_user_month_idx on public.budgets(user_id, budget_month);
create index skills_user_status_idx on public.skills(user_id, status);
create index skill_milestones_skill_idx on public.skill_milestones(skill_id, sort_order);
create index skill_resources_skill_idx on public.skill_resources(skill_id);
create index habits_user_archived_idx on public.habits(user_id, archived);
create index habit_completions_habit_date_idx
  on public.habit_completions(habit_id, completion_date desc);
create index notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index notes_tags_idx on public.notes using gin(tags);
create index notifications_user_read_idx on public.notifications(user_id, read, created_at desc);
create index activity_logs_user_created_idx on public.activity_logs(user_id, created_at desc);

create unique index study_sessions_one_active_timer_per_user
  on public.study_sessions(user_id)
  where status in ('running', 'paused');

create index tasks_search_idx
  on public.tasks
  using gin (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  );

create index assignments_search_idx
  on public.assignments
  using gin (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  );

create index notes_search_idx
  on public.notes
  using gin (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(content, '')
    )
  );

create or replace view public.course_progress
with (security_invoker = true)
as
select
  c.id as course_id,
  c.user_id,
  c.course_code,
  c.course_name,
  count(st.id)::integer as topic_count,
  count(st.id) filter (where st.completed)::integer as completed_topic_count,
  case
    when count(st.id) = 0 then 0::numeric
    else round(
      (
        count(st.id) filter (where st.completed)::numeric
        / count(st.id)::numeric
      ) * 100,
      2
    )
  end as completion_percentage
from public.courses c
left join public.syllabus_units su
  on su.course_id = c.id
  and su.user_id = c.user_id
left join public.syllabus_topics st
  on st.syllabus_unit_id = su.id
  and st.user_id = c.user_id
group by c.id, c.user_id, c.course_code, c.course_name;

grant select on public.course_progress to authenticated;
