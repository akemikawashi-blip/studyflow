-- Optional development seed.
--
-- 1. Create and verify a user through the StudyFlow sign-up page.
-- 2. Copy that user's UUID from Authentication → Users.
-- 3. Replace 00000000-0000-0000-0000-000000000000 below.
-- 4. Run this file in the Supabase SQL Editor.
--
-- Do not run this seed in production.

do $$
declare
  demo_user uuid := '00000000-0000-0000-0000-000000000000';
  data_structures uuid := gen_random_uuid();
  database_systems uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where id = demo_user) then
    raise exception 'Replace demo_user with a real authenticated user UUID first.';
  end if;

  insert into public.courses (
    id, user_id, course_code, course_name, instructor_name, semester, credit_hours
  )
  values
    (data_structures, demo_user, 'CSE 220', 'Data Structures', 'Dr. Rahman', 'Fall 2026', 3),
    (database_systems, demo_user, 'CSE 230', 'Database Systems', 'Ms. Ahmed', 'Fall 2026', 3)
  on conflict do nothing;

  insert into public.tasks (
    user_id, title, category, priority, due_date, estimated_minutes, course_id
  )
  values
    (demo_user, 'Review linked lists', 'study', 'high', current_date, 60, data_structures),
    (demo_user, 'Complete SQL practice', 'study', 'medium', current_date + 1, 45, database_systems),
    (demo_user, 'Read Chapter 5', 'study', 'medium', current_date + 2, 40, data_structures),
    (demo_user, 'Prepare presentation slides', 'assignment', 'high', current_date + 4, 120, database_systems);

  insert into public.assignments (
    user_id, course_id, title, assignment_type, due_date, priority
  )
  values
    (demo_user, database_systems, 'Database normalization report', 'report', current_date + 7, 'high'),
    (demo_user, data_structures, 'Data structures lab', 'lab', current_date + 5, 'high');

  insert into public.skills (
    user_id, title, category, current_level, target_level, status, weekly_target_minutes
  )
  values
    (demo_user, 'React', 'Development', 'beginner', 'advanced', 'learning', 180),
    (demo_user, 'Public speaking', 'Communication', 'elementary', 'advanced', 'planned', 90),
    (demo_user, 'Academic writing', 'Academic', 'intermediate', 'advanced', 'learning', 120);

  insert into public.transactions (
    user_id, transaction_type, category, amount, transaction_date, description
  )
  values
    (demo_user, 'expense', 'Transport', 120.00, current_date, 'Campus commute'),
    (demo_user, 'expense', 'Lunch', 180.00, current_date, 'Lunch near campus'),
    (demo_user, 'expense', 'Books', 850.00, current_date - 2, 'Course reference book'),
    (demo_user, 'expense', 'Internet', 600.00, current_date - 4, 'Monthly internet bill');
end;
$$;
