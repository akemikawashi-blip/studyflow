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
