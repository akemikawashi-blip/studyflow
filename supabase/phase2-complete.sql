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


-- ==================================================
-- 202607130001_academic_tools.sql
-- ==================================================

-- StudyFlow Phase 3: timetable, exam schedule, GPA and data export support

create table if not exists public.class_timetable_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid,
  title text not null,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  location text,
  instructor_name text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint class_timetable_title_not_blank check (length(btrim(title)) > 0),
  constraint class_timetable_day_range check (day_of_week between 0 and 6),
  constraint class_timetable_end_after_start check (end_time > start_time),
  constraint class_timetable_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id)
);

create table if not exists public.exam_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid,
  title text not null,
  exam_type text not null default 'Exam',
  exam_date date not null,
  start_time time,
  end_time time,
  location text,
  seat_info text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint exam_schedules_title_not_blank check (length(btrim(title)) > 0),
  constraint exam_schedules_type_not_blank check (length(btrim(exam_type)) > 0),
  constraint exam_schedules_time_order check (
    start_time is null or end_time is null or end_time > start_time
  ),
  constraint exam_schedules_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id)
);

create table if not exists public.academic_semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_name text not null,
  academic_year text,
  gpa numeric(4,2) not null,
  total_credits numeric(6,2) not null default 0,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint academic_semesters_name_not_blank check (length(btrim(semester_name)) > 0),
  constraint academic_semesters_gpa_range check (gpa between 0 and 4),
  constraint academic_semesters_credits_nonnegative check (total_credits >= 0),
  constraint academic_semesters_sort_order_nonnegative check (sort_order >= 0)
);

drop trigger if exists class_timetable_entries_set_updated_at on public.class_timetable_entries;
create trigger class_timetable_entries_set_updated_at
before update on public.class_timetable_entries
for each row execute procedure public.set_updated_at();

drop trigger if exists exam_schedules_set_updated_at on public.exam_schedules;
create trigger exam_schedules_set_updated_at
before update on public.exam_schedules
for each row execute procedure public.set_updated_at();

drop trigger if exists academic_semesters_set_updated_at on public.academic_semesters;
create trigger academic_semesters_set_updated_at
before update on public.academic_semesters
for each row execute procedure public.set_updated_at();

alter table public.class_timetable_entries enable row level security;
alter table public.exam_schedules enable row level security;
alter table public.academic_semesters enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'class_timetable_entries',
    'exam_schedules',
    'academic_semesters'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);

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

create index if not exists class_timetable_user_day_idx
  on public.class_timetable_entries(user_id, day_of_week, start_time);
create index if not exists exam_schedules_user_date_idx
  on public.exam_schedules(user_id, exam_date, start_time);
create index if not exists academic_semesters_user_sort_idx
  on public.academic_semesters(user_id, sort_order, created_at);

grant select, insert, update, delete on public.class_timetable_entries to authenticated;
grant select, insert, update, delete on public.exam_schedules to authenticated;
grant select, insert, update, delete on public.academic_semesters to authenticated;


-- ==================================================
-- 202611250001_atlas_foundation.sql
-- ==================================================

-- ATLAS ACADÊMICO — Etapa 1: fundação acadêmica
--
-- Additive and idempotent: safe to run on an existing StudyFlow database and
-- safe to run more than once. No existing table is replaced or duplicated.
--
-- Adds:
--   * courses.archived / courses.sort_order            (disciplinas arquiváveis)
--   * public.lessons                                    (histórico de aulas)
--   * notes: lesson link, rich content, structured fields (caderno digital)
--   * public.materials                                  (arquivos e materiais)
--   * private Storage bucket "atlas-files" + per-user policies
--   * public.atlas_search()                             (busca global sem acentos)
--   * Brazilian defaults for new user preferences

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Preferences: Brazilian defaults for NEW rows only (existing rows untouched)
-- ---------------------------------------------------------------------------

