"use server";

import { revalidatePath } from "next/cache";

import {
  skillFormValues,
  skillIdSchema,
  skillInputSchema,
  skillMutationSchema,
} from "@/features/skills/schemas/skill";
import { requireUser } from "@/lib/auth/current-user";
import type { ActionState } from "@/lib/forms/action-state";
import { createClient } from "@/lib/supabase/server";

function refreshSkillPages() {
  revalidatePath("/app/skills");
  revalidatePath("/app/dashboard");
}

export async function createSkillAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = skillInputSchema.safeParse(skillFormValues(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("skills").insert({
    user_id: user.id,
    title: parsed.data.title,
    category: parsed.data.category,
    description: parsed.data.description,
    motivation: parsed.data.motivation,
    current_level: parsed.data.currentLevel,
    target_level: parsed.data.targetLevel,
    status: parsed.data.status,
    target_date: parsed.data.targetDate,
    weekly_target_minutes: parsed.data.weeklyTargetMinutes,
    next_action: parsed.data.nextAction,
  });

  if (error) {
    return {
      status: "error",
      message: "The skill could not be created. Please try again.",
    };
  }

  refreshSkillPages();
  return { status: "success", message: "Skill added successfully." };
}

export async function updateSkillAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = skillMutationSchema.safeParse({
    id: formData.get("id"),
    ...skillFormValues(formData),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("skills")
    .update(
      {
        title: parsed.data.title,
        category: parsed.data.category,
        description: parsed.data.description,
        motivation: parsed.data.motivation,
        current_level: parsed.data.currentLevel,
        target_level: parsed.data.targetLevel,
        status: parsed.data.status,
        target_date: parsed.data.targetDate,
        weekly_target_minutes: parsed.data.weeklyTargetMinutes,
        next_action: parsed.data.nextAction,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error || count !== 1) {
    return { status: "error", message: "The skill could not be updated." };
  }

  refreshSkillPages();
  return { status: "success", message: "Skill updated." };
}

export async function deleteSkillAction(formData: FormData) {
  const user = await requireUser();
  const parsedId = skillIdSchema.safeParse(formData.get("id"));

  if (!parsedId.success) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("skills")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  refreshSkillPages();
}
