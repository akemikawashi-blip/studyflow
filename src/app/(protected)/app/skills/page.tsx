import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SkillManager } from "@/features/skills/components/skill-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function SkillsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: skills, error } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <PageContainer>
      <PageHeader
        title="Skills"
        description="Create, edit and delete learning goals. Your records are private and remain available after refresh or sign-in."
      />

      {error ? (
        <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">Skills could not be loaded.</p>
          <p className="mt-1 text-sm">
            Confirm that all database migrations were applied and refresh this
            page.
          </p>
        </div>
      ) : (
        <div className="mt-7">
          <SkillManager skills={skills ?? []} />
        </div>
      )}
    </PageContainer>
  );
}
