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
