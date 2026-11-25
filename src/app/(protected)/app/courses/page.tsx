import type { Metadata } from "next";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ConfirmForm } from "@/components/shared/confirm-form";
import { PageHeader } from "@/components/shared/page-header";
import { deleteCourseAction, deleteSemesterAction, moveCourseAction, toggleCourseArchiveAction } from "@/features/courses/actions/course-actions";
import { CourseFormDialog, SemesterFormDialog } from "@/features/courses/components/course-forms";
import { requireUser } from "@/lib/auth/current-user";
import { formatKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

export const metadata: Metadata = { title: "Disciplinas" };

type Course = Database["public"]["Tables"]["courses"]["Row"];

const iconButton = "focus-ring grid size-8 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30";

function plural(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

function count(map: Map<string, number>, id: string) {
  return map.get(id) ?? 0;
}

export default async function CoursesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [coursesResult, semestersResult, lessons, notes, materials, exams, profile] = await Promise.all([
    supabase.from("courses").select("*").eq("user_id", user.id).order("sort_order").order("course_name"),
    supabase.from("academic_semesters").select("id,semester_name,academic_year,institution,start_date,end_date,is_current,gpa,sort_order,created_at").eq("user_id", user.id),
    supabase.from("lessons").select("course_id").eq("user_id", user.id),
    supabase.from("notes").select("course_id").eq("user_id", user.id),
    supabase.from("materials").select("course_id").eq("user_id", user.id),
    supabase.from("exam_schedules").select("course_id,exam_date").eq("user_id", user.id),
    supabase.from("profiles").select("university_name").eq("id", user.id).maybeSingle(),
  ]);
  const defaultInstitution = profile.data?.university_name ?? null;

  const error = coursesResult.error || semestersResult.error;
  const courses = coursesResult.data ?? [];
  const semesters = [...(semestersResult.data ?? [])].sort(
    (a, b) => Number(b.is_current) - Number(a.is_current) || (b.start_date ?? "").localeCompare(a.start_date ?? "") || b.created_at.localeCompare(a.created_at),
  );

  const tally = (rows: { course_id: string | null }[] | null) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) if (row.course_id) map.set(row.course_id, (map.get(row.course_id) ?? 0) + 1);
    return map;
  };
  const lessonCount = tally(lessons.data);
  const noteCount = tally(notes.data);
  const materialCount = tally(materials.data);
  const examCount = tally(exams.data);

  const active = courses.filter((course) => !course.archived);
  const archived = courses.filter((course) => course.archived);
  const groups = [
    ...semesters.map((semester) => ({ semester, courses: active.filter((course) => course.semester_id === semester.id) })),
    { semester: null, courses: active.filter((course) => !course.semester_id || !semesters.some((semester) => semester.id === course.semester_id)) },
  ];

  const row = (course: Course, index: number, list: Course[]) => (
    <li key={course.id} className="flex items-center gap-3 rounded-xl border border-outline-variant/70 bg-card p-3 shadow-card sm:p-4">
      <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <Link href={`/app/courses/${course.id}`} className="focus-ring block rounded font-display text-lg font-semibold leading-snug hover:text-primary">
          {course.course_name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {[course.course_code !== course.course_name.slice(0, 30) ? course.course_code : null, course.instructor_name, course.credit_hours ? `${course.credit_hours} h` : null].filter(Boolean).join(" · ") || "Sem professor cadastrado"}
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          {[
            plural(count(lessonCount, course.id), "aula", "aulas"),
            plural(count(noteCount, course.id), "anotação", "anotações"),
            plural(count(materialCount, course.id), "material", "materiais"),
            plural(count(examCount, course.id), "prova", "provas"),
          ].join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
        {!course.archived ? (
          <>
            <form action={moveCourseAction}>
              <input type="hidden" name="id" value={course.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" className={iconButton} disabled={index === 0} aria-label={`Mover ${course.course_name} para cima`} title="Mover para cima"><ArrowUp className="size-4" /></button>
            </form>
            <form action={moveCourseAction}>
              <input type="hidden" name="id" value={course.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" className={iconButton} disabled={index === list.length - 1} aria-label={`Mover ${course.course_name} para baixo`} title="Mover para baixo"><ArrowDown className="size-4" /></button>
            </form>
          </>
        ) : null}
        <CourseFormDialog course={course} semesters={semesters} variant="icon" />
        <form action={toggleCourseArchiveAction}>
          <input type="hidden" name="id" value={course.id} />
          <button type="submit" className={iconButton} aria-label={course.archived ? `Restaurar ${course.course_name}` : `Arquivar ${course.course_name}`} title={course.archived ? "Restaurar" : "Arquivar"}>
            {course.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </button>
        </form>
        <ConfirmForm action={deleteCourseAction} message={`Excluir a disciplina “${course.course_name}”? Aulas, anotações, materiais e provas ligados a ela NÃO serão apagados — apenas ficarão sem disciplina. Para guardar o histórico, prefira arquivar.`}>
          <input type="hidden" name="id" value={course.id} />
          <button type="submit" className={`${iconButton} text-destructive`} aria-label={`Excluir ${course.course_name}`} title="Excluir"><Trash2 className="size-4" /></button>
        </ConfirmForm>
      </div>
    </li>
  );

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        eyebrow="Acadêmico"
        title="Disciplinas"
        description="Cada disciplina reúne suas aulas, anotações, materiais, provas e trabalhos."
        actions={
          <>
            <Link href="/app/import" className="focus-ring inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high">Importar grade</Link>
            <SemesterFormDialog defaultInstitution={defaultInstitution} />
            <CourseFormDialog semesters={semesters} />
          </>
        }
      />

      {error ? (
        <div className="mt-7 rounded-xl bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">As disciplinas não puderam ser carregadas.</p>
          <p className="mt-1 text-sm">Confirme que supabase/atlas-upgrade.sql foi aplicado no Supabase.</p>
        </div>
      ) : courses.length === 0 && semesters.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-outline p-10 text-center">
          <h2 className="font-display text-2xl font-semibold">Nenhuma disciplina ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Crie o semestre atual e cadastre as disciplinas que você está cursando.</p>
          <div className="mt-5 flex justify-center gap-2">
            <SemesterFormDialog label="Semestre" defaultInstitution={defaultInstitution} />
            <CourseFormDialog semesters={semesters} />
          </div>
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-8">
          {groups.map(({ semester, courses: list }) =>
            !semester && list.length === 0 ? null : (
              <section key={semester?.id ?? "none"} aria-label={semester?.semester_name ?? "Sem semestre"}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-outline-variant/70 pb-2">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                      {semester?.semester_name ?? "Sem semestre"}
                      {semester?.is_current ? <span className="rounded bg-secondary-container px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-on-secondary-container">Atual</span> : null}
                    </h2>
                    {semester && (semester.start_date || semester.academic_year || semester.institution) ? (
                      <p className="text-xs text-muted-foreground">
                        {[semester.institution, semester.academic_year, semester.start_date && semester.end_date ? `${formatKey(semester.start_date, { day: "2-digit", month: "short" })} – ${formatKey(semester.end_date, { day: "2-digit", month: "short", year: "numeric" })}` : null].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {semester ? (
                    <div className="flex items-center gap-0.5">
                      <SemesterFormDialog semester={semester} variant="icon" />
                      <ConfirmForm action={deleteSemesterAction} message={`Excluir o semestre “${semester.semester_name}”? As disciplinas continuam, apenas sem semestre.${semester.gpa !== null ? " O registro de GPA desse semestre (página Desempenho semestral) também será excluído." : ""}`}>
                        <input type="hidden" name="id" value={semester.id} />
                        <button type="submit" className={`${iconButton} text-destructive`} aria-label={`Excluir semestre ${semester.semester_name}`} title="Excluir semestre"><Trash2 className="size-4" /></button>
                      </ConfirmForm>
                    </div>
                  ) : null}
                </div>
                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-sm text-muted-foreground">Nenhuma disciplina neste semestre.</p>
                ) : (
                  <ul className="flex flex-col gap-2">{list.map((course, index) => row(course, index, list))}</ul>
                )}
              </section>
            ),
          )}

          {archived.length > 0 ? (
            <details className="rounded-xl border border-outline-variant/70 bg-surface-container-low p-4">
              <summary className="focus-ring cursor-pointer rounded font-display text-lg font-semibold">Arquivadas ({archived.length})</summary>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">Disciplinas concluídas continuam com todo o histórico, só saem das listas do dia a dia.</p>
              <ul className="flex flex-col gap-2">{archived.map((course, index) => row(course, index, archived))}</ul>
            </details>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
