"use client";

import { CalendarRange, Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { ActionMessage, FieldError, inputClass } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { saveCourseAction, saveSemesterAction } from "@/features/courses/actions/course-actions";
import { COURSE_COLORS } from "@/features/courses/lib/course-schema";
import { useFormAction } from "@/lib/forms/use-form-action";
import type { Database } from "@/types/database.generated";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Semester = Pick<Database["public"]["Tables"]["academic_semesters"]["Row"], "id" | "semester_name" | "academic_year" | "start_date" | "end_date" | "is_current"> & { institution?: string | null };

function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function CourseForm({ course, semesters, onDone }: { course?: Course; semesters: Semester[]; onDone: () => void }) {
  const { state, pending, onSubmit } = useFormAction(saveCourseAction, onDone);
  const suffix = course?.id ?? "new";
  const currentSemester = semesters.find((semester) => semester.is_current);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field id={`course-name-${suffix}`} label="Nome da disciplina">
          <input id={`course-name-${suffix}`} name="courseName" required maxLength={160} defaultValue={course?.course_name ?? ""} placeholder="Ex.: Anatomia Humana I" className={inputClass} autoFocus />
          <FieldError state={state} field="courseName" />
        </Field>
        <Field id={`course-code-${suffix}`} label="Código (opcional)">
          <input id={`course-code-${suffix}`} name="courseCode" maxLength={30} defaultValue={course && course.course_code !== course.course_name.slice(0, 30) ? course.course_code : ""} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
        <Field id={`course-instructor-${suffix}`} label="Professor(a) responsável">
          <input id={`course-instructor-${suffix}`} name="instructorName" maxLength={160} defaultValue={course?.instructor_name ?? ""} className={inputClass} />
        </Field>
        <Field id={`course-semester-${suffix}`} label="Semestre">
          <select id={`course-semester-${suffix}`} name="semesterId" defaultValue={course ? course.semester_id ?? "" : currentSemester?.id ?? ""} className={inputClass}>
            <option value="">Sem semestre</option>
            {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.semester_name}{semester.is_current ? " (atual)" : ""}</option>)}
          </select>
        </Field>
        <Field id={`course-workload-${suffix}`} label="Carga horária">
          <input id={`course-workload-${suffix}`} name="workload" inputMode="decimal" defaultValue={course?.credit_hours ?? ""} placeholder="h" className={inputClass} />
          <FieldError state={state} field="workload" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Cor</legend>
        <div className="flex flex-wrap gap-2">
          {COURSE_COLORS.map((color, index) => (
            <label key={color} className="cursor-pointer">
              <input type="radio" name="color" value={color} defaultChecked={course ? course.color.toLowerCase() === color : index === 0} className="peer sr-only" />
              <span className="block size-8 rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" style={{ backgroundColor: color }} aria-label={`Cor ${index + 1}`} />
            </label>
          ))}
        </div>
      </fieldset>
      <Field id={`course-description-${suffix}`} label="Conteúdo programático">
        <textarea id={`course-description-${suffix}`} name="description" rows={4} defaultValue={course?.description ?? ""} placeholder="Ementa, unidades e tópicos do semestre" className={`${inputClass} py-2 leading-6`} />
      </Field>
      <Field id={`course-references-${suffix}`} label="Livros e referências">
        <textarea id={`course-references-${suffix}`} name="referencesText" rows={3} defaultValue={course?.references_text ?? ""} className={`${inputClass} py-2 leading-6`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`course-difficulties-${suffix}`} label="Dificuldades identificadas">
          <textarea id={`course-difficulties-${suffix}`} name="difficulties" rows={3} defaultValue={course?.difficulties ?? ""} className={`${inputClass} py-2 leading-6`} />
        </Field>
        <Field id={`course-review-${suffix}`} label="Conteúdos que preciso revisar">
          <textarea id={`course-review-${suffix}`} name="reviewTopics" rows={3} defaultValue={course?.review_topics ?? ""} className={`${inputClass} py-2 leading-6`} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : course ? "Salvar alterações" : "Criar disciplina"}</Button>
      </div>
    </form>
  );
}

