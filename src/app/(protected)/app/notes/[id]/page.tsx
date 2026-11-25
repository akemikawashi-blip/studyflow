import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { NoteWorkspace } from "@/features/notes/components/note-workspace";
import { requireUser } from "@/lib/auth/current-user";
import { dateKey } from "@/lib/dates";
import { getTimeZone } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Anotação" };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const user = await requireUser();
  const supabase = await createClient();

  const { data: note, error } = await supabase.from("notes").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) {
    return (
      <PageContainer className="max-w-3xl">
        <div className="rounded-xl bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">Não foi possível abrir a anotação.</p>
          <p className="mt-1 text-sm">Confirme que a migração do Atlas (supabase/atlas-upgrade.sql) foi aplicada no banco.</p>
        </div>
      </PageContainer>
    );
  }
  if (!note) notFound();

  const materialFilter = note.lesson_id ? `note_id.eq.${note.id},lesson_id.eq.${note.lesson_id}` : `note_id.eq.${note.id}`;

  const [{ data: lesson }, { data: courses }, { data: materials }, timeZone] = await Promise.all([
    note.lesson_id
      ? supabase.from("lessons").select("*").eq("id", note.lesson_id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("courses").select("id,course_code,course_name,instructor_name,color,archived").eq("user_id", user.id).order("sort_order").order("course_name"),
    supabase.from("materials").select("*").eq("user_id", user.id).or(materialFilter).order("created_at", { ascending: false }),
    getTimeZone(supabase, user.id),
  ]);

  return (
    <PageContainer className="max-w-[1320px]">
      <NoteWorkspace
        note={note}
        lesson={lesson ?? null}
        courses={courses ?? []}
        initialMaterials={materials ?? []}
        todayKey={dateKey(new Date(), timeZone)}
        timeZone={timeZone}
      />
    </PageContainer>
  );
}
