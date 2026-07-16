"use server";

import { revalidatePath } from "next/cache";

import {
  idSchema,
  semesterFormValues,
  semesterInputSchema,
  semesterMutationSchema,
} from "@/features/academic/schemas/academic";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function errorState(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

function refreshAcademic() {
  revalidatePath("/app/academic");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/export");
}

export async function createSemesterAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = semesterInputSchema.safeParse(semesterFormValues(formData));
  if (!parsed.success) {
    return errorState(
      "Please correct the semester form.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("academic_semesters").insert({
    user_id: user.id,
    semester_name: parsed.data.semesterName,
    academic_year: parsed.data.academicYear,
    gpa: parsed.data.gpa,
    total_credits: parsed.data.totalCredits,
    notes: parsed.data.notes,
    sort_order: parsed.data.sortOrder,
  });

  if (error) return errorState("The semester result could not be added.");
  refreshAcademic();
  return { status: "success", message: "Semester GPA added." };
}

export async function updateSemesterAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = semesterMutationSchema.safeParse({
    id: formData.get("id"),
    ...semesterFormValues(formData),
  });
  if (!parsed.success) {
    return errorState(
      "Please correct the semester form.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("academic_semesters")
    .update({
      semester_name: parsed.data.semesterName,
      academic_year: parsed.data.academicYear,
      gpa: parsed.data.gpa,
      total_credits: parsed.data.totalCredits,
      notes: parsed.data.notes,
      sort_order: parsed.data.sortOrder,
    }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error || count !== 1) {
    return errorState("The semester result could not be updated.");
  }
  refreshAcademic();
  return { status: "success", message: "Semester GPA updated." };
}

export async function deleteSemesterAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase
    .from("academic_semesters")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id);
  refreshAcademic();
}
