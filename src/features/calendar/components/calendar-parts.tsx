"use client";

import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ActionMessage, FieldError, inputClass } from "@/components/forms/form-parts";
import { ConfirmForm } from "@/components/shared/confirm-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deleteEventAction, saveEventAction } from "@/features/calendar/actions/event-actions";
import { EVENT_CATEGORIES, TONE_CLASSES } from "@/features/calendar/lib/categories";
import type { CalendarItem, EditableEvent } from "@/features/calendar/lib/load-calendar";
import { useFormAction } from "@/lib/forms/use-form-action";
import { cn } from "@/lib/utils";

export type CalendarCourse = { id: string; course_name: string };

function EventForm({ event, date, courses, onDone }: { event?: EditableEvent; date: string; courses: CalendarCourse[]; onDone: () => void }) {
  const { state, pending, onSubmit } = useFormAction(saveEventAction, onDone);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const suffix = event?.id ?? "new";

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {event ? <input type="hidden" name="id" value={event.id} /> : null}
        <ActionMessage state={state} />
        <div>
          <label htmlFor={`event-title-${suffix}`} className="mb-1 block text-sm font-medium">Título</label>
          <input id={`event-title-${suffix}`} name="title" required maxLength={200} defaultValue={event?.title ?? ""} placeholder="Ex.: Seminário de embriologia" className={inputClass} autoFocus />
          <FieldError state={state} field="title" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`event-type-${suffix}`} className="mb-1 block text-sm font-medium">Categoria</label>
            <select id={`event-type-${suffix}`} name="eventType" defaultValue={event?.eventType ?? "class"} className={inputClass}>
              {EVENT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`event-course-${suffix}`} className="mb-1 block text-sm font-medium">Disciplina</label>
            <select id={`event-course-${suffix}`} name="courseId" defaultValue={event?.courseId ?? ""} className={inputClass}>
              <option value="">Nenhuma</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_7rem_7rem]">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor={`event-date-${suffix}`} className="mb-1 block text-sm font-medium">Data</label>
            <input id={`event-date-${suffix}`} name="date" type="date" required defaultValue={event?.date ?? date} className={inputClass} />
            <FieldError state={state} field="date" />
          </div>
          <div>
            <label htmlFor={`event-start-${suffix}`} className="mb-1 block text-sm font-medium">Início</label>
            <input id={`event-start-${suffix}`} name="startTime" type="time" disabled={allDay} defaultValue={event?.startTime ?? ""} className={inputClass} />
          </div>
          <div>
            <label htmlFor={`event-end-${suffix}`} className="mb-1 block text-sm font-medium">Término</label>
            <input id={`event-end-${suffix}`} name="endTime" type="time" disabled={allDay} defaultValue={event?.endTime ?? ""} className={inputClass} />
          </div>
        </div>
        <FieldError state={state} field="startTime" />
        <FieldError state={state} field="endTime" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allDay" checked={allDay} onChange={(change) => setAllDay(change.target.checked)} className="size-4 accent-[var(--primary)]" />
          Dia inteiro
        </label>
        <div>
          <label htmlFor={`event-location-${suffix}`} className="mb-1 block text-sm font-medium">Local</label>
          <input id={`event-location-${suffix}`} name="location" maxLength={200} defaultValue={event?.location ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`event-description-${suffix}`} className="mb-1 block text-sm font-medium">Descrição</label>
          <textarea id={`event-description-${suffix}`} name="description" rows={3} defaultValue={event?.description ?? ""} className={`${inputClass} py-2 leading-6`} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : event ? "Salvar" : "Criar compromisso"}</Button>
        </div>
      </form>
      {event ? (
        <ConfirmForm action={deleteEventAction} message={`Excluir “${event.title}”?`} className="border-t border-outline-variant/70 pt-3">
          <input type="hidden" name="id" value={event.id} />
          <button type="submit" className="text-sm font-semibold text-destructive hover:underline">Excluir compromisso</button>
        </ConfirmForm>
      ) : null}
    </div>
  );
}

export function NewEventButton({ date, courses, compact, label }: { date: string; courses: CalendarCourse[]; compact?: boolean; label?: string }) {
  return (
    <Dialog
      size="lg"
      eyebrow="Calendário"
      title="Novo compromisso"
      trigger={(open) =>
        compact ? (
          <button type="button" onClick={open} className="focus-ring grid size-6 place-items-center rounded text-muted-foreground opacity-60 hover:bg-surface-container-high hover:opacity-100" aria-label={`Novo compromisso em ${date}`} title="Novo compromisso">
            <Plus className="size-3.5" />
          </button>
        ) : (
          <Button onClick={open}><Plus className="size-4" /> {label ?? "Novo compromisso"}</Button>
        )
      }
    >
      {(close) => <EventForm date={date} courses={courses} onDone={close} />}
    </Dialog>
  );
}

function ChipBody({ item, showTime }: { item: CalendarItem; showTime: boolean }) {
  return (
    <>
      <span className="flex items-center gap-1">
        {item.alert ? <AlertTriangle className={cn("size-3 shrink-0", item.alert === "overdue" ? "text-destructive" : "text-gold")} aria-label={item.alert === "overdue" ? "Atrasado" : "Prazo próximo"} /> : null}
        <span className={cn("truncate font-medium", item.done && "line-through opacity-60")}>{item.title}</span>
      </span>
      <span className="block truncate text-[10px] opacity-80">{[showTime ? item.start : null, item.label, item.detail].filter(Boolean).join(" · ")}</span>
    </>
  );
}

export function ItemChip({ item, courses, showTime = true, className }: { item: CalendarItem; courses: CalendarCourse[]; showTime?: boolean; className?: string }) {
  const classes = cn("focus-ring block w-full rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs leading-4 hover:brightness-95", TONE_CLASSES[item.tone].chip, item.alert === "overdue" && "ring-1 ring-destructive/40", className);
  if (item.event) {
    const event = item.event;
    return (
      <Dialog size="lg" eyebrow="Calendário" title="Editar compromisso" trigger={(open) => <button type="button" onClick={open} className={classes}><ChipBody item={item} showTime={showTime} /></button>}>
        {(close) => <EventForm event={event} date={event.date} courses={courses} onDone={close} />}
      </Dialog>
    );
  }
  if (item.href) return <Link href={item.href} className={classes}><ChipBody item={item} showTime={showTime} /></Link>;
  return <div className={classes}><ChipBody item={item} showTime={showTime} /></div>;
}

export function ItemRow({ item, courses, aside }: { item: CalendarItem; courses: CalendarCourse[]; aside?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-14 shrink-0 pt-1 text-right text-xs font-medium text-muted-foreground">{item.start ?? "Dia todo"}{item.end ? <span className="block opacity-70">{item.end}</span> : null}</span>
      <div className="min-w-0 flex-1"><ItemChip item={item} courses={courses} showTime={false} className="py-2 text-sm" /></div>
      {aside}
    </div>
  );
}
