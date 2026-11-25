-- Database tests for ATLAS ACADÊMICO. Each block raises an exception on failure.
\set ON_ERROR_STOP 1

-- Two users. The signup trigger must create profile + preferences.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"full_name":"Usuária A"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{}');

do $$
begin
  if (select time_zone from public.user_preferences where user_id = '11111111-1111-1111-1111-111111111111') <> 'America/Sao_Paulo' then
    raise exception 'new preferences should default to America/Sao_Paulo';
  end if;
  if (select currency_code from public.user_preferences where user_id = '11111111-1111-1111-1111-111111111111') <> 'BRL' then
    raise exception 'new preferences should default to BRL';
  end if;
end $$;

-- ---------------------------------------------------------------- user A
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;

insert into public.courses (id, user_id, course_code, course_name, instructor_name)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ANA1', 'Anatomia Humana', 'Prof. Silva');

insert into public.lessons (id, user_id, course_id, lesson_date, title, topic, unit, professor)
values ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-0000-0000-0000-000000000001', '2026-11-20', 'Sistema urinário', 'Rins', 'Unidade 3', 'Prof. Silva');

insert into public.notes (id, user_id, course_id, lesson_id, title, content, content_format, plain_text, memorize, tags)
values ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002',
        'Aula — Rins', '<p>A artéria renal origina-se da aorta abdominal.</p>', 'html',
        'A artéria renal origina-se da aorta abdominal.', 'Limites da bexiga', array['urinário']);

insert into public.materials (user_id, note_id, lesson_id, title, category, storage_path, file_name, mime_type, size_bytes)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
        'aaaaaaaa-0000-0000-0000-000000000002', 'Slides rins', 'slides',
        '11111111-1111-1111-1111-111111111111/notes/x/slides.pdf', 'slides.pdf', 'application/pdf', 1000);

-- Accent-insensitive search finds the note by content
do $$
declare n integer;
begin
  select count(*) into n from public.atlas_search('ARTERIA renal') where kind = 'note';
  if n <> 1 then raise exception 'search should find the note (found %)', n; end if;
  select count(*) into n from public.atlas_search('bexiga') where kind = 'note';
  if n <> 1 then raise exception 'search should cover structured fields (found %)', n; end if;
  select count(*) into n from public.atlas_search('anatomia');
  if n < 2 then raise exception 'search should find course and related note (found %)', n; end if;
  select count(*) into n from public.atlas_search('   ');
  if n <> 0 then raise exception 'blank search must return nothing'; end if;
end $$;

-- A material path outside the user's folder is rejected by a CHECK constraint
do $$
begin
  begin
    insert into public.materials (user_id, title, storage_path)
    values ('11111111-1111-1111-1111-111111111111', 'x', '22222222-2222-2222-2222-222222222222/a.pdf');
    raise exception 'foreign storage path must be rejected';
  exception when check_violation then null;
  end;
end $$;

-- Storage policies: own folder OK, foreign folder denied
insert into storage.objects (bucket_id, name) values ('atlas-files', '11111111-1111-1111-1111-111111111111/notes/x/slides.pdf');
do $$
begin
  begin
    insert into storage.objects (bucket_id, name) values ('atlas-files', '22222222-2222-2222-2222-222222222222/evil.pdf');
    raise exception 'storage insert into another user folder must fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- user B
do $$ begin perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false); end $$;

do $$
declare n integer;
begin
  select count(*) into n from public.notes;      if n <> 0 then raise exception 'B sees A notes'; end if;
  select count(*) into n from public.lessons;    if n <> 0 then raise exception 'B sees A lessons'; end if;
  select count(*) into n from public.materials;  if n <> 0 then raise exception 'B sees A materials'; end if;
  select count(*) into n from storage.objects;   if n <> 0 then raise exception 'B sees A files'; end if;
  select count(*) into n from public.atlas_search('renal');
  if n <> 0 then raise exception 'B search leaks A records'; end if;
end $$;

-- B cannot attach a lesson to A's course (composite owner FK)
do $$
begin
  begin
    insert into public.lessons (user_id, course_id, lesson_date, title)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-11-21', 'x');
    raise exception 'cross-account course link must fail';
  exception when foreign_key_violation then null;
  end;
