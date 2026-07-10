"use server";

import { revalidatePath } from "next/cache";

import { preferenceFormValues, preferenceInputSchema, profileFormValues, profileInputSchema } from "@/features/settings/schemas/settings";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function errorState(message: string, fieldErrors?: Record<string, string[] | undefined>): ActionState {
  return { status: "error", message, fieldErrors };
}

function refreshSettings() {
  revalidatePath("/app/settings");
  revalidatePath("/app", "layout");
  revalidatePath("/app/dashboard");
}

export async function updateProfileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileInputSchema.safeParse(profileFormValues(formData));
  if (!parsed.success) return errorState("Please correct the profile form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: parsed.data.fullName,
    university_name: parsed.data.universityName,
    department: parsed.data.department,
    academic_year: parsed.data.academicYear,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (error) return errorState("Your profile could not be updated.");
  refreshSettings();
  return { status: "success", message: "Profile updated." };
}

export async function updatePreferencesAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = preferenceInputSchema.safeParse(preferenceFormValues(formData));
  if (!parsed.success) return errorState("Please correct the preferences form.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: user.id,
    currency_code: parsed.data.currencyCode,
    time_zone: parsed.data.timeZone,
    date_format: parsed.data.dateFormat,
    week_starts_on: parsed.data.weekStartsOn,
    daily_study_goal_minutes: parsed.data.dailyStudyGoalMinutes,
    weekly_study_goal_minutes: parsed.data.weeklyStudyGoalMinutes,
    theme: parsed.data.theme,
    assignment_reminders: parsed.data.assignmentReminders,
    task_reminders: parsed.data.taskReminders,
    habit_reminders: parsed.data.habitReminders,
    budget_alerts: parsed.data.budgetAlerts,
    study_goal_alerts: parsed.data.studyGoalAlerts,
  });
  if (error) return errorState("Your preferences could not be updated.");
  refreshSettings();
  return { status: "success", message: "Preferences updated." };
}
