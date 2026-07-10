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
