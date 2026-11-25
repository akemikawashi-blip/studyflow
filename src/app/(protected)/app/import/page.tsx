import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ImportCenter } from "@/features/import/components/import-center";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Importar" };

export default async function ImportPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [semesters, events, profile] = await Promise.all([
    supabase.from("academic_semesters").select("id,semester_name,institution,is_current,start_date,created_at").eq("user_id", user.id),
    supabase.from("calendar_events").select("source").eq("user_id", user.id).not("source", "is", null),
    supabase.from("profiles").select("university_name").eq("id", user.id).maybeSingle(),
  ]);

  const counts = new Map<string, number>();
  for (const event of events.data ?? []) if (event.source) counts.set(event.source, (counts.get(event.source) ?? 0) + 1);
  const sortedSemesters = [...(semesters.data ?? [])].sort((a, b) => Number(b.is_current) - Number(a.is_current) || (b.start_date ?? "").localeCompare(a.start_date ?? ""));

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader eyebrow="Sistema" title="Importar dados" description="Traga o calendário da universidade e a matriz curricular para o Atlas em poucos passos." />
      {semesters.error || events.error ? (
        <div className="mt-7 rounded-xl bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">O importador não pôde ser carregado.</p>
          <p className="mt-1 text-sm">Confirme que supabase/atlas-upgrade.sql foi aplicado no Supabase.</p>
        </div>
      ) : (
        <div className="mt-6">
          <ImportCenter
            semesters={sortedSemesters.map(({ id, semester_name, institution, is_current }) => ({ id, semester_name, institution, is_current }))}
            sources={[...counts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => a.source.localeCompare(b.source, "pt-BR"))}
            defaultInstitution={profile.data?.university_name ?? ""}
          />
        </div>
      )}
    </PageContainer>
  );
}
