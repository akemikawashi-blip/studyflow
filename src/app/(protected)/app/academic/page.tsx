import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { AcademicManager } from "@/features/academic/components/academic-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function AcademicPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: semesters, error } = await supabase
    .from("academic_semesters")
    .select("*")
    .eq("user_id", user.id)
    .not("gpa", "is", null)
    .order("sort_order")
    .order("created_at");

  return (
    <PageContainer>
      <PageHeader
        title="GPA & CGPA"
        description="Save the GPA and completed credits for each semester. Atlas Acadêmico calculates your overall credit-weighted CGPA automatically."
      />
      {error ? (
        <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">Academic data could not be loaded.</p>
          <p className="mt-1 text-sm">
            Run supabase/phase3-academic-tools.sql in the Supabase SQL Editor,
            then refresh this page.
          </p>
        </div>
      ) : (
        <div className="mt-7">
          <AcademicManager semesters={semesters ?? []} />
        </div>
      )}
    </PageContainer>
  );
}
