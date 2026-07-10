import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { TaskManager } from "@/features/tasks/components/task-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title="My tasks"
        description="Create, edit, complete, reopen and delete tasks. Every change is stored securely in your Supabase account."
      />

      {error ? (
        <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">Tasks could not be loaded.</p>
          <p className="mt-1 text-sm">
            Confirm that all database migrations were applied and then refresh
            this page.
          </p>
        </div>
      ) : (
        <div className="mt-7">
          <TaskManager tasks={tasks ?? []} />
        </div>
      )}
    </PageContainer>
  );
}
