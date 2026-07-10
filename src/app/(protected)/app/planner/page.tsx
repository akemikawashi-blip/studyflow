import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { PlannerManager } from "@/features/planner/components/planner-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function PlannerPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: courses, error: courseError }, { data: assignments, error: assignmentError }, { data: events, error: eventError }] = await Promise.all([
    supabase.from("courses").select("*").eq("user_id", user.id).order("course_code"),
    supabase.from("assignments").select("*").eq("user_id", user.id).order("due_date", { ascending: true }).order("created_at", { ascending: false }),
    supabase.from("calendar_events").select("*").eq("user_id", user.id).order("start_at", { ascending: true }),
  ]);
  const error = courseError || assignmentError || eventError;

  return (
    <PageContainer>
      <PageHeader title="Planner" description="Manage courses, assignments and calendar events from one persistent workspace." />
      {error ? <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container"><p className="font-semibold">Planner data could not be loaded.</p><p className="mt-1 text-sm">Apply the complete Supabase SQL migration, then refresh this page.</p></div> : <div className="mt-7"><PlannerManager courses={courses ?? []} assignments={assignments ?? []} events={events ?? []} /></div>}
    </PageContainer>
  );
}
