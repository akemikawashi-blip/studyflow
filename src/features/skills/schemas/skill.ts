import { z } from "zod";

export const skillStatuses = ["planned", "learning", "paused", "completed"] as const;
export const skillLevels = ["beginner", "elementary", "intermediate", "advanced"] as const;

const optionalDate = z
  .string()
  .nullable()
  .refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid target date.",
  );

export const skillInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Skill title is required.")
    .max(120, "Skill title cannot exceed 120 characters."),
  category: z
    .string()
    .trim()
    .max(80, "Category cannot exceed 80 characters.")
    .nullable(),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2,000 characters.")
    .nullable(),
  motivation: z
    .string()
    .trim()
    .max(1000, "Motivation cannot exceed 1,000 characters.")
    .nullable(),
  currentLevel: z.enum(skillLevels),
  targetLevel: z.enum(skillLevels),
  status: z.enum(skillStatuses),
  targetDate: optionalDate,
  weeklyTargetMinutes: z
    .number()
    .int()
    .min(0, "Weekly target cannot be negative.")
    .max(10080, "Weekly target is too large."),
  nextAction: z
    .string()
    .trim()
    .max(300, "Next action cannot exceed 300 characters.")
    .nullable(),
});

export const skillMutationSchema = skillInputSchema.extend({
  id: z.string().uuid("The skill identifier is invalid."),
});

export const skillIdSchema = z.string().uuid("The skill identifier is invalid.");

export function skillFormValues(formData: FormData) {
  const weeklyTargetRaw = String(
    formData.get("weeklyTargetMinutes") ?? "",
  ).trim();

  return {
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    motivation: String(formData.get("motivation") ?? "").trim() || null,
    currentLevel: String(formData.get("currentLevel") ?? ""),
    targetLevel: String(formData.get("targetLevel") ?? ""),
    status: String(formData.get("status") ?? ""),
    targetDate: String(formData.get("targetDate") ?? "").trim() || null,
    weeklyTargetMinutes: weeklyTargetRaw ? Number(weeklyTargetRaw) : 0,
    nextAction: String(formData.get("nextAction") ?? "").trim() || null,
  };
}
