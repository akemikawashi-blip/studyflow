import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Pin, Star, Trash2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ConfirmForm } from "@/components/shared/confirm-form";
import { PageHeader } from "@/components/shared/page-header";
import { deleteNoteAction, toggleNoteFlagAction } from "@/features/notes/actions/note-actions";
import { NewNoteDialog } from "@/features/notes/components/new-note-dialog";
import { NotebookFilters } from "@/features/notes/components/notebook-filters";
import { isNotebookView, type NotebookFilterValues, type NotebookView } from "@/features/notes/lib/notebook-views";
import { requireUser } from "@/lib/auth/current-user";
import { dateKey, formatKey } from "@/lib/dates";
import { getTimeZone } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Caderno" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

const isDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

type NoteItem = {
  id: string;
  title: string;
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  date: string;
  isLesson: boolean;
  topic: string | null;
  unit: string | null;
  professor: string | null;
  tags: string[];
  preview: string;
  favorite: boolean;
  pinned: boolean;
};

function groupNotes(items: NoteItem[], view: NotebookView) {
  const groups = new Map<string, { key: string; label: string; sort: string; items: NoteItem[] }>();
  const add = (key: string, label: string, sort: string, item: NoteItem) => {
    const group = groups.get(key) ?? { key, label, sort, items: [] };
    group.items.push(item);
    groups.set(key, group);
  };

  for (const item of items) {
    if (view === "course") add(item.courseId ?? "none", item.courseName ?? "Sem disciplina", item.courseName ? `0${item.courseName}` : "1", item);
    else if (view === "date") {
      const month = item.date.slice(0, 7);
      add(month, formatKey(`${month}-01`, { month: "long", year: "numeric" }), String(99_999_999 - Number(month.replace("-", ""))), item);
    } else if (view === "topic") add(item.topic ?? "none", item.topic ?? "Sem assunto definido", item.topic ? `0${item.topic.toLowerCase()}` : "1", item);
    else if (view === "professor") add(item.professor ?? "none", item.professor ?? "Sem professor definido", item.professor ? `0${item.professor.toLowerCase()}` : "1", item);
    else {
      if (item.tags.length === 0) add("none", "Sem palavras-chave", "1", item);
      for (const tag of item.tags) add(`t:${tag.toLowerCase()}`, tag, `0${tag.toLowerCase()}`, item);
    }
  }

  return [...groups.values()].sort((a, b) => a.sort.localeCompare(b.sort, "pt-BR"));
}

