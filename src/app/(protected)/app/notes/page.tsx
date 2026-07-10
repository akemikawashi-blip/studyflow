import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { NotesManager } from "@/features/notes/components/notes-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function NotesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: notes, error: noteError }, { data: courses, error: courseError }] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", user.id).order("pinned", { ascending: false }).order("updated_at", { ascending: false }),
    supabase.from("courses").select("*").eq("user_id", user.id).order("course_code"),
  ]);
  const error = noteError || courseError;

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader title="Notes" description="Create, edit, pin, favorite and search notes stored privately in Supabase." />
      {error ? <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container"><p className="font-semibold">Notes could not be loaded.</p><p className="mt-1 text-sm">Confirm that the complete database migration is installed.</p></div> : <div className="mt-7"><NotesManager notes={notes ?? []} courses={courses ?? []} /></div>}
    </PageContainer>
  );
}