alter table public.user_preferences alter column currency_code set default 'BRL';
alter table public.user_preferences alter column time_zone set default 'America/Sao_Paulo';
alter table public.user_preferences alter column date_format set default 'dd/MM/yyyy';
alter table public.user_preferences alter column week_starts_on set default 1;

-- ---------------------------------------------------------------------------
-- Courses (disciplinas)
-- ---------------------------------------------------------------------------

alter table public.courses add column if not exists archived boolean not null default false;
alter table public.courses add column if not exists sort_order integer not null default 0;

-- ---------------------------------------------------------------------------
-- Lessons (aulas)
-- ---------------------------------------------------------------------------

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid,
  lesson_date date not null,
  title text not null,
  topic text,
  unit text,
  professor text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint lessons_title_not_blank check (length(btrim(title)) > 0),
  constraint lessons_title_length check (char_length(title) <= 200),
  constraint lessons_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id)
);

-- ---------------------------------------------------------------------------
-- Notes (caderno digital) — extends the existing table
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notes_id_user_unique'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes add constraint notes_id_user_unique unique (id, user_id);
  end if;
end;
$$;

alter table public.notes add column if not exists lesson_id uuid;
alter table public.notes add column if not exists content_format text not null default 'plain';
alter table public.notes add column if not exists plain_text text not null default '';
alter table public.notes add column if not exists key_points text;
alter table public.notes add column if not exists memorize text;
alter table public.notes add column if not exists doubts text;
alter table public.notes add column if not exists professor_remarks text;
alter table public.notes add column if not exists references_text text;

