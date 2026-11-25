"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { courseFormValues, courseSchema, semesterFormValues, semesterSchema } from "@/features/courses/lib/course-schema";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

function refresh(courseId?: string) {
  revalidatePath("/app/courses");
  if (courseId) revalidatePath(`/app/courses/${courseId}`);
  revalidatePath("/app/dashboard");
}

function invalid(error: z.ZodError): ActionState {
  return { status: "error", message: "Revise os campos destacados.", fieldErrors: error.flatten().fieldErrors as Record<string, string[]> };
}

export async function saveCourseAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = courseSchema.safeParse(courseFormValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  const supabase = await createClient();

  if (data.semesterId) {
    const { count } = await supabase.from("academic_semesters").select("id", { count: "exact", head: true }).eq("id", data.semesterId).eq("user_id", user.id);
    if (count !== 1) return { status: "error", message: "Semestre não encontrado." };
  }

  const values = {
    course_name: data.courseName,
    // course_code is required by the schema; without a code the name is used as-is.
    course_code: data.courseCode || data.courseName.slice(0, 30),
    instructor_name: data.instructorName,
    semester_id: data.semesterId,
    color: data.color,
    credit_hours: data.workload,
    description: data.description,
    references_text: data.referencesText,
    difficulties: data.difficulties,
    review_topics: data.reviewTopics,
  };

  if (data.id) {
    const { error, count } = await supabase.from("courses").update(values, { count: "exact" }).eq("id", data.id).eq("user_id", user.id);
    if (error || count !== 1) return { status: "error", message: "Não foi possível salvar a disciplina." };
    refresh(data.id);
    return { status: "success", message: "Disciplina atualizada." };
  }

  const { data: last } = await supabase.from("courses").select("sort_order").eq("user_id", user.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("courses").insert({ user_id: user.id, ...values, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return { status: "error", message: "Não foi possível criar a disciplina." };
  refresh();
  return { status: "success", message: "Disciplina criada." };
}

export async function toggleCourseArchiveAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("archived").eq("id", id.data).eq("user_id", user.id).maybeSingle();
  if (!course) return;
  await supabase.from("courses").update({ archived: !course.archived }).eq("id", id.data).eq("user_id", user.id);
  refresh(id.data);
}

/** Linked lessons, notes, materials, exams and tasks are kept (their link is cleared). */
export async function deleteCourseAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("courses").delete().eq("id", id.data).eq("user_id", user.id);
  refresh();
  if (formData.get("redirectTo") === "courses") redirect("/app/courses");
}

/** Moves a course one position up or down within its own group (same semester, same archive state). */
export async function moveCourseAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!id.success) return;
  const supabase = await createClient();
  const { data: courses } = await supabase.from("courses").select("id,sort_order,course_name,semester_id,archived").eq("user_id", user.id).order("sort_order").order("course_name");
  const current = courses?.find((course) => course.id === id.data);
  if (!courses || !current) return;

  // Normalize first so every course has a distinct position.
  const positions = new Map(courses.map((course, position) => [course.id, position]));
  const group = courses.filter((course) => course.semester_id === current.semester_id && course.archived === current.archived);
  const index = group.findIndex((course) => course.id === current.id);
  const target = index + direction;
  if (target < 0 || target >= group.length) return;
  const a = group[index].id;
  const b = group[target].id;
  const positionA = positions.get(a)!;
  positions.set(a, positions.get(b)!);
  positions.set(b, positionA);

  await Promise.all(
    courses
      .filter((course) => course.sort_order !== positions.get(course.id))
      .map((course) => supabase.from("courses").update({ sort_order: positions.get(course.id)! }).eq("id", course.id).eq("user_id", user.id)),
  );
  refresh();
}

export async function saveSemesterAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = semesterSchema.safeParse(semesterFormValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  const supabase = await createClient();

  if (data.isCurrent) {
    let clear = supabase.from("academic_semesters").update({ is_current: false }).eq("user_id", user.id).eq("is_current", true);
    if (data.id) clear = clear.neq("id", data.id);
    await clear;
  }

  const values = {
    semester_name: data.name,
    academic_year: data.academicYear,
    start_date: data.startDate,
    end_date: data.endDate,
    is_current: data.isCurrent,
  };

  const { error } = data.id
    ? await supabase.from("academic_semesters").update(values).eq("id", data.id).eq("user_id", user.id)
    : await supabase.from("academic_semesters").insert({ user_id: user.id, ...values });
  if (error) return { status: "error", message: "Não foi possível salvar o semestre." };
  refresh();
  revalidatePath("/app/academic");
  return { status: "success", message: data.id ? "Semestre atualizado." : "Semestre criado." };
}

/** Courses of a deleted semester stay, just without a semester. */
export async function deleteSemesterAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("academic_semesters").delete().eq("id", id.data).eq("user_id", user.id);
  refresh();
  revalidatePath("/app/academic");
}
