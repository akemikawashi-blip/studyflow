import { z } from "zod";

export const sessionTypes = [
  "reading",
  "revision",
  "assignment",
  "practice",
  "lecture_review",
  "skill_learning",
  "other",
] as const;

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);

export const studySessionInputSchema = z.object({
  title: z.string().trim().min(1, "Session title is required.").max(180),
  courseId: z.string().uuid().nullable(),
  sessionType: z.enum(sessionTypes),
  durationMinutes: z.number().int().min(0).max(1440),
  accumulatedSeconds: z.number().int().min(0).max(86400),
  focusRating: z.union([z.number().int().min(1).max(5), z.null()]),
  notes: optionalText(3000),
  startedAt: z.string().datetime().nullable(),
});

export const studySessionMutationSchema = studySessionInputSchema.extend({
  id: z.string().uuid(),
});

export const idSchema = z.string().uuid();

function numberOrNull(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? Number(normalized) : null;
}

function localDateTimeToIso(value: string) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+06:00`).toISOString();
}

export function studySessionFormValues(formData: FormData) {
  const seconds = Number(String(formData.get("accumulatedSeconds") ?? "0"));
  const durationRaw = String(formData.get("durationMinutes") ?? "").trim();
  return {
    title: String(formData.get("title") ?? ""),
    courseId: String(formData.get("courseId") ?? "").trim() || null,
    sessionType: String(formData.get("sessionType") ?? "other"),
    durationMinutes: durationRaw ? Number(durationRaw) : Math.ceil(seconds / 60),
    accumulatedSeconds: seconds,
    focusRating: numberOrNull(formData.get("focusRating")),
    notes: String(formData.get("notes") ?? ""),
    startedAt: localDateTimeToIso(String(formData.get("startedAt") ?? "")),
  };
}