-- Legacy notes stored plain text in "content"; make it searchable.
update public.notes
set plain_text = content
where content_format = 'plain'
  and plain_text = ''
  and content <> '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notes_content_format_check'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_content_format_check
      check (content_format in ('plain', 'html'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notes_lesson_owner_fk'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_lesson_owner_fk
      foreign key (lesson_id, user_id)
      references public.lessons(id, user_id)
      on delete set null (lesson_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Materials (biblioteca / anexos)
-- ---------------------------------------------------------------------------

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid,
  lesson_id uuid,
  note_id uuid,
  title text not null,
  category text not null default 'document',
  description text,
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  external_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint materials_title_not_blank check (length(btrim(title)) > 0),
  constraint materials_category check (
    category in (
      'pdf', 'slides', 'photo', 'image', 'book', 'article', 'summary',
      'mind_map', 'document', 'reference', 'other'
    )
  ),
  constraint materials_has_source check (
    storage_path is not null or external_url is not null
  ),
  constraint materials_storage_path_owner check (
    storage_path is null or split_part(storage_path, '/', 1) = user_id::text
  ),
  constraint materials_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint materials_external_url_scheme check (
    external_url is null or external_url ~* '^https?://'
  ),
  constraint materials_course_owner_fk
    foreign key (course_id, user_id)
    references public.courses(id, user_id)
    on delete set null (course_id),
  constraint materials_lesson_owner_fk
    foreign key (lesson_id, user_id)
    references public.lessons(id, user_id)
    on delete set null (lesson_id),
  constraint materials_note_owner_fk
    foreign key (note_id, user_id)
    references public.notes(id, user_id)
    on delete set null (note_id)
);

create unique index if not exists materials_storage_path_unique
  on public.materials(storage_path)
  where storage_path is not null;

-- ---------------------------------------------------------------------------
-- Triggers, RLS, grants, indexes
-- ---------------------------------------------------------------------------

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
before update on public.lessons
for each row execute procedure public.set_updated_at();

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
before update on public.materials
for each row execute procedure public.set_updated_at();

alter table public.lessons enable row level security;
alter table public.materials enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['lessons', 'materials']
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end;
$$;

revoke all on public.lessons from anon;
revoke all on public.materials from anon;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.materials to authenticated;

create index if not exists lessons_user_date_idx on public.lessons(user_id, lesson_date desc);
create index if not exists lessons_course_date_idx on public.lessons(course_id, lesson_date desc);
create index if not exists notes_lesson_idx on public.notes(lesson_id);
create index if not exists notes_user_course_idx on public.notes(user_id, course_id);
create index if not exists materials_user_created_idx on public.materials(user_id, created_at desc);
create index if not exists materials_note_idx on public.materials(note_id);
create index if not exists materials_lesson_idx on public.materials(lesson_id);
create index if not exists materials_course_idx on public.materials(course_id);
create index if not exists courses_user_archived_idx on public.courses(user_id, archived, sort_order);

-- ---------------------------------------------------------------------------
-- Storage: private bucket, each user can only touch "<their uuid>/..."
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'atlas-files',
  'atlas-files',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.presentation',
    'text/plain', 'text/markdown', 'text/csv'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "atlas_files_select_own" on storage.objects;
drop policy if exists "atlas_files_insert_own" on storage.objects;
drop policy if exists "atlas_files_update_own" on storage.objects;
drop policy if exists "atlas_files_delete_own" on storage.objects;

create policy "atlas_files_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'atlas-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "atlas_files_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'atlas-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "atlas_files_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'atlas-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'atlas-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "atlas_files_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'atlas-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ---------------------------------------------------------------------------
-- Global search (accent- and case-insensitive). SECURITY INVOKER: RLS applies,
-- so a user only ever searches their own rows.
-- ---------------------------------------------------------------------------

create or replace function public.atlas_normalize(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')));
$$;

create or replace function public.atlas_snippet(body text, term text, radius integer default 90)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  with source as (
    select regexp_replace(coalesce(body, ''), '\s+', ' ', 'g') as txt
  ), located as (
    select txt, strpos(public.atlas_normalize(txt), public.atlas_normalize(term)) as pos
    from source
  )
  select case
    when txt = '' then ''
    when pos = 0 or term = '' then left(txt, radius * 2)
    else
      (case when pos > radius then '…' else '' end)
      || substr(txt, greatest(pos - radius, 1), radius * 2 + char_length(term))
      || (case when pos + radius + char_length(term) < char_length(txt) then '…' else '' end)
  end
  from located;
$$;

create or replace function public.atlas_search(search_query text, max_results integer default 60)
returns table (
  kind text,
  id uuid,
  title text,
  snippet text,
  occurred_on date,
  course_id uuid,
  parent_id uuid,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  terms text[];
  first_term text;
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  terms := array(
    select t
    from unnest(regexp_split_to_array(public.atlas_normalize(btrim(coalesce(search_query, ''))), '\s+')) as t
    where t <> ''
    limit 8
  );

  if coalesce(array_length(terms, 1), 0) = 0 then
    return;
  end if;

  first_term := terms[1];

  return query
  with candidates as (
    select 'note'::text as kind, n.id, n.title,
      concat_ws(' ', n.plain_text, n.key_points, n.memorize, n.doubts, n.professor_remarks, n.references_text) as body,
      concat_ws(' ', n.title, n.plain_text, n.key_points, n.memorize, n.doubts, n.professor_remarks, n.references_text, array_to_string(n.tags, ' '), l.topic, l.unit, l.professor, c.course_name, c.course_code) as haystack,
      coalesce(l.lesson_date, n.updated_at::date) as occurred_on, n.course_id, n.lesson_id as parent_id, n.updated_at
    from public.notes n
    left join public.lessons l on l.id = n.lesson_id
    left join public.courses c on c.id = n.course_id
    where n.user_id = uid
    union all
    select 'lesson', l.id, l.title,
      concat_ws(' ', l.topic, l.unit, l.professor, l.summary),
      concat_ws(' ', l.title, l.topic, l.unit, l.professor, l.summary, c.course_name, c.course_code),
      l.lesson_date, l.course_id, null::uuid, l.updated_at
    from public.lessons l
    left join public.courses c on c.id = l.course_id
    where l.user_id = uid
    union all
    select 'course', c.id, concat_ws(' — ', c.course_code, c.course_name),
      concat_ws(' · ', c.instructor_name, c.semester),
      concat_ws(' ', c.course_code, c.course_name, c.instructor_name, c.semester),
      null::date, c.id, null::uuid, c.updated_at
    from public.courses c
    where c.user_id = uid
    union all
    select 'material', m.id, m.title,
      concat_ws(' ', m.description, m.file_name),
      concat_ws(' ', m.title, m.description, m.file_name, m.category, array_to_string(m.tags, ' '), c.course_name),
      m.created_at::date, m.course_id, m.note_id, m.updated_at
    from public.materials m
    left join public.courses c on c.id = m.course_id
    where m.user_id = uid
    union all
    select 'task', t.id, t.title, coalesce(t.description, ''),
      concat_ws(' ', t.title, t.description),
      t.due_date, t.course_id, null::uuid, t.updated_at
    from public.tasks t
    where t.user_id = uid
    union all
    select 'assignment', a.id, a.title, coalesce(a.description, ''),
      concat_ws(' ', a.title, a.description, a.assignment_type::text, c.course_name),
      a.due_date, a.course_id, null::uuid, a.updated_at
    from public.assignments a
    left join public.courses c on c.id = a.course_id
    where a.user_id = uid
    union all
    select 'exam', e.id, e.title, concat_ws(' ', e.exam_type, e.notes),
      concat_ws(' ', e.title, e.exam_type, e.notes, e.location, c.course_name),
      e.exam_date, e.course_id, null::uuid, e.updated_at
    from public.exam_schedules e
    left join public.courses c on c.id = e.course_id
    where e.user_id = uid
    union all
    select 'event', ev.id, ev.title, coalesce(ev.description, ''),
      concat_ws(' ', ev.title, ev.description, ev.location),
      ev.start_at::date, ev.course_id, null::uuid, ev.updated_at
    from public.calendar_events ev
    where ev.user_id = uid
    union all
    select 'skill', sk.id, sk.title, concat_ws(' ', sk.description, sk.next_action),
      concat_ws(' ', sk.title, sk.category, sk.description, sk.next_action, sk.motivation),
      sk.target_date, null::uuid, null::uuid, sk.updated_at
    from public.skills sk
    where sk.user_id = uid
    union all
    select 'study', ss.id, ss.title, coalesce(ss.notes, ''),
      concat_ws(' ', ss.title, ss.notes, ss.session_type::text),
      ss.started_at::date, ss.course_id, null::uuid, ss.updated_at
    from public.study_sessions ss
    where ss.user_id = uid
    union all
    select 'finance', tr.id, coalesce(tr.description, tr.category), concat_ws(' · ', tr.category, tr.payment_method),
      concat_ws(' ', tr.description, tr.category, tr.payment_method),
      tr.transaction_date, null::uuid, null::uuid, tr.updated_at
    from public.transactions tr
    where tr.user_id = uid
  ), matched as (
    select cand.*,
      public.atlas_normalize(cand.haystack) as norm,
      public.atlas_normalize(cand.title) as norm_title
    from candidates cand
  )
  select m.kind, m.id, m.title,
    public.atlas_snippet(m.body, first_term) as snippet,
    m.occurred_on, m.course_id, m.parent_id, m.updated_at
  from matched m
  where (
    select bool_and(strpos(m.norm, t) > 0) from unnest(terms) as t
  )
  order by
    (select count(*) from unnest(terms) as t where strpos(m.norm_title, t) > 0) desc,
    m.updated_at desc
  limit least(greatest(coalesce(max_results, 60), 1), 200);
end;
$$;

revoke all on function public.atlas_search(text, integer) from public, anon;
grant execute on function public.atlas_search(text, integer) to authenticated;
grant execute on function public.atlas_normalize(text) to authenticated;
grant execute on function public.atlas_snippet(text, text, integer) to authenticated;


-- ==================================================
-- 202611260001_atlas_courses_calendar.sql
-- ==================================================

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
