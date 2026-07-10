"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

function refreshNotifications() {
  revalidatePath("/app/notifications");
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id.data).eq("user_id", user.id);
  refreshNotifications();
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  refreshNotifications();
}

export async function deleteNotificationAction(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id.data).eq("user_id", user.id);
  refreshNotifications();
}

export async function clearReadNotificationsAction() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("user_id", user.id).eq("read", true);
  refreshNotifications();
}
