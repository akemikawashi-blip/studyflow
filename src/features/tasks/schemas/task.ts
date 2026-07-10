import { z } from "zod";

export const taskCategories = [
  "study",
  "assignment",
  "personal",
  "work",
  "health",
  "finance",
  "other",
] as const;

export const priorityLevels = ["low", "medium", "high", "urgent"] as const;

const optionalDate = z
  .string()
  .nullable()
  .refine(
    (value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid due date.",
  );

const optionalTime = z
  .string()
  .nullable()
  .refine(
    (value) => value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "Enter a valid due time.",
  );

export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(160, "Task title cannot exceed 160 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2,000 characters.")
    .nullable(),
  category: z.enum(taskCategories),
  priority: z.enum(priorityLevels),
  dueDate: optionalDate,
  dueTime: optionalTime,
  estimatedMinutes: z
    .number()
    .int()
    .min(0, "Estimated time cannot be negative.")
    .max(10080, "Estimated time is too large.")
    .nullable(),
});

export const taskMutationSchema = taskInputSchema.extend({
  id: z.string().uuid("The task identifier is invalid."),
});

export const taskIdSchema = z.string().uuid("The task identifier is invalid.");

export function taskFormValues(formData: FormData) {
  const estimatedRaw = String(formData.get("estimatedMinutes") ?? "").trim();

  return {
    title: String(formData.get("title") ?? ""),
    description:
      String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    dueDate: String(formData.get("dueDate") ?? "").trim() || null,
    dueTime: String(formData.get("dueTime") ?? "").trim() || null,
    estimatedMinutes: estimatedRaw ? Number(estimatedRaw) : null,
  };
}
