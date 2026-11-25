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