function NoteCard({ item, snippet }: { item: NoteItem; snippet?: string }) {
  return (
    <article className="group relative flex gap-3 rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card transition-colors hover:border-primary/40">
      <span className="mt-1 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.courseColor ?? "var(--outline-variant)" }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-on-surface-variant">{formatKey(item.date, { day: "2-digit", month: "short", year: "numeric" })}</span>
          {item.isLesson ? <span className="rounded bg-secondary-container px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-secondary-container">Aula</span> : null}
          {item.courseName ? <span className="truncate">{item.courseName}</span> : null}
          {item.pinned ? <Pin className="size-3 fill-current text-gold" aria-label="Fixada" /> : null}
          {item.favorite ? <Star className="size-3 fill-current text-gold" aria-label="Favorita" /> : null}
        </div>
        <h3 className="mt-1 font-display text-lg font-semibold leading-snug">
          <Link href={`/app/notes/${item.id}`} className="focus-ring rounded after:absolute after:inset-0 after:content-['']">
            {item.title}
          </Link>
        </h3>
        {item.topic || item.unit || item.professor ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{[item.topic, item.unit, item.professor].filter(Boolean).join(" · ")}</p>
        ) : null}
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">{snippet || item.preview || "Anotação vazia."}</p>
        {item.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 6).map((tag) => (
              <span key={tag} className="rounded-md bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative z-10 flex shrink-0 flex-col gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <form action={toggleNoteFlagAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="field" value="pinned" />
          <button type="submit" className="focus-ring grid size-8 place-items-center rounded-md hover:bg-surface-container-high" aria-label={item.pinned ? "Desafixar" : "Fixar"} title={item.pinned ? "Desafixar" : "Fixar"}>
            <Pin className={cn("size-4", item.pinned && "fill-current text-gold")} />
          </button>
        </form>
        <form action={toggleNoteFlagAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="field" value="favorite" />
          <button type="submit" className="focus-ring grid size-8 place-items-center rounded-md hover:bg-surface-container-high" aria-label={item.favorite ? "Remover dos favoritos" : "Favoritar"} title={item.favorite ? "Remover dos favoritos" : "Favoritar"}>
            <Star className={cn("size-4", item.favorite && "fill-current text-gold")} />
          </button>
        </form>
        <ConfirmForm action={deleteNoteAction} message={`Excluir a anotação “${item.title}”? Esta ação não pode ser desfeita.`}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="focus-ring grid size-8 place-items-center rounded-md text-destructive hover:bg-error-container/60" aria-label={`Excluir ${item.title}`} title="Excluir">
            <Trash2 className="size-4" />
          </button>
        </ConfirmForm>
      </div>
    </article>
  );
}

export default async function NotebookPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const viewParam = param(params.view);
  const filters: NotebookFilterValues = {
    q: param(params.q).slice(0, 120),
    view: isNotebookView(viewParam) ? viewParam : "date",
    course: param(params.course),
    professor: param(params.professor),
    tag: param(params.tag),
    from: isDateKey(param(params.from)) ? param(params.from) : "",
    to: isDateKey(param(params.to)) ? param(params.to) : "",
    fav: param(params.fav) === "1",
  };

  const user = await requireUser();
  const supabase = await createClient();
  const [notesResult, lessonsResult, coursesResult, timeZone, searchResult] = await Promise.all([
    supabase
      .from("notes")
      .select("id,title,course_id,lesson_id,tags,favorite,pinned,updated_at,created_at,plain_text_preview")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(2000),
    supabase.from("lessons").select("id,lesson_date,topic,unit,professor").eq("user_id", user.id),
    supabase.from("courses").select("id,course_name,color,archived,sort_order").eq("user_id", user.id).order("sort_order").order("course_name"),
    getTimeZone(supabase, user.id),
    filters.q ? supabase.rpc("atlas_search", { search_query: filters.q, max_results: 200 }) : Promise.resolve(null),
  ]);

  const loadError = notesResult.error || lessonsResult.error || coursesResult.error || searchResult?.error;
  const todayKey = dateKey(new Date(), timeZone);
  const courses = coursesResult.data ?? [];
  const activeCourses = courses.filter((course) => !course.archived);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const lessonById = new Map((lessonsResult.data ?? []).map((lesson) => [lesson.id, lesson]));

  const snippets = new Map<string, string>();
  if (searchResult?.data) {
    for (const row of searchResult.data) if (row.kind === "note") snippets.set(row.id, row.snippet);
  }

  const allItems: NoteItem[] = (notesResult.data ?? []).map((note) => {
    const lesson = note.lesson_id ? lessonById.get(note.lesson_id) : undefined;
    const course = note.course_id ? courseById.get(note.course_id) : undefined;
    return {
      id: note.id,
      title: note.title,
      courseId: note.course_id,
      courseName: course?.course_name ?? null,
      courseColor: course?.color ?? null,
      date: lesson?.lesson_date ?? dateKey(new Date(note.updated_at), timeZone),
      isLesson: Boolean(lesson),
      topic: lesson?.topic ?? null,
      unit: lesson?.unit ?? null,
      professor: lesson?.professor ?? null,
      tags: note.tags,
      preview: note.plain_text_preview,
      favorite: note.favorite,
      pinned: note.pinned,
    };
  });

  const professors = [...new Set(allItems.map((item) => item.professor).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const tags = [...new Set(allItems.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const items = allItems
    .filter((item) => !filters.q || snippets.has(item.id))
    .filter((item) => !filters.course || item.courseId === filters.course)
    .filter((item) => !filters.professor || item.professor === filters.professor)
    .filter((item) => !filters.tag || item.tags.some((tag) => tag.toLowerCase() === filters.tag.toLowerCase()))
    .filter((item) => !filters.from || item.date >= filters.from)
    .filter((item) => !filters.to || item.date <= filters.to)
    .filter((item) => !filters.fav || item.favorite)
    .sort((a, b) => (filters.view === "date" ? Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date) : 0));

  const groups = groupNotes(items, filters.view);
  const lessonCount = allItems.filter((item) => item.isLesson).length;

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        eyebrow="Caderno digital"
        title="Anotações de aula"
        description={`${allItems.length} ${allItems.length === 1 ? "anotação" : "anotações"} · ${lessonCount} ${lessonCount === 1 ? "aula registrada" : "aulas registradas"}`}
        actions={<NewNoteDialog courses={activeCourses} todayKey={todayKey} defaultCourseId={filters.course || undefined} />}
      />

      {loadError ? (
        <div className="mt-7 rounded-xl bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">O caderno não pôde ser carregado.</p>
          <p className="mt-1 text-sm">Confirme que a migração do Atlas (supabase/atlas-upgrade.sql) foi aplicada no Supabase.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-outline-variant/70 bg-surface-container-low p-4">
            <NotebookFilters values={filters} courses={courses} professors={professors} tags={tags} />
          </div>

          {allItems.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-outline p-10 text-center">
              <BookOpenText className="mx-auto size-8 text-gold" />
              <h2 className="mt-3 font-display text-2xl font-semibold">Seu caderno está vazio</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Registre a primeira aula: escolha a disciplina, a data e comece a escrever. Tudo é salvo automaticamente.</p>
              <div className="mt-5 flex justify-center">
                <NewNoteDialog courses={activeCourses} todayKey={todayKey} />
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-outline p-10 text-center">
              <p className="font-semibold">Nenhuma anotação corresponde aos filtros.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente outra palavra ou limpe os filtros.</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              <p className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "resultado" : "resultados"}
                {filters.q ? <> para <strong className="text-foreground">“{filters.q}”</strong> (sem diferenciar acentos)</> : null}
              </p>
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label}>
                  <h2 className="mb-3 flex items-baseline gap-2 border-b border-outline-variant/70 pb-2 font-display text-xl font-semibold first-letter:uppercase">
                    {group.label}
                    <span className="font-sans text-xs font-normal normal-case text-muted-foreground">{group.items.length}</span>
                  </h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {group.items.map((item) => (
                      <NoteCard key={`${group.key}-${item.id}`} item={item} snippet={snippets.get(item.id)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
