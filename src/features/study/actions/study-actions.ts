"use server";

import { revalidatePath } from "next/cache";

import { idSchema, studySessionFormValues, studySessionInputSchema, studySessionMutationSchema } from "@/features/study/schemas/study";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function errorState(message: string, fieldErrors?: Record<string, string[] | undefined>): ActionState {
  return { status: "error", message, fieldErrors };
}

function refreshStudy() {
  revalidatePath("/app/study");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/search");
}

export async function createStudySessionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = studySessionInputSchema.safeParse(studySessionFormValues(formData));
  if (!parsed.success) return errorState("Please correct the study session form.", parsed.error.flatten().fieldErrors);
  if (parsed.data.durationMinutes === 0 && parsed.data.accumulatedSeconds === 0) {
    return errorState("Record at least one minute or run the timer before saving.", { durationMinutes: ["Duration is required."] });
  }

  const endedAt = new Date();
  const startedAt = parsed.data.startedAt
    ? new Date(parsed.data.startedAt)
    : new Date(endedAt.getTime() - Math.max(parsed.data.accumulatedSeconds, parsed.data.durationMinutes * 60) * 1000);
  const supabase = await createClient();
  const { error } = await supabase.from("study_sessions").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    session_type: parsed.data.sessionType,
    status: "completed",
    title: parsed.data.title,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    accumulated_seconds: parsed.data.accumulatedSeconds || parsed.data.durationMinutes * 60,
    duration_minutes: parsed.data.durationMinutes || Math.ceil(parsed.data.accumulatedSeconds / 60),
    focus_rating: parsed.data.focusRating,
    notes: parsed.data.notes,
  });
  if (error) return errorState("The study session could not be saved.");
  refreshStudy();
  return { status: "success", message: "Study session saved." };
}

export async function updateStudySessionAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = studySessionMutationSchema.safeParse({ id: formData.get("id"), ...studySessionFormValues(formData) });
  if (!parsed.success) return errorState("Please correct the study session form.", parsed.error.flatten().fieldErrors);
  if (parsed.data.durationMinutes === 0) return errorState("Duration must be at least one minute.", { durationMinutes: ["Duration is required."] });

  const supabase = await createClient();
  const { error, count } = await supabase.from("study_sessions").update({
    course_id: parsed.data.courseId,
    session_type: parsed.data.sessionType,
    title: parsed.data.title,
    duration_minutes: parsed.data.durationMinutes,
    accumulated_seconds: parsed.data.durationMinutes * 60,
    focus_rating: parsed.data.focusRating,
    notes: parsed.data.notes,
  }, { count: "exact" }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error || count !== 1) return errorState("The study session could not be updated.");
  refreshStudy();
  return { status: "success", message: "Study session updated." };
}

export async function deleteStudySessionAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("study_sessions").delete().eq("id", id.data).eq("user_id", user.id);
  refreshStudy();
}
