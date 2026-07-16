"use server";

import { revalidatePath } from "next/cache";

import {
  examFormValues,
  examInputSchema,
  examMutationSchema,
  idSchema,
  timetableFormValues,
  timetableInputSchema,
  timetableMutationSchema,
} from "@/features/schedule/schemas/schedule";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function errorState(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

function refreshSchedule() {
  revalidatePath("/app/schedule");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/export");
}

export async function createTimetableAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = timetableInputSchema.safeParse(timetableFormValues(formData));
  if (!parsed.success) {
    return errorState(
      "Please correct the class form.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("class_timetable_entries").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    day_of_week: parsed.data.dayOfWeek,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    location: parsed.data.location,
    instructor_name: parsed.data.instructorName,
    notes: parsed.data.notes,
    active: parsed.data.active,
  });

  if (error) return errorState("The class could not be added.");
  refreshSchedule();
  return { status: "success", message: "Class added to the timetable." };
}

export async function updateTimetableAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = timetableMutationSchema.safeParse({
    id: formData.get("id"),
    ...timetableFormValues(formData),
  });
  if (!parsed.success) {
    return errorState(
      "Please correct the class form.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("class_timetable_entries")
    .update({
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      day_of_week: parsed.data.dayOfWeek,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      location: parsed.data.location,
      instructor_name: parsed.data.instructorName,
      notes: parsed.data.notes,
      active: parsed.data.active,
    }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error || count !== 1) return errorState("The class could not be updated.");
  refreshSchedule();
  return { status: "success", message: "Class updated." };
}

export async function deleteTimetableAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase
    .from("class_timetable_entries")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id);
  refreshSchedule();
}

export async function createExamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = examInputSchema.safeParse(examFormValues(formData));
  if (!parsed.success) {
    return errorState(
      "Please correct the exam form.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("exam_schedules").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    exam_type: parsed.data.examType,
    exam_date: parsed.data.examDate,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    location: parsed.data.location,
    seat_info: parsed.data.seatInfo,
    notes: parsed.data.notes,
  });

  if (error) return errorState("The exam could not be added.");
  refreshSchedule();
  return { status: "success", message: "Exam added to the schedule." };
}

export async function updateExamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = examMutationSchema.safeParse({
    id: formData.get("id"),
    ...examFormValues(formData),
  });
  if (!parsed.success) {
    return errorState(
      "Please correct the exam form.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("exam_schedules")
    .update({
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      exam_type: parsed.data.examType,
      exam_date: parsed.data.examDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      location: parsed.data.location,
      seat_info: parsed.data.seatInfo,
      notes: parsed.data.notes,
    }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error || count !== 1) return errorState("The exam could not be updated.");
  refreshSchedule();
  return { status: "success", message: "Exam updated." };
}

export async function deleteExamAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase
    .from("exam_schedules")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id);
  refreshSchedule();
}
