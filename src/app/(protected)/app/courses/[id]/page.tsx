import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, BookOpenText, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { ConfirmForm } from "@/components/shared/confirm-form";
import { deleteCourseAction, toggleCourseArchiveAction } from "@/features/courses/actions/course-actions";
import { CourseFormDialog } from "@/features/courses/components/course-forms";
import { assignmentTypeLabel } from "@/features/dashboard/data";
import { MaterialsLibrary } from "@/features/materials/components/materials-library";
import { NewNoteDialog } from "@/features/notes/components/new-note-dialog";
import { requireUser } from "@/lib/auth/current-user";
import { dateKey, formatKey, relativeDayLabel } from "@/lib/dates";
import { getTimeZone } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Disciplina" };

const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "lessons", label: "Aulas e anotações" },
  { id: "materials", label: "Materiais" },
  { id: "exams", label: "Avaliações e notas" },
  { id: "assignments", label: "Trabalhos" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const EXAM_TYPES = new Set(["quiz", "midterm", "final_exam", "viva"]);
const STATUS_LABEL: Record<string, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  ready_to_submit: "Pronto para entregar",
  submitted: "Entregue",
  graded: "Corrigido",
  missed: "Perdido",
};

function Block({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-outline-variant/70 bg-card p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Prose({ text, empty }: { text: string | null; empty: string }) {
  return text ? <p className="whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">{text}</p> : <p className="text-sm text-muted-foreground">{empty}</p>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-outline-variant p-5 text-center text-sm text-muted-foreground">{children}</p>;
}

function ModuleLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="focus-ring inline-flex items-center gap-1 rounded-md text-xs font-semibold text-on-surface-variant hover:text-primary"><Plus className="size-3.5" />{children}</Link>;
}

function grade(obtained: number | null, total: number | null) {
  if (obtained === null || total === null || Number(total) === 0) return null;
  return `${Number(obtained).toLocaleString("pt-BR")} / ${Number(total).toLocaleString("pt-BR")}`;
}

export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab: Tab = TABS.some((item) => item.id === tabParam) ? (tabParam as Tab) : "overview";

  const user = await requireUser();
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!course) notFound();

  const [semesters, timetable, lessons, notes, exams, assignments, materials, allCourses, timeZone] = await Promise.all([
    supabase.from("academic_semesters").select("id,semester_name,academic_year,start_date,end_date,is_current").eq("user_id", user.id),
    supabase.from("class_timetable_entries").select("*").eq("user_id", user.id).eq("course_id", id).order("day_of_week").order("start_time"),
    supabase.from("lessons").select("*").eq("user_id", user.id).eq("course_id", id).order("lesson_date", { ascending: false }),
    supabase.from("notes").select("id,title,lesson_id,updated_at,plain_text_preview,tags").eq("user_id", user.id).eq("course_id", id).order("updated_at", { ascending: false }),
    supabase.from("exam_schedules").select("*").eq("user_id", user.id).eq("course_id", id).order("exam_date"),
    supabase.from("assignments").select("*").eq("user_id", user.id).eq("course_id", id).order("due_date"),
    supabase.from("materials").select("*").eq("user_id", user.id).eq("course_id", id).order("created_at", { ascending: false }),
    supabase.from("courses").select("id,course_name,color").eq("user_id", user.id),
    getTimeZone(supabase, user.id),
  ]);

  const today = dateKey(new Date(), timeZone);
  const semester = (semesters.data ?? []).find((item) => item.id === course.semester_id);
  const examAssignments = (assignments.data ?? []).filter((item) => EXAM_TYPES.has(item.assignment_type));
  const workAssignments = (assignments.data ?? []).filter((item) => !EXAM_TYPES.has(item.assignment_type));
  const upcomingExams = [
    ...(exams.data ?? []).map((exam) => ({ id: exam.id, title: exam.title, date: exam.exam_date, detail: exam.exam_type })),
    ...examAssignments.map((item) => ({ id: item.id, title: item.title, date: item.due_date, detail: assignmentTypeLabel(item.assignment_type) })),
  ]
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const notesByLesson = new Map<string, { id: string; title: string }[]>();
  for (const note of notes.data ?? []) {
    if (!note.lesson_id) continue;
    notesByLesson.set(note.lesson_id, [...(notesByLesson.get(note.lesson_id) ?? []), note]);
  }
  const freeNotes = (notes.data ?? []).filter((note) => !note.lesson_id);
  const materialCount = materials.data?.length ?? 0;
  const counts: Record<Tab, number | null> = {
    overview: null,
    lessons: (lessons.data?.length ?? 0) + freeNotes.length,
    materials: materialCount,
    exams: (exams.data?.length ?? 0) + examAssignments.length,
    assignments: workAssignments.length,
  };

  return (
    <PageContainer className="max-w-6xl">
      <Link href="/app/courses" className="focus-ring mb-4 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Disciplinas
      </Link>

      <header className="flex flex-col gap-4 border-b border-outline-variant/70 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex gap-4">
          <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden="true" />
          <div>
            <p className="eyebrow">{[semester?.semester_name, course.archived ? "Arquivada" : null].filter(Boolean).join(" · ") || "Disciplina"}</p>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{course.course_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[course.course_code !== course.course_name.slice(0, 30) ? course.course_code : null, course.instructor_name ? `Prof. responsável: ${course.instructor_name}` : null, course.credit_hours ? `${course.credit_hours} h` : null].filter(Boolean).join(" · ") || "Sem professor cadastrado"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NewNoteDialog courses={[{ id: course.id, course_name: course.course_name }]} todayKey={today} defaultCourseId={course.id} trigger={<><BookOpenText className="size-4" /> Registrar aula</>} />
          <CourseFormDialog course={course} semesters={semesters.data ?? []} />
          <form action={toggleCourseArchiveAction}>
            <input type="hidden" name="id" value={course.id} />
            <button type="submit" className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-background px-3 text-xs font-semibold hover:border-primary">
              {course.archived ? <><ArchiveRestore className="size-3.5" /> Restaurar</> : <><Archive className="size-3.5" /> Arquivar</>}
            </button>
          </form>
          <ConfirmForm action={deleteCourseAction} message={`Excluir a disciplina “${course.course_name}”? Aulas, anotações, materiais e provas NÃO serão apagados — apenas ficarão sem disciplina. Para guardar o histórico, prefira arquivar.`}>
            <input type="hidden" name="id" value={course.id} />
            <input type="hidden" name="redirectTo" value="courses" />
            <button type="submit" className="focus-ring grid size-9 place-items-center rounded-lg text-destructive hover:bg-error-container/60" aria-label="Excluir disciplina" title="Excluir disciplina"><Trash2 className="size-4" /></button>
          </ConfirmForm>
        </div>
      </header>

      <nav aria-label="Seções da disciplina" className="mt-4 flex gap-1 overflow-x-auto border-b border-outline-variant/70">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={`/app/courses/${course.id}${item.id === "overview" ? "" : `?tab=${item.id}`}`}
            aria-current={tab === item.id ? "page" : undefined}
            className={cn("focus-ring -mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium", tab === item.id ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {item.label}
            {counts[item.id] !== null ? <span className="ml-1.5 text-xs text-muted-foreground">{counts[item.id]}</span> : null}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "overview" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Block title="Horários" action={<ModuleLink href="/app/schedule">Gerenciar</ModuleLink>}>
              {(timetable.data ?? []).length === 0 ? (
                <Empty>Nenhum horário de aula cadastrado para esta disciplina.</Empty>
              ) : (
                <ul className="divide-y divide-outline-variant/60 text-sm">
                  {(timetable.data ?? []).map((entry) => (
                    <li key={entry.id} className="flex justify-between gap-3 py-2">
                      <span className="font-medium">{WEEKDAYS[entry.day_of_week]}</span>
                      <span className="text-muted-foreground">{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}{entry.location ? ` · ${entry.location}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title="Próximas avaliações" action={<ModuleLink href="/app/schedule">Cadastrar prova</ModuleLink>}>
              {upcomingExams.length === 0 ? (
                <Empty>Nenhuma avaliação futura cadastrada.</Empty>
              ) : (
                <ul className="divide-y divide-outline-variant/60 text-sm">
                  {upcomingExams.slice(0, 5).map((exam) => (
                    <li key={exam.id} className="flex justify-between gap-3 py-2">
                      <span className="min-w-0 truncate font-medium">{exam.title}</span>
                      <span className="shrink-0 text-muted-foreground">{relativeDayLabel(exam.date, today)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title="Conteúdo programático"><Prose text={course.description} empty="Use “Editar” para registrar a ementa e as unidades." /></Block>
            <Block title="Livros e referências"><Prose text={course.references_text} empty="Nenhuma referência cadastrada." /></Block>
            <Block title="Dificuldades identificadas"><Prose text={course.difficulties} empty="Nenhuma dificuldade registrada." /></Block>
            <Block title="Conteúdos que preciso revisar"><Prose text={course.review_topics} empty="Nada marcado para revisão." /></Block>
          </div>
        ) : null}

        {tab === "lessons" ? (
          <div className="flex flex-col gap-6">
            {(lessons.data ?? []).length === 0 && freeNotes.length === 0 ? (
              <Empty>Nenhuma aula registrada nesta disciplina. Use “Registrar aula”.</Empty>
            ) : null}
            {(lessons.data ?? []).length > 0 ? (
              <section>
                <h2 className="mb-3 font-display text-xl font-semibold">Histórico de aulas</h2>
                <ol className="relative ml-2 border-l border-outline-variant pl-5">
                  {(lessons.data ?? []).map((lesson) => {
                    const lessonNotes = notesByLesson.get(lesson.id) ?? [];
                    return (
                      <li key={lesson.id} className="relative pb-5 last:pb-0">
                        <span className="absolute -left-[26.5px] top-1.5 size-3 rounded-full border-2 border-card" style={{ backgroundColor: course.color }} aria-hidden="true" />
                        <p className="text-xs font-medium text-muted-foreground">{formatKey(lesson.lesson_date, { weekday: "short", day: "2-digit", month: "long", year: "numeric" })}</p>
                        {lessonNotes[0] ? (
                          <Link href={`/app/notes/${lessonNotes[0].id}`} className="focus-ring rounded font-display text-lg font-semibold hover:text-primary">{lesson.title}</Link>
                        ) : (
                          <p className="font-display text-lg font-semibold">{lesson.title}</p>
                        )}
                        {lesson.topic || lesson.unit || lesson.professor ? <p className="text-xs text-muted-foreground">{[lesson.topic, lesson.unit, lesson.professor].filter(Boolean).join(" · ")}</p> : null}
                        {lessonNotes.length > 1 ? (
                          <p className="mt-1 text-xs">Outras anotações: {lessonNotes.slice(1).map((note, index) => <span key={note.id}>{index > 0 ? ", " : ""}<Link href={`/app/notes/${note.id}`} className="underline">{note.title}</Link></span>)}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}
            {freeNotes.length > 0 ? (
              <section>
                <h2 className="mb-3 font-display text-xl font-semibold">Outras anotações</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {freeNotes.map((note) => (
                    <li key={note.id}>
                      <Link href={`/app/notes/${note.id}`} className="focus-ring block rounded-xl border border-outline-variant/70 bg-card p-4 hover:border-primary/40">
                        <p className="font-semibold">{note.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{note.plain_text_preview || "Anotação vazia."}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "materials" ? (
          <MaterialsLibrary
            initialMaterials={materials.data ?? []}
            courses={allCourses.data ?? []}
            lessons={(lessons.data ?? []).map(({ id: lessonId, title, lesson_date, course_id }) => ({ id: lessonId, title, lesson_date, course_id }))}
            exams={(exams.data ?? []).map(({ id: examId, title, exam_date, course_id }) => ({ id: examId, title, exam_date, course_id }))}
            noteTitles={Object.fromEntries((notes.data ?? []).map((note) => [note.id, note.title]))}
            fixedCourseId={course.id}
          />
        ) : null}

        {tab === "exams" ? (
          <div className="flex flex-col gap-5">
            <Block title="Provas agendadas" action={<ModuleLink href="/app/schedule">Cadastrar prova</ModuleLink>}>
              {(exams.data ?? []).length === 0 ? (
                <Empty>Nenhuma prova cadastrada.</Empty>
              ) : (
                <ul className="divide-y divide-outline-variant/60 text-sm">
                  {(exams.data ?? []).map((exam) => (
                    <li key={exam.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2.5">
                      <span>
                        <span className="font-medium">{exam.title}</span>
                        <span className="text-muted-foreground"> · {exam.exam_type}</span>
                      </span>
                      <span className={cn("text-muted-foreground", exam.exam_date < today && "text-muted-foreground/70")}>
                        {formatKey(exam.exam_date, { day: "2-digit", month: "short", year: "numeric" })}{exam.start_time ? ` · ${exam.start_time.slice(0, 5)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title="Avaliações com nota" action={<ModuleLink href="/app/planner">Lançar nota</ModuleLink>}>
              {examAssignments.length === 0 ? (
                <Empty>Testes, provas parciais e finais cadastrados em Trabalhos e prazos aparecem aqui com a nota obtida.</Empty>
              ) : (
                <ul className="divide-y divide-outline-variant/60 text-sm">
                  {examAssignments.map((item) => (
                    <li key={item.id} className="flex flex-wrap justify-between gap-3 py-2.5">
                      <span><span className="font-medium">{item.title}</span><span className="text-muted-foreground"> · {assignmentTypeLabel(item.assignment_type)} · {formatKey(item.due_date, { day: "2-digit", month: "short" })}</span></span>
                      <span className="font-display font-semibold">{grade(item.obtained_marks, item.total_marks) ?? <span className="font-sans text-xs font-normal text-muted-foreground">sem nota</span>}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <p className="text-xs text-muted-foreground">Simulados, pesos, calculadora de médias e análise de erros chegam na Etapa 3.</p>
          </div>
        ) : null}

        {tab === "assignments" ? (
          <Block title="Trabalhos e entregas" action={<ModuleLink href="/app/planner">Novo trabalho</ModuleLink>}>
            {workAssignments.length === 0 ? (
              <Empty>Nenhum trabalho cadastrado para esta disciplina.</Empty>
            ) : (
              <ul className="divide-y divide-outline-variant/60 text-sm">
                {workAssignments.map((item) => {
                  const open = ["not_started", "in_progress", "ready_to_submit"].includes(item.submission_status);
                  return (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-muted-foreground"> · {assignmentTypeLabel(item.assignment_type)} · {STATUS_LABEL[item.submission_status]}</span>
                      </span>
                      <span className={cn("rounded-md px-2 py-0.5 text-xs", open && item.due_date < today ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant")}>
                        {open && item.due_date < today ? "Atrasado" : formatKey(item.due_date, { day: "2-digit", month: "short" })}
                        {grade(item.obtained_marks, item.total_marks) ? ` · ${grade(item.obtained_marks, item.total_marks)}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>
        ) : null}
      </div>
    </PageContainer>
  );
}
