import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationManager } from "@/features/notifications/components/notification-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

function dateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: preferences }, { data: tasks }, { data: assignments }] = await Promise.all([
    supabase.from("user_preferences").select("time_zone,task_reminders,assignment_reminders").eq("user_id", user.id).maybeSingle(),
    supabase.from("tasks").select("id,title,due_date,due_time,status,priority").eq("user_id", user.id).not("due_date", "is", null).neq("status", "completed").neq("status", "cancelled").order("due_date").limit(100),
    supabase.from("assignments").select("id,title,due_date,due_time,submission_status,priority").eq("user_id", user.id).not("submission_status", "in", "(submitted,graded)").order("due_date").limit(100),
  ]);

  const today = dateKey(new Date(), preferences?.time_zone || "Asia/Dhaka");
  const candidates: NotificationInsert[] = [];
  if (preferences?.task_reminders !== false) {
    for (const task of tasks ?? []) {
      if (!task.due_date) continue;
      const days = daysBetween(today, task.due_date);
      if (days > 2) continue;
      const overdue = days < 0;
      candidates.push({
        user_id: user.id,
        type: overdue ? "task_overdue" : "task_due",
        title: overdue ? "Task overdue" : days === 0 ? "Task due today" : days === 1 ? "Task due tomorrow" : "Task due soon",
        message: `${task.title}${task.due_time ? ` at ${task.due_time.slice(0, 5)}` : ""}.`,
        link: "/app/tasks",
        source_key: `task-${task.id}-${task.due_date}`,
      });
    }
  }
  if (preferences?.assignment_reminders !== false) {
    for (const assignment of assignments ?? []) {
      const days = daysBetween(today, assignment.due_date);
      if (days > 3) continue;
      const overdue = days < 0;
      candidates.push({
        user_id: user.id,
        type: overdue ? "assignment_overdue" : "assignment_due",
        title: overdue ? "Assignment overdue" : days === 0 ? "Assignment due today" : days === 1 ? "Assignment due tomorrow" : "Assignment approaching",
        message: `${assignment.title}${assignment.due_time ? ` at ${assignment.due_time.slice(0, 5)}` : ""}.`,
        link: "/app/planner",
        source_key: `assignment-${assignment.id}-${assignment.due_date}`,
      });
    }
  }

  if (candidates.length > 0) {
    const keys = candidates.map((item) => item.source_key).filter((value): value is string => Boolean(value));
    const { data: existing } = await supabase
      .from("notifications")
      .select("id,source_key")
      .eq("user_id", user.id)
      .in("source_key", keys);
    const existingByKey = new Map(
      (existing ?? []).map((item) => [item.source_key, item.id]),
    );
    const missing = candidates.filter(
      (item) => item.source_key && !existingByKey.has(item.source_key),
    );
    const updates = candidates.flatMap((item) => {
      const id = item.source_key ? existingByKey.get(item.source_key) : undefined;
      if (!id) return [];
      return [
        supabase
          .from("notifications")
          .update({
            type: item.type,
            title: item.title,
            message: item.message,
            link: item.link,
          })
          .eq("id", id)
          .eq("user_id", user.id),
      ];
    });
    if (updates.length > 0) await Promise.all(updates);
    if (missing.length > 0) await supabase.from("notifications").insert(missing);
  }

  const { data: notifications, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("read", { ascending: true }).order("created_at", { ascending: false }).limit(200);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Notifications" description="Task and assignment reminders are generated from your live records and stored in your account." />
      {error ? <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container"><p className="font-semibold">Notifications could not be loaded.</p></div> : <div className="mt-7"><NotificationManager notifications={notifications ?? []} /></div>}
    </PageContainer>
  );
}
