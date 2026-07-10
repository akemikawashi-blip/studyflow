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
