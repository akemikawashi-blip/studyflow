"use client";

import { useActionState, useMemo, useState } from "react";
import { Pin, Plus, Search, Star, Pencil, Trash2 } from "lucide-react";

import { ActionMessage, FieldError, FormLabel, inputClass } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createNoteAction, deleteNoteAction, toggleNoteFlagAction, updateNoteAction } from "@/features/notes/actions/note-actions";
import { formatDate } from "@/lib/display";
import { initialActionState, type ActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type Note = Database["public"]["Tables"]["notes"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];

function NoteFields({ state, note, courses }: { state: ActionState; note?: Note; courses: Course[] }) {
  const suffix = note?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`note-title-${suffix}`}>Title</FormLabel>
          <input id={`note-title-${suffix}`} name="title" defaultValue={note?.title ?? ""} className={inputClass} required />
          <FieldError state={state} field="title" />
        </div>
        <div>
          <FormLabel htmlFor={`note-course-${suffix}`}>Course</FormLabel>
          <select id={`note-course-${suffix}`} name="courseId" defaultValue={note?.course_id ?? ""} className={inputClass}>
            <option value="">No course</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} — {course.course_name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <FormLabel htmlFor={`note-content-${suffix}`}>Content</FormLabel>
        <textarea id={`note-content-${suffix}`} name="content" defaultValue={note?.content ?? ""} className={`${inputClass} min-h-48 resize-y py-3`} placeholder="Write your note…" />
        <FieldError state={state} field="content" />
      </div>
      <div>
        <FormLabel htmlFor={`note-tags-${suffix}`}>Tags</FormLabel>
        <input id={`note-tags-${suffix}`} name="tags" defaultValue={note?.tags.join(", ") ?? ""} className={inputClass} placeholder="revision, exam, chapter 4" />
        <p className="mt-1 text-xs text-muted-foreground">Separate tags with commas.</p>
      </div>
      <div className="flex flex-wrap gap-5">
        <label className="inline-flex items-center gap-2 text-sm font-medium"><input name="favorite" type="checkbox" defaultChecked={note?.favorite ?? false} className="size-4" />Favorite</label>
        <label className="inline-flex items-center gap-2 text-sm font-medium"><input name="pinned" type="checkbox" defaultChecked={note?.pinned ?? false} className="size-4" />Pinned</label>
      </div>
    </div>
  );
}

function AddNote({ courses }: { courses: Course[] }) {
  const [state, action, pending] = useActionState(createNoteAction, initialActionState);
  return <details className="surface-panel rounded-card p-5" open><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl font-semibold"><Plus className="size-5 text-primary" />Create note</summary><form action={action} className="mt-5 space-y-5"><ActionMessage state={state} /><NoteFields state={state} courses={courses} /><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save note"}</Button></form></details>;
}

function EditNote({ note, courses }: { note: Note; courses: Course[] }) {
  const [state, action, pending] = useActionState(updateNoteAction, initialActionState);
  return <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4"><summary className="focus-ring flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary"><Pencil className="size-4" />Edit note</summary><form action={action} className="mt-4 space-y-4"><input type="hidden" name="id" value={note.id} /><ActionMessage state={state} /><NoteFields state={state} note={note} courses={courses} /><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form></details>;
}

export function NotesManager({ notes, courses }: { notes: Note[]; courses: Course[] }) {
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (favoritesOnly && !note.favorite) return false;
      if (!normalized) return true;
      const course = note.course_id ? courseById.get(note.course_id) : undefined;
      return [note.title, note.content, note.plain_text_preview, ...note.tags, course?.course_code ?? "", course?.course_name ?? ""].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [courseById, favoritesOnly, notes, query]);

  return (
    <div>
      <AddNote courses={courses} />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">Search notes</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content, course or tag…" className={`${inputClass} pl-12`} />
        </label>
        <button type="button" onClick={() => setFavoritesOnly((value) => !value)} aria-pressed={favoritesOnly} className={cn("focus-ring min-h-11 rounded-full border px-5 text-sm font-semibold", favoritesOnly ? "border-primary bg-primary text-primary-foreground" : "border-outline-variant bg-background")}>Favorites only</button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {filtered.map((note) => {
          const course = note.course_id ? courseById.get(note.course_id) : undefined;
          return (
            <Card key={note.id} className={cn("p-5", note.pinned && "border-primary/45 bg-primary-fixed/15")}>
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{note.title}</h2>{note.pinned ? <Badge><Pin className="mr-1 size-3" />Pinned</Badge> : null}<span className="text-xs text-muted-foreground">{formatDate(note.updated_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div>
                  {course ? <p className="mt-1 text-xs font-medium text-primary">{course.course_code} — {course.course_name}</p> : null}
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{note.plain_text_preview || "Empty note"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{note.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
                  <EditNote note={note} courses={courses} />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <form action={toggleNoteFlagAction}><input type="hidden" name="id" value={note.id} /><input type="hidden" name="field" value="favorite" /><Button type="submit" variant="ghost" size="icon" aria-label={note.favorite ? "Remove favorite" : "Add favorite"}><Star className={cn("size-5", note.favorite && "fill-primary text-primary")} /></Button></form>
                  <form action={toggleNoteFlagAction}><input type="hidden" name="id" value={note.id} /><input type="hidden" name="field" value="pinned" /><Button type="submit" variant="ghost" size="icon" aria-label={note.pinned ? "Unpin note" : "Pin note"}><Pin className={cn("size-5", note.pinned && "fill-primary text-primary")} /></Button></form>
                  <form action={deleteNoteAction} onSubmit={(event) => { if (!window.confirm(`Delete “${note.title}”?`)) event.preventDefault(); }}><input type="hidden" name="id" value={note.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${note.title}`}><Trash2 className="size-4" /></Button></form>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 ? <div className="mt-5 rounded-card border border-dashed border-outline-variant p-10 text-center"><p className="font-semibold">No matching notes</p><p className="mt-2 text-sm text-muted-foreground">Create a note or change the search filter.</p></div> : null}
    </div>
  );
}
