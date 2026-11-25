"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { EVENT_CATEGORIES } from "@/features/calendar/lib/categories";
import { requireUser } from "@/lib/auth/current-user";
import { zonedToIso } from "@/lib/dates";
import { getTimeZone } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/server";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const eventTypes = EVENT_CATEGORIES.map((item) => item.value) as [string, ...string[]];

const calendarSchema = z.object({
  source: z.string().trim().min(1, "Dê um nome ao conjunto (ex.: UENP 2027).").max(80),
  mode: z.enum(["add", "replace"]),
  rows: z
    .array(z.object({ start: dateKey, end: dateKey, title: z.string().trim().min(1).max(200), category: z.enum(eventTypes), description: z.string().max(2000).nullable() }))
    .min(1, "Nenhum item selecionado.")
    .max(500),
  semesters: z.array(z.object({ name: z.string().trim().min(1).max(120), start: dateKey, end: dateKey })).max(4),
  institution: z.string().trim().max(160).transform((value) => value || null),
});

export type ImportResult = { status: "ok"; message: string } | { status: "error"; message: string };

function refreshAll() {
  revalidatePath("/app/calendar");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/courses");
  revalidatePath("/app/import");
}

export async function importCalendarAction(input: z.input<typeof calendarSchema>): Promise<ImportResult> {
  const user = await requireUser();
  const parsed = calendarSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const supabase = await createClient();
  const timeZone = await getTimeZone(supabase, user.id);

  if (data.mode === "replace") {
    const { error } = await supabase.from("calendar_events").delete().eq("user_id", user.id).eq("source", data.source);
    if (error) return { status: "error", message: "Não foi possível substituir a importação anterior." };
  } else {
    const { count } = await supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("source", data.source);
    if ((count ?? 0) > 0) {
      return { status: "error", message: `Já existem ${count} itens de “${data.source}”. Escolha “substituir” para não duplicar, ou use outro nome.` };
    }
  }

  const { error } = await supabase.from("calendar_events").insert(
    data.rows.map((row) => ({
      user_id: user.id,
      title: row.title,
      description: row.description,
      event_type: row.category as (typeof EVENT_CATEGORIES)[number]["value"],
      all_day: true,
      start_at: zonedToIso(row.start, "00:00", timeZone),
      end_at: zonedToIso(row.end, "23:59", timeZone),
      source: data.source,
    })),
  );
  if (error) return { status: "error", message: "Não foi possível importar os itens. Confirme que supabase/atlas-upgrade.sql foi aplicado." };

  let createdSemesters = 0;
  if (data.semesters.length > 0) {
    const { data: existing } = await supabase.from("academic_semesters").select("semester_name,institution").eq("user_id", user.id);
    const missing = data.semesters.filter(
      (semester) => !(existing ?? []).some((row) => row.semester_name === semester.name && (row.institution ?? null) === data.institution),
    );
    if (missing.length > 0) {
      const { error: semesterError } = await supabase.from("academic_semesters").insert(
        missing.map((semester) => ({ user_id: user.id, semester_name: semester.name, start_date: semester.start, end_date: semester.end, institution: data.institution })),
      );
      if (semesterError) return { status: "error", message: "Os itens foram importados, mas os semestres não puderam ser criados." };
      createdSemesters = missing.length;
    }
  }

  refreshAll();
  return {
    status: "ok",
    message: `${data.rows.length} itens importados como “${data.source}”.${createdSemesters ? ` ${createdSemesters} semestre(s) criado(s).` : ""}`,
  };
}

export async function deleteCalendarSourceAction(source: string): Promise<ImportResult> {
  const user = await requireUser();
  const parsed = z.string().trim().min(1).max(80).safeParse(source);
  if (!parsed.success) return { status: "error", message: "Conjunto inválido." };
  const supabase = await createClient();
  const { error, count } = await supabase.from("calendar_events").delete({ count: "exact" }).eq("user_id", user.id).eq("source", parsed.data);
  if (error) return { status: "error", message: "Não foi possível remover os itens." };
  refreshAll();
  return { status: "ok", message: `${count ?? 0} itens de “${parsed.data}” removidos do calendário.` };
}

const coursesSchema = z.object({
  semesterId: z.string().uuid().nullable(),
  rows: z.array(z.object({ code: z.string().trim().max(30).nullable(), name: z.string().trim().min(1).max(160), hours: z.number().min(0).max(999).nullable() })).min(1, "Nenhuma disciplina selecionada.").max(80),
});

export async function importCoursesAction(input: z.input<typeof coursesSchema>): Promise<ImportResult> {
  const user = await requireUser();
  const parsed = coursesSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const supabase = await createClient();

  if (data.semesterId) {
    const { count } = await supabase.from("academic_semesters").select("id", { count: "exact", head: true }).eq("id", data.semesterId).eq("user_id", user.id);
    if (count !== 1) return { status: "error", message: "Semestre não encontrado." };
  }

  const { data: existing } = await supabase.from("courses").select("course_code,course_name,semester_id,sort_order").eq("user_id", user.id);
  const sameSemester = (existing ?? []).filter((course) => course.semester_id === data.semesterId);
  const taken = new Set(sameSemester.flatMap((course) => [course.course_code.toLowerCase(), course.course_name.toLowerCase()]));
  const fresh = data.rows.filter((row) => !taken.has((row.code ?? row.name).toLowerCase()) && !taken.has(row.name.toLowerCase()));
  const skipped = data.rows.length - fresh.length;
  if (fresh.length === 0) return { status: "error", message: "Todas as disciplinas já existem neste semestre." };

  let order = Math.max(-1, ...(existing ?? []).map((course) => course.sort_order)) + 1;
  const { error } = await supabase.from("courses").insert(
    fresh.map((row) => ({
      user_id: user.id,
      course_code: row.code || row.name.slice(0, 30),
      course_name: row.name,
      credit_hours: row.hours,
      semester_id: data.semesterId,
      sort_order: order++,
    })),
  );
  if (error) return { status: "error", message: "Não foi possível importar as disciplinas." };
  refreshAll();
  return { status: "ok", message: `${fresh.length} disciplina(s) importada(s).${skipped ? ` ${skipped} ignorada(s) por já existirem neste semestre.` : ""}` };
}
