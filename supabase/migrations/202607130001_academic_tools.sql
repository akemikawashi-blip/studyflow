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
