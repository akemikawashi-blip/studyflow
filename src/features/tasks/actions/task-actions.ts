"use server";

import { revalidatePath } from "next/cache";

import {
  taskFormValues,
  taskIdSchema,
  taskInputSchema,
  taskMutationSchema,
} from "@/features/tasks/schemas/task";
import type { ActionState } from "@/lib/forms/action-state";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

function validationState(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

function refreshTaskPages() {
  revalidatePath("/app/tasks");
  revalidatePath("/app/dashboard");
}

export async function createTaskAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = taskInputSchema.safeParse(taskFormValues(formData));

  if (!parsed.success) {
    return validationState(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    priority: parsed.data.priority,
    due_date: parsed.data.dueDate,
    due_time: parsed.data.dueTime,
    estimated_minutes: parsed.data.estimatedMinutes,
  });

  if (error) {
    return validationState("The task could not be created. Please try again.");
  }

  refreshTaskPages();
  return { status: "success", message: "Task added successfully." };
}

export async function updateTaskAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = taskMutationSchema.safeParse({
    id: formData.get("id"),
    ...taskFormValues(formData),
  });

  if (!parsed.success) {
    return validationState(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("tasks")
    .update(
      {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        due_date: parsed.data.dueDate,
        due_time: parsed.data.dueTime,
        estimated_minutes: parsed.data.estimatedMinutes,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error || count !== 1) {
    return validationState("The task could not be updated.");
  }

  refreshTaskPages();
  return { status: "success", message: "Task updated." };
}

export async function toggleTaskAction(formData: FormData) {
  const user = await requireUser();
  const parsedId = taskIdSchema.safeParse(formData.get("id"));

  if (!parsedId.success) {
    return;
  }

  const supabase = await createClient();
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError || !task) {
    return;
  }

  const completed = task.status !== "completed";

  await supabase
    .from("tasks")
    .update({
      status: completed ? "completed" : "todo",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  refreshTaskPages();
}

export async function deleteTaskAction(formData: FormData) {
  const user = await requireUser();
  const parsedId = taskIdSchema.safeParse(formData.get("id"));

  if (!parsedId.success) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("tasks")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  refreshTaskPages();
}
