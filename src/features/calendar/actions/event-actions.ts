"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { EVENT_CATEGORIES } from "@/features/calendar/lib/categories";
import { requireUser } from "@/lib/auth/current-user";
import { zonedToIso } from "@/lib/dates";
import type { ActionState } from "@/lib/forms/action-state";
import { getTimeZone } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/server";

const eventTypes = EVENT_CATEGORIES.map((item) => item.value) as [string, ...string[]];
const time = z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido.");

const eventSchema = z
  .object({
    id: z.string().uuid().nullable(),
    title: z.string().trim().min(1, "Informe um título.").max(200),
    eventType: z.enum(eventTypes),
    courseId: z.string().uuid().nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    allDay: z.boolean(),
    startTime: time.nullable(),
    endTime: time.nullable(),
    location: z.string().trim().max(200).transform((value) => value || null),
    description: z.string().max(5000).transform((value) => value.trim() || null),
  })
  .superRefine((value, ctx) => {
    if (!value.allDay && !value.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Informe o horário ou marque “dia inteiro”." });
    if (value.allDay && value.endDate && value.endDate < value.date) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "A data final deve ser igual ou posterior à inicial." });
    }
    if (!value.allDay && value.startTime && value.endTime && value.endTime < value.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "O término deve ser depois do início." });
    }
  });

function refresh() {
  revalidatePath("/app/calendar");
  revalidatePath("/app/dashboard");
}

export async function saveEventAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = eventSchema.safeParse({
    id: String(formData.get("id") ?? "") || null,
    title: String(formData.get("title") ?? ""),
    eventType: String(formData.get("eventType") ?? ""),
    courseId: String(formData.get("courseId") ?? "") || null,
    date: String(formData.get("date") ?? ""),
    endDate: String(formData.get("endDate") ?? "") || null,
    allDay: formData.get("allDay") === "on",
    startTime: String(formData.get("startTime") ?? "") || null,
    endTime: String(formData.get("endTime") ?? "") || null,
    location: String(formData.get("location") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: "Revise os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const data = parsed.data;
  const supabase = await createClient();

  if (data.courseId) {
    const { count } = await supabase.from("courses").select("id", { count: "exact", head: true }).eq("id", data.courseId).eq("user_id", user.id);
    if (count !== 1) return { status: "error", message: "Disciplina não encontrada." };
  }

  const timeZone = await getTimeZone(supabase, user.id);
  const startAt = zonedToIso(data.date, data.allDay ? "00:00" : data.startTime!, timeZone);
  const endAt = data.allDay ? zonedToIso(data.endDate ?? data.date, "23:59", timeZone) : zonedToIso(data.date, data.endTime ?? data.startTime!, timeZone);

  const values = {
    title: data.title,
    event_type: data.eventType as (typeof EVENT_CATEGORIES)[number]["value"],
    course_id: data.courseId,
    start_at: startAt,
    end_at: endAt,
    all_day: data.allDay,
    location: data.location,
    description: data.description,
  };

  const { error } = data.id
    ? await supabase.from("calendar_events").update(values).eq("id", data.id).eq("user_id", user.id)
    : await supabase.from("calendar_events").insert({ user_id: user.id, ...values });
  if (error) return { status: "error", message: "Não foi possível salvar o compromisso." };
  refresh();
  return { status: "success", message: data.id ? "Compromisso atualizado." : "Compromisso criado." };
}

export async function deleteEventAction(formData: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id.data).eq("user_id", user.id);
  refresh();
}
