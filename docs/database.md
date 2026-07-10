# Database architecture

## Ownership

Every user-owned row stores `user_id`, except `profiles`, whose primary key is the authenticated user's UUID.

Child records use composite foreign keys such as `(task_id, user_id)` to prevent a child row from being linked to a parent owned by another account.

## Security

RLS is enabled on all application tables. Policies target the `authenticated` role and compare the row owner with `(select auth.uid())`.

The application also includes explicit authenticated-user filters in Server Actions. RLS remains the final enforcement boundary.

## Derived values

- Syllabus unit percentage is recalculated when topics change.
- Skill percentage is recalculated when milestones change.
- Course coverage is exposed through a `security_invoker` view.
- Financial totals and task statistics are calculated from source rows instead of stored as editable totals.

## Money

Transaction and budget amounts use PostgreSQL `numeric(12,2)`, not floating-point storage.

## Recurring tasks

A recurring task template stores a JSON recurrence rule. Bounded instances are stored in `task_occurrences`, with a `UNIQUE NULLS NOT DISTINCT` constraint preventing duplicate all-day occurrences.