end $$;

-- B cannot insert rows owned by A
do $$
begin
  begin
    insert into public.lessons (user_id, lesson_date, title)
    values ('11111111-1111-1111-1111-111111111111', '2026-11-21', 'x');
    raise exception 'insert as another user must fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B cannot update/delete A rows (silently affects 0 rows under RLS)
do $$
declare n integer;
begin
  update public.notes set title = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000003';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B updated A note'; end if;
  delete from public.lessons where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B deleted A lesson'; end if;
end $$;

-- ---------------------------------------------------------------- anon
reset role;
set role anon;
do $$
begin
  begin
    perform 1 from public.notes;
    raise exception 'anon must not read notes';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Deleting a lesson keeps the note (lesson_id set null), deleting a note keeps the material record
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
delete from public.lessons where id = 'aaaaaaaa-0000-0000-0000-000000000002';
do $$
begin
  if (select lesson_id from public.notes where id = 'aaaaaaaa-0000-0000-0000-000000000003') is not null then
    raise exception 'note.lesson_id should be nulled';
  end if;
  if (select course_id from public.notes where id = 'aaaaaaaa-0000-0000-0000-000000000003') is null then
    raise exception 'note.course_id must be preserved when lesson is deleted';
  end if;
end $$;
reset role;

select 'ok' as atlas_db_tests;

-- Search also covers legacy modules (skills / study sessions / finance)
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
insert into public.skills (user_id, title, description) values ('11111111-1111-1111-1111-111111111111', 'Sutura', 'Pontos simples');
insert into public.transactions (user_id, transaction_type, category, amount, description) values ('11111111-1111-1111-1111-111111111111', 'expense', 'Livros', 120, 'Netter atlas');
do $$
declare n integer;
begin
  select count(*) into n from public.atlas_search('sutura') where kind = 'skill';
  if n <> 1 then raise exception 'search should find skills'; end if;
  select count(*) into n from public.atlas_search('netter') where kind = 'finance';
  if n <> 1 then raise exception 'search should find transactions'; end if;
end $$;
reset role;
select 'ok' as atlas_search_legacy_tests;

-- Etapa 2: semesters, course links, exam materials, new event types
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
insert into public.academic_semesters (id, user_id, semester_name, start_date, end_date, is_current)
values ('aaaaaaaa-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', '2026.2', '2026-08-01', '2026-12-15', true);
update public.courses set semester_id = 'aaaaaaaa-0000-0000-0000-0000000000a1', description = 'Ementa' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$
begin
  begin
    insert into public.academic_semesters (user_id, semester_name, is_current) values ('11111111-1111-1111-1111-111111111111', '2027.1', true);
    raise exception 'only one current semester per user';
  exception when unique_violation then null;
  end;
  begin
    insert into public.academic_semesters (user_id, semester_name, start_date, end_date) values ('11111111-1111-1111-1111-111111111111', 'x', '2026-02-01', '2026-01-01');
    raise exception 'end before start must fail';
  exception when check_violation then null;
  end;
end $$;
insert into public.calendar_events (user_id, title, start_at, end_at, event_type)
values ('11111111-1111-1111-1111-111111111111', 'Seminário de embriologia', now(), now(), 'seminar');
insert into public.exam_schedules (id, user_id, title, exam_date) values ('aaaaaaaa-0000-0000-0000-0000000000e1', '11111111-1111-1111-1111-111111111111', 'P1 Anatomia', '2026-12-01');
insert into public.materials (user_id, exam_id, title, external_url, category) values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'Gabarito', 'https://example.org/g', 'reference');
delete from public.academic_semesters where id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
do $$
begin
  if (select semester_id from public.courses where id = 'aaaaaaaa-0000-0000-0000-000000000001') is not null then
    raise exception 'deleting a semester should only unlink its courses';
  end if;
end $$;
do $$ begin perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false); end $$;
do $$
begin
  begin
    insert into public.materials (user_id, exam_id, title, external_url) values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'x', 'https://x.org');
    raise exception 'cross-account exam link must fail';
  exception when foreign_key_violation then null;
  end;
end $$;
reset role;
select 'ok' as atlas_stage2_tests;