type TriggerVariant = "primary" | "outline" | "icon";

const iconTrigger = "focus-ring grid size-8 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-high";

/** Server Components pass `variant`; Client Components may pass a `trigger` render function. */
export function CourseFormDialog({ course, semesters, trigger, variant }: { course?: Course; semesters: Semester[]; trigger?: (open: () => void) => ReactNode; variant?: TriggerVariant }) {
  return (
    <Dialog
      size="lg"
      eyebrow="Disciplinas"
      title={course ? `Editar ${course.course_name}` : "Nova disciplina"}
      trigger={
        trigger ??
        ((open) =>
          variant === "icon" ? (
            <button type="button" onClick={open} className={iconTrigger} aria-label={`Editar ${course?.course_name ?? "disciplina"}`} title="Editar"><Pencil className="size-4" /></button>
          ) : course ? (
            <Button variant="outline" size="sm" onClick={open}><Pencil className="size-3.5" /> Editar</Button>
          ) : (
            <Button onClick={open}><Plus className="size-4" /> Nova disciplina</Button>
          ))
      }
    >
      {(close) => <CourseForm course={course} semesters={semesters} onDone={close} />}
    </Dialog>
  );
}

function SemesterForm({ semester, onDone, defaultInstitution }: { semester?: Semester; onDone: () => void; defaultInstitution?: string | null }) {
  const { state, pending, onSubmit } = useFormAction(saveSemesterAction, onDone);
  const suffix = semester?.id ?? "new";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {semester ? <input type="hidden" name="id" value={semester.id} /> : null}
      <ActionMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`semester-name-${suffix}`} label="Nome">
          <input id={`semester-name-${suffix}`} name="name" required maxLength={120} defaultValue={semester?.semester_name ?? ""} placeholder="Ex.: 3º período" className={inputClass} autoFocus />
          <FieldError state={state} field="name" />
        </Field>
        <Field id={`semester-year-${suffix}`} label="Ano letivo (opcional)">
          <input id={`semester-year-${suffix}`} name="academicYear" maxLength={40} defaultValue={semester?.academic_year ?? ""} placeholder="Ex.: 2026.2" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field id={`semester-institution-${suffix}`} label="Instituição" hint="Guarda de qual universidade é este semestre — útil em caso de transferência.">
            <input id={`semester-institution-${suffix}`} name="institution" maxLength={160} defaultValue={semester?.institution ?? defaultInstitution ?? ""} className={inputClass} />
          </Field>
        </div>
        <Field id={`semester-start-${suffix}`} label="Início">
          <input id={`semester-start-${suffix}`} name="startDate" type="date" defaultValue={semester?.start_date ?? ""} className={inputClass} />
        </Field>
        <Field id={`semester-end-${suffix}`} label="Término">
          <input id={`semester-end-${suffix}`} name="endDate" type="date" defaultValue={semester?.end_date ?? ""} className={inputClass} />
          <FieldError state={state} field="endDate" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isCurrent" defaultChecked={semester?.is_current ?? false} className="size-4 accent-[var(--primary)]" />
        Este é o semestre atual
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : semester ? "Salvar" : "Criar semestre"}</Button>
      </div>
    </form>
  );
}

export function SemesterFormDialog({ semester, variant = "outline", label = "Novo semestre", defaultInstitution }: { semester?: Semester; variant?: TriggerVariant; label?: string; defaultInstitution?: string | null }) {
  return (
    <Dialog
      eyebrow="Semestres"
      title={semester ? `Editar ${semester.semester_name}` : "Novo semestre"}
      trigger={(open) =>
        variant === "icon" ? (
          <button type="button" onClick={open} className={iconTrigger} aria-label={`Editar semestre ${semester?.semester_name ?? ""}`} title="Editar semestre"><Pencil className="size-4" /></button>
        ) : (
          <Button variant={variant === "primary" ? "default" : "outline"} onClick={open}><CalendarRange className="size-4" /> {label}</Button>
        )
      }
    >
      {(close) => <SemesterForm semester={semester} onDone={close} defaultInstitution={defaultInstitution} />}
    </Dialog>
  );
}
