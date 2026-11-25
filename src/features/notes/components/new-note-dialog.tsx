"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { ActionMessage, FieldError, inputClass } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { createNoteAction } from "@/features/notes/actions/note-actions";
import { initialActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";

export type NoteCourseOption = { id: string; course_name: string };

export function NewNoteForm({
  courses,
  todayKey,
  defaultCourseId,
  onCancel,
  autoFocus,
}: {
  courses: NoteCourseOption[];
  todayKey: string;
  defaultCourseId?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [state, action, pending] = useActionState(createNoteAction, initialActionState);
  const [kind, setKind] = useState<"lesson" | "free">("lesson");

  return (
    <form action={action} className="flex flex-col gap-4">
      <ActionMessage state={state} />
      <fieldset className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container p-1">
        <legend className="sr-only">Tipo de anotação</legend>
        {([
          ["lesson", "Aula"],
          ["free", "Anotação livre"],
        ] as const).map(([value, label]) => (
          <label key={value} className={cn("cursor-pointer rounded-md px-3 py-2 text-center text-sm font-medium", kind === value ? "bg-card shadow-sm" : "text-muted-foreground")}>
            <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
            {label}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="new-note-title" className="mb-1.5 block text-sm font-medium">{kind === "lesson" ? "Tema da aula" : "Título"}</label>
        <input id="new-note-title" name="title" required maxLength={180} autoFocus={autoFocus} placeholder={kind === "lesson" ? "Ex.: Sistema urinário — rins" : "Ex.: Resumo para a prova"} className={inputClass} />
        <FieldError state={state} field="title" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-note-course" className="mb-1.5 block text-sm font-medium">Disciplina</label>
          <select id="new-note-course" name="courseId" defaultValue={defaultCourseId ?? ""} className={inputClass}>
            <option value="">Sem disciplina</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.course_name}</option>
            ))}
          </select>
          {courses.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Nenhuma disciplina cadastrada. <Link href="/app/planner" className="font-medium text-primary underline">Cadastrar disciplinas</Link>
            </p>
          ) : null}
        </div>
        {kind === "lesson" ? (
          <div>
            <label htmlFor="new-note-date" className="mb-1.5 block text-sm font-medium">Data da aula</label>
            <input id="new-note-date" name="lessonDate" type="date" required defaultValue={todayKey} className={inputClass} />
            <FieldError state={state} field="lessonDate" />
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel ? <Button variant="ghost" onClick={onCancel}>Cancelar</Button> : null}
        <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar e abrir o editor"}</Button>
      </div>
    </form>
  );
}

export function NewNoteDialog({
  courses,
  todayKey,
  defaultCourseId,
  trigger,
  triggerClassName,
}: {
  courses: NoteCourseOption[];
  todayKey: string;
  defaultCourseId?: string;
  trigger?: ReactNode;
  triggerClassName?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <Button className={triggerClassName} onClick={() => setOpen(true)}>
        {trigger ?? (
          <>
            <Plus className="size-4" /> Nova anotação
          </>
        )}
      </Button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current) setOpen(false);
        }}
        aria-labelledby="new-note-dialog-title"
        className="m-auto w-[min(100%-2rem,32rem)] rounded-xl border border-outline-variant bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        {open ? (
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Caderno</p>
                <h2 id="new-note-dialog-title" className="font-display text-2xl font-semibold">Nova anotação</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="focus-ring grid size-9 place-items-center rounded-md hover:bg-surface-container-high" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>
            <NewNoteForm courses={courses} todayKey={todayKey} defaultCourseId={defaultCourseId} onCancel={() => setOpen(false)} autoFocus />
          </div>
        ) : null}
      </dialog>
    </>
  );
}
