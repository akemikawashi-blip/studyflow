"use server";

import { revalidatePath } from "next/cache";

import {
  assignmentFormValues,
  assignmentMutationSchema,
  assignmentInputSchema,
  courseFormValues,
  courseInputSchema,
  courseMutationSchema,
  eventFormValues,
  eventInputSchema,
  eventMutationSchema,
  idSchema,
} from "@/features/planner/schemas/planner";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function errorState(message: string, fieldErrors?: Record<string, string[] | undefined>): ActionState {
  return { status: "error", message, fieldErrors };
}

function refreshPlanner() {
  revalidatePath("/app/planner");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/search");
}

export async function createCourseAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = courseInputSchema.safeParse(courseFormValues(formData));
  if (!parsed.success) return errorState("Please correct the course form.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    user_id: user.id,
    course_code: parsed.data.courseCode,
    course_name: parsed.data.courseName,
    instructor_name: parsed.data.instructorName,
    semester: parsed.data.semester,
    credit_hours: parsed.data.creditHours,
    color: parsed.data.color,
    target_grade: parsed.data.targetGrade,
    current_grade: parsed.data.currentGrade,
  });
  if (error) return errorState(error.code === "23505" ? "This course already exists." : "The course could not be created.");
  refreshPlanner();
  return { status: "success", message: "Course added." };
}

export async function updateCourseAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = courseMutationSchema.safeParse({ id: formData.get("id"), ...courseFormValues(formData) });
  if (!parsed.success) return errorState("Please correct the course form.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { error, count } = await supabase.from("courses").update({
    course_code: parsed.data.courseCode,
    course_name: parsed.data.courseName,
    instructor_name: parsed.data.instructorName,
    semester: parsed.data.semester,
    credit_hours: parsed.data.creditHours,
    color: parsed.data.color,
    target_grade: parsed.data.targetGrade,
    current_grade: parsed.data.currentGrade,
  }, { count: "exact" }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error || count !== 1) return errorState("The course could not be updated.");
  refreshPlanner();
  return { status: "success", message: "Course updated." };
}

export async function deleteCourseAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("courses").delete().eq("id", id.data).eq("user_id", user.id);
  refreshPlanner();
}

export async function createAssignmentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = assignmentInputSchema.safeParse(assignmentFormValues(formData));
  if (!parsed.success) return errorState("Please correct the assignment form.", parsed.error.flatten().fieldErrors);
  if (parsed.data.obtainedMarks !== null && (parsed.data.totalMarks === null || parsed.data.obtainedMarks > parsed.data.totalMarks)) {
    return errorState("Obtained marks cannot exceed total marks.", { obtainedMarks: ["Enter a value not greater than total marks."] });
  }

  const supabase = await createClient();
  const completed = ["submitted", "graded"].includes(parsed.data.submissionStatus);
  const { error } = await supabase.from("assignments").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    description: parsed.data.description,
    assignment_type: parsed.data.assignmentType,
    assigned_date: parsed.data.assignedDate,
    due_date: parsed.data.dueDate,
    due_time: parsed.data.dueTime,
    total_marks: parsed.data.totalMarks,
    obtained_marks: parsed.data.obtainedMarks,
    submission_status: parsed.data.submissionStatus,
    priority: parsed.data.priority,
    progress_percentage: completed ? 100 : parsed.data.progressPercentage,
    submission_link: parsed.data.submissionLink,
    completed_at: completed ? new Date().toISOString() : null,
  });
  if (error) return errorState("The assignment could not be created.");
  refreshPlanner();
  return { status: "success", message: "Assignment added." };
}

export async function updateAssignmentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = assignmentMutationSchema.safeParse({ id: formData.get("id"), ...assignmentFormValues(formData) });
  if (!parsed.success) return errorState("Please correct the assignment form.", parsed.error.flatten().fieldErrors);
  if (parsed.data.obtainedMarks !== null && (parsed.data.totalMarks === null || parsed.data.obtainedMarks > parsed.data.totalMarks)) {
    return errorState("Obtained marks cannot exceed total marks.", { obtainedMarks: ["Enter a value not greater than total marks."] });
  }

  const supabase = await createClient();
  const completed = ["submitted", "graded"].includes(parsed.data.submissionStatus);
  const { error, count } = await supabase.from("assignments").update({
    course_id: parsed.data.courseId,
    title: parsed.data.title,
    description: parsed.data.description,
    assignment_type: parsed.data.assignmentType,
    assigned_date: parsed.data.assignedDate,
    due_date: parsed.data.dueDate,
    due_time: parsed.data.dueTime,
    total_marks: parsed.data.totalMarks,
    obtained_marks: parsed.data.obtainedMarks,
    submission_status: parsed.data.submissionStatus,
    priority: parsed.data.priority,
    progress_percentage: completed ? 100 : parsed.data.progressPercentage,
    submission_link: parsed.data.submissionLink,
    completed_at: completed ? new Date().toISOString() : null,
  }, { count: "exact" }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error || count !== 1) return errorState("The assignment could not be updated.");
  refreshPlanner();
  return { status: "success", message: "Assignment updated." };
}

export async function deleteAssignmentAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("assignments").delete().eq("id", id.data).eq("user_id", user.id);
  refreshPlanner();
}

export async function createEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = eventInputSchema.safeParse(eventFormValues(formData));
  if (!parsed.success) return errorState("Please correct the event form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    start_at: parsed.data.startAt,
    end_at: parsed.data.endAt,
    all_day: parsed.data.allDay,
    event_type: parsed.data.eventType,
    course_id: parsed.data.courseId,
    location: parsed.data.location,
    meeting_url: parsed.data.meetingUrl,
  });
  if (error) return errorState("The calendar event could not be created.");
  refreshPlanner();
  return { status: "success", message: "Calendar event added." };
}

export async function updateEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = eventMutationSchema.safeParse({ id: formData.get("id"), ...eventFormValues(formData) });
  if (!parsed.success) return errorState("Please correct the event form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error, count } = await supabase.from("calendar_events").update({
    title: parsed.data.title,
    description: parsed.data.description,
    start_at: parsed.data.startAt,
    end_at: parsed.data.endAt,
    all_day: parsed.data.allDay,
    event_type: parsed.data.eventType,
    course_id: parsed.data.courseId,
    location: parsed.data.location,
    meeting_url: parsed.data.meetingUrl,
  }, { count: "exact" }).eq("id", parsed.data.id).eq("user_id", user.id);
  if (error || count !== 1) return errorState("The event could not be updated.");
  refreshPlanner();
  return { status: "success", message: "Event updated." };
}

export async function deleteEventAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id.data).eq("user_id", user.id);
  refreshPlanner();
}
