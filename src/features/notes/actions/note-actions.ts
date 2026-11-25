"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createNoteFormValues,
  createNoteSchema,
  idSchema,
  previewFrom,
  saveNoteSchema,
  type SaveNoteInput,
} from "@/features/notes/schemas/note";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function refreshNotebook(noteId?: string) {
  revalidatePath("/app/notes");
  if (noteId) revalidatePath(`/app/notes/${noteId}`);
  revalidatePath("/app/search");
  revalidatePath("/app/dashboard");
}

export async function createNoteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createNoteSchema.safeParse(createNoteFormValues(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revise os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { kind, title, courseId, lessonDate } = parsed.data;

  let professor: string | null = null;
  if (courseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("id,instructor_name")
      .eq("id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!course) return { status: "error", message: "Disciplina não encontrada." };
    professor = course.instructor_name;
  }

  let lessonId: string | null = null;
  if (kind === "lesson" && lessonDate) {
    const { data: lesson, error } = await supabase
      .from("lessons")
      .insert({ user_id: user.id, course_id: courseId, lesson_date: lessonDate, title, professor })
      .select("id")
      .single();
    if (error || !lesson) return { status: "error", message: "Não foi possível registrar a aula. Verifique se a migração do Atlas foi aplicada." };
    lessonId = lesson.id;
  }

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      course_id: courseId,
      lesson_id: lessonId,
      title,
      content: "",
      content_format: "html",
      plain_text: "",
      plain_text_preview: "",
    })
    .select("id")
    .single();

  if (error || !note) {
    if (lessonId) await supabase.from("lessons").delete().eq("id", lessonId).eq("user_id", user.id);
    return { status: "error", message: "Não foi possível criar a anotação." };
  }

  refreshNotebook();
  redirect(`/app/notes/${note.id}`);
}

export type SaveNoteResult =
  | { status: "saved"; savedAt: string; lessonId: string | null }
  | { status: "error"; message: string };

export async function saveNoteAction(input: SaveNoteInput): Promise<SaveNoteResult> {
  const user = await requireUser();
  const parsed = saveNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("notes")
    .select("id,lesson_id")
    .eq("id", data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { status: "error", message: "Anotação não encontrada." };

  if (data.courseId) {
    const { count } = await supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("id", data.courseId)
      .eq("user_id", user.id);
    if (count !== 1) return { status: "error", message: "Disciplina não encontrada." };
  }

  let lessonId = existing.lesson_id;
  if (data.lesson) {
    const lessonValues = {
      course_id: data.courseId,
      lesson_date: data.lesson.lessonDate,
      title: data.title,
      professor: data.lesson.professor,
      topic: data.lesson.topic,
      unit: data.lesson.unit,
    };
    if (lessonId) {
      const { error } = await supabase.from("lessons").update(lessonValues).eq("id", lessonId).eq("user_id", user.id);
      if (error) return { status: "error", message: "Não foi possível salvar os dados da aula." };
    } else {
      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({ user_id: user.id, ...lessonValues })
        .select("id")
        .single();
      if (error || !lesson) return { status: "error", message: "Não foi possível registrar a aula." };
      lessonId = lesson.id;
    }
  }

  const { data: saved, error } = await supabase
    .from("notes")
    .update({
      title: data.title,
      content: data.contentHtml,
      content_format: "html",
      plain_text: data.plainText,
      plain_text_preview: previewFrom(data.plainText),
      course_id: data.courseId,
      lesson_id: lessonId,
      tags: data.tags,
      key_points: data.keyPoints,
      memorize: data.memorize,
      doubts: data.doubts,
      professor_remarks: data.professorRemarks,
      references_text: data.referencesText,
    })
    .eq("id", data.id)
    .eq("user_id", user.id)
    .select("updated_at")
    .single();

  if (error || !saved) return { status: "error", message: "Não foi possível salvar. Tentaremos novamente." };

  // No revalidatePath here: autosave runs every few seconds and the editor
  // owns its state. Every Atlas page is dynamic, so other views read fresh data.
  return { status: "saved", savedAt: saved.updated_at, lessonId };
}

export async function toggleNoteFlagAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  const field = String(formData.get("field") ?? "");
  if (!id.success || !["favorite", "pinned"].includes(field)) return;
  const supabase = await createClient();
  const { data: note } = await supabase.from("notes").select("favorite,pinned").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  if (!note) return;
  const update = field === "favorite" ? { favorite: !note.favorite } : { pinned: !note.pinned };
  await supabase.from("notes").update(update).eq("id", id.data).eq("user_id", user.id);
  refreshNotebook(id.data);
}

/**
 * Deletes a note. Attached materials stay in the library (their note link is
 * cleared by the database). When the note was the only record of its lesson,
 * the lesson is removed too, unless materials still point at it.
 */
export async function deleteNoteAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();

  const { data: note } = await supabase.from("notes").select("id,lesson_id").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  if (!note) return;

  await supabase.from("notes").delete().eq("id", note.id).eq("user_id", user.id);

  if (note.lesson_id) {
    const [{ count: otherNotes }, { count: materials }] = await Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("lesson_id", note.lesson_id).eq("user_id", user.id),
      supabase.from("materials").select("id", { count: "exact", head: true }).eq("lesson_id", note.lesson_id).eq("user_id", user.id),
    ]);
    if ((otherNotes ?? 0) === 0 && (materials ?? 0) === 0) {
      await supabase.from("lessons").delete().eq("id", note.lesson_id).eq("user_id", user.id);
    }
  }

  refreshNotebook();
  if (formData.get("redirectTo") === "notebook") redirect("/app/notes");
}
