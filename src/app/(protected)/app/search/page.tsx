import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { GlobalSearch } from "@/features/search/components/global-search";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function SearchPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [tasks, assignments, courses, notes, skills, sessions, transactions] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(250),
    supabase.from("assignments").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(250),
    supabase.from("courses").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(250),
    supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(250),
    supabase.from("skills").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(250),
    supabase.from("study_sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(250),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }).limit(250),
  ]);
  const error = [tasks, assignments, courses, notes, skills, sessions, transactions].find((result) => result.error)?.error;

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Search" description="Search your live StudyFlow records across every major module." />
      {error ? <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container"><p className="font-semibold">Search records could not be loaded.</p></div> : <div className="mt-7"><GlobalSearch tasks={tasks.data ?? []} assignments={assignments.data ?? []} courses={courses.data ?? []} notes={notes.data ?? []} skills={skills.data ?? []} sessions={sessions.data ?? []} transactions={transactions.data ?? []} /></div>}
    </PageContainer>
  );
}
