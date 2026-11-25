import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenText,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileText,
  GraduationCap,
  Library,
  Search,
  Sparkles,
  SquareCheckBig,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { inputClass } from "@/components/forms/form-parts";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { fileUrl } from "@/features/materials/lib/files";
import { requireUser } from "@/lib/auth/current-user";
import { formatKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { AtlasSearchKind } from "@/types/database.generated";

export const metadata: Metadata = { title: "Busca" };

const KINDS: Record<AtlasSearchKind, { label: string; plural: string; icon: LucideIcon }> = {
  note: { label: "Anotação", plural: "Anotações", icon: BookOpenText },
  lesson: { label: "Aula", plural: "Aulas", icon: GraduationCap },
  course: { label: "Disciplina", plural: "Disciplinas", icon: Library },
  material: { label: "Material", plural: "Materiais", icon: FileText },
  exam: { label: "Prova", plural: "Provas", icon: ClipboardList },
  assignment: { label: "Trabalho", plural: "Trabalhos", icon: CalendarDays },
  task: { label: "Tarefa", plural: "Tarefas", icon: SquareCheckBig },
  event: { label: "Evento", plural: "Eventos", icon: CalendarDays },
  study: { label: "Sessão de estudo", plural: "Estudos", icon: Timer },
  skill: { label: "Habilidade", plural: "Habilidades", icon: Sparkles },
  finance: { label: "Finanças", plural: "Finanças", icon: CircleDollarSign },
};

const STATIC_HREF: Partial<Record<AtlasSearchKind, string>> = {
  exam: "/app/schedule",
  assignment: "/app/planner",
  task: "/app/tasks",
  study: "/app/study",
  skill: "/app/skills",
  finance: "/app/finance",
};

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0 || !text) return <>{text}</>;
  const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const folded = fold(text);
  const marks: [number, number][] = [];
  for (const term of terms) {
    let index = folded.indexOf(term);
    while (index !== -1 && term) {
      marks.push([index, index + term.length]);
      index = folded.indexOf(term, index + term.length);
    }
  }
  if (marks.length === 0) return <>{text}</>;
  marks.sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  marks.forEach(([start, end], index) => {
    if (start < cursor) return;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<mark key={index} className="rounded-sm bg-tertiary-container px-0.5 text-on-tertiary-container">{text.slice(start, end)}</mark>);
    cursor = end;
  });
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 120) ?? "";
  const kindParam = (Array.isArray(params.kind) ? params.kind[0] : params.kind) ?? "";
  const kindFilter = kindParam in KINDS ? (kindParam as AtlasSearchKind) : null;

  const user = await requireUser();
  const supabase = await createClient();

  const search = q ? await supabase.rpc("atlas_search", { search_query: q, max_results: 200 }) : null;
  const rows = search?.data ?? [];

  const lessonIds = rows.filter((row) => row.kind === "lesson").map((row) => row.id);
  const materialIds = rows.filter((row) => row.kind === "material").map((row) => row.id);
  const courseIds = [...new Set(rows.map((row) => row.course_id).filter((id): id is string => Boolean(id)))];

  const [lessonNotes, materials, courses] = await Promise.all([
    lessonIds.length ? supabase.from("notes").select("id,lesson_id").eq("user_id", user.id).in("lesson_id", lessonIds) : Promise.resolve({ data: [] as { id: string; lesson_id: string | null }[] }),
    materialIds.length ? supabase.from("materials").select("id,storage_path,external_url").eq("user_id", user.id).in("id", materialIds) : Promise.resolve({ data: [] as { id: string; storage_path: string | null; external_url: string | null }[] }),
    courseIds.length ? supabase.from("courses").select("id,course_name,color").eq("user_id", user.id).in("id", courseIds) : Promise.resolve({ data: [] as { id: string; course_name: string; color: string }[] }),
  ]);

  const noteForLesson = new Map((lessonNotes.data ?? []).map((note) => [note.lesson_id, note.id]));
  const materialById = new Map((materials.data ?? []).map((material) => [material.id, material]));
  const courseById = new Map((courses.data ?? []).map((course) => [course.id, course]));

  const hrefFor = (row: (typeof rows)[number]): { href: string; external?: boolean } | null => {
    switch (row.kind) {
      case "note":
        return { href: `/app/notes/${row.id}` };
      case "lesson": {
        const noteId = noteForLesson.get(row.id);
        return noteId ? { href: `/app/notes/${noteId}` } : null;
      }
      case "course":
        return { href: `/app/courses/${row.id}` };
      case "material": {
        const material = materialById.get(row.id);
        if (material?.storage_path) return { href: fileUrl(material.storage_path), external: true };
        if (material?.external_url) return { href: material.external_url, external: true };
        return row.parent_id ? { href: `/app/notes/${row.parent_id}` } : null;
      }
      case "event":
        return { href: `/app/calendar?view=day&date=${row.occurred_on ?? ""}` };
      default:
        return STATIC_HREF[row.kind] ? { href: STATIC_HREF[row.kind]! } : null;
    }
  };

  const counts = new Map<AtlasSearchKind, number>();
  for (const row of rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
  const visible = kindFilter ? rows.filter((row) => row.kind === kindFilter) : rows;
  const terms = q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
  const chipHref = (kind: string) => `/app/search?q=${encodeURIComponent(q)}${kind ? `&kind=${kind}` : ""}`;

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader eyebrow="Busca global" title="Encontre qualquer registro" description="Pesquisa o texto completo das anotações, aulas, disciplinas, materiais, provas, trabalhos, tarefas e demais módulos. Acentos e maiúsculas não importam." />

      <form method="get" role="search" className="mt-6 flex gap-2">
        <label className="relative block flex-1">
          <span className="sr-only">Termo de busca</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q} autoFocus placeholder="Ex.: artéria renal, bexiga, Silva…" className={`${inputClass} min-h-13 pl-12 text-base`} />
        </label>
        <button type="submit" className="focus-ring min-h-13 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Buscar</button>
      </form>

      {search?.error ? (
        <div className="mt-6 rounded-xl bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">A busca não pôde ser executada.</p>
          <p className="mt-1 text-sm">Confirme que a migração do Atlas (supabase/atlas-upgrade.sql) foi aplicada no Supabase.</p>
        </div>
      ) : !q ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">Digite um termo para pesquisar em todo o Atlas.</p>
      ) : (
        <>
          <nav aria-label="Filtrar por tipo" className="mt-5 flex gap-2 overflow-x-auto pb-2">
            <Link href={chipHref("")} aria-current={!kindFilter ? "page" : undefined} className={cn("focus-ring min-h-9 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium", !kindFilter ? "border-primary bg-primary text-primary-foreground" : "border-outline-variant bg-card")}>
              Tudo <span className="opacity-70">{rows.length}</span>
            </Link>
            {(Object.keys(KINDS) as AtlasSearchKind[]).filter((kind) => counts.has(kind)).map((kind) => (
              <Link key={kind} href={chipHref(kind)} aria-current={kindFilter === kind ? "page" : undefined} className={cn("focus-ring min-h-9 shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium", kindFilter === kind ? "border-primary bg-primary text-primary-foreground" : "border-outline-variant bg-card")}>
                {KINDS[kind].plural} <span className="opacity-70">{counts.get(kind)}</span>
              </Link>
            ))}
          </nav>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-outline p-10 text-center">
              <p className="font-semibold">Nada encontrado para “{q}”.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente menos palavras ou um termo relacionado.</p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {visible.map((row) => {
                const kind = KINDS[row.kind];
                const Icon = kind.icon;
                const target = hrefFor(row);
                const course = row.course_id ? courseById.get(row.course_id) : undefined;
                const body = (
                  <>
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-container text-primary"><Icon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-semibold uppercase tracking-wider text-gold">{kind.label}</span>
                        {row.occurred_on ? <span>{formatKey(row.occurred_on, { day: "2-digit", month: "short", year: "numeric" })}</span> : null}
                        {course ? <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full" style={{ backgroundColor: course.color }} />{course.course_name}</span> : null}
                      </span>
                      <span className="mt-0.5 block font-display text-lg font-semibold leading-snug"><Highlight text={row.title} terms={terms} /></span>
                      {row.snippet ? <span className="mt-1 block text-sm leading-6 text-on-surface-variant"><Highlight text={row.snippet} terms={terms} /></span> : null}
                    </span>
                  </>
                );
                return (
                  <li key={`${row.kind}-${row.id}`}>
                    {target ? (
                      <Link href={target.href} target={target.external ? "_blank" : undefined} className="focus-ring flex items-start gap-3 rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card hover:border-primary/40">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}
