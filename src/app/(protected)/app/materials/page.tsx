import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { MaterialsLibrary } from "@/features/materials/components/materials-library";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Materiais" };

export default async function MaterialsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [materials, courses, lessons, exams, notes] = await Promise.all([
    supabase.from("materials").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3000),
    supabase.from("courses").select("id,course_name,color,archived").eq("user_id", user.id).order("sort_order").order("course_name"),
    supabase.from("lessons").select("id,title,lesson_date,course_id").eq("user_id", user.id).order("lesson_date", { ascending: false }),
    supabase.from("exam_schedules").select("id,title,exam_date,course_id").eq("user_id", user.id).order("exam_date", { ascending: false }),
    supabase.from("notes").select("id,title").eq("user_id", user.id),
  ]);
  const error = materials.error || courses.error || lessons.error || exams.error;

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader eyebrow="Biblioteca acadêmica" title="Materiais" description="PDFs, slides, fotos, livros, artigos, resumos, mapas mentais e referências — ligados às suas disciplinas, aulas e avaliações." />
      {error ? (
        <div className="mt-7 rounded-xl bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">A biblioteca não pôde ser carregada.</p>
          <p className="mt-1 text-sm">Confirme que supabase/atlas-upgrade.sql foi aplicado no Supabase.</p>
        </div>
      ) : (
        <div className="mt-6">
          <MaterialsLibrary
            initialMaterials={materials.data ?? []}
            courses={(courses.data ?? []).map(({ id, course_name, color }) => ({ id, course_name, color }))}
            lessons={lessons.data ?? []}
            exams={exams.data ?? []}
            noteTitles={Object.fromEntries((notes.data ?? []).map((note) => [note.id, note.title]))}
          />
        </div>
      )}
    </PageContainer>
  );
}
