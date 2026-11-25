-- ATLAS ACADÊMICO — atualização do banco (cumulativa)
-- Cole este arquivo inteiro no Supabase → SQL Editor → Run.
-- Seguro para rodar mais de uma vez. Não apaga nem duplica dados existentes.

-- ==================================================  202611250001_atlas_foundation.sql

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

-- ==================================================  202611260001_atlas_courses_calendar.sql

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

-- ==================================================  202611270001_atlas_institution_import.sql

-- ATLAS ACADÊMICO — instituição por semestre e importação de calendários
-- Additive and idempotent.
--
-- * academic_semesters.institution: which university a semester belongs to,
--   so the history survives a transfer to another medical school.
-- * calendar_events.source: label of an imported set (e.g. "UENP 2027"), so a
--   whole institutional calendar can be reviewed or removed at once.
-- * calendar_events.end_at may now span several days (multi-day all-day items).
-- * New event category "holiday" (feriado / recesso).

alter table public.academic_semesters add column if not exists institution text;
alter table public.calendar_events add column if not exists source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'calendar_events_source_length' and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_source_length check (source is null or char_length(source) between 1 and 80);
  end if;
end;
$$;

create index if not exists calendar_events_user_source_idx on public.calendar_events(user_id, source) where source is not null;

alter type public.calendar_event_type add value if not exists 'holiday';
