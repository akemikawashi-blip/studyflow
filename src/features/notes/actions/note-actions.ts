"use server";

import { revalidatePath } from "next/cache";

import { idSchema, noteFormValues, noteInputSchema, noteMutationSchema } from "@/features/notes/schemas/note";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function errorState(message: string, fieldErrors?: Record<string, string[] | undefined>): ActionState {
  return { status: "error", message, fieldErrors };
}

function preview(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 240);
}

function refreshNotes() {
  revalidatePath("/app/notes");
  revalidatePath("/app/search");
  revalidatePath("/app/dashboard");
}

export async function createNoteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = noteInputSchema.safeParse(noteFormValues(formData));
  if (!parsed.success) return errorState("Please correct the note form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    content: parsed.data.content,
    plain_text_preview: preview(parsed.data.content),
    tags: parsed.data.tags,
    favorite: parsed.data.favorite,
    pinned: parsed.data.pinned,
  });
  if (error) return errorState("The note could not be created.");
  refreshNotes();
  return { status: "success", message: "Note saved." };
}

export async function updateNoteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = noteMutationSchema.safeParse({ id: formData.get("id"), ...noteFormValues(formData) });
  if (!parsed.success) return errorState("Please correct the note form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error, count } = await supabase.from("notes").update({
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    content: parsed.data.content,
    plain_text_preview: preview(parsed.data.content),
    tags: parsed.data.tags,
    favorite: parsed.data.favorite,
    pinned: parsed.data.pinned,
  }, { count: "exact" }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error || count !== 1) return errorState("The note could not be updated.");
  refreshNotes();
  return { status: "success", message: "Note updated." };
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
  refreshNotes();
}

export async function deleteNoteAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", id.data).eq("user_id", user.id);
  refreshNotes();
}
