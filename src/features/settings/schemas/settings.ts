import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);

export const profileInputSchema = z.object({
  fullName: z.string().trim().max(80, "Name cannot exceed 80 characters."),
  universityName: optionalText(160),
  department: optionalText(160),
  academicYear: optionalText(80),
});

export const preferenceInputSchema = z.object({
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
  timeZone: z.string().trim().min(1, "Time zone is required.").max(80),
  dateFormat: z.enum(["dd-MM-yyyy", "MM-dd-yyyy", "yyyy-MM-dd"]),
  weekStartsOn: z.number().int().min(1).max(7),
  dailyStudyGoalMinutes: z.number().int().min(0).max(1440),
  weeklyStudyGoalMinutes: z.number().int().min(0).max(10080),
  theme: z.enum(["light", "dark", "system"]),
  assignmentReminders: z.boolean(),
  taskReminders: z.boolean(),
  habitReminders: z.boolean(),
  budgetAlerts: z.boolean(),
  studyGoalAlerts: z.boolean(),
});

export function profileFormValues(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? ""),
    universityName: String(formData.get("universityName") ?? ""),
    department: String(formData.get("department") ?? ""),
    academicYear: String(formData.get("academicYear") ?? ""),
  };
}

export function preferenceFormValues(formData: FormData) {
  return {
    currencyCode: String(formData.get("currencyCode") ?? "BDT"),
    timeZone: String(formData.get("timeZone") ?? "Asia/Dhaka"),
    dateFormat: String(formData.get("dateFormat") ?? "dd-MM-yyyy"),
    weekStartsOn: Number(String(formData.get("weekStartsOn") ?? "6")),
    dailyStudyGoalMinutes: Number(String(formData.get("dailyStudyGoalMinutes") ?? "60")),
    weeklyStudyGoalMinutes: Number(String(formData.get("weeklyStudyGoalMinutes") ?? "420")),
    theme: String(formData.get("theme") ?? "system"),
    assignmentReminders: formData.get("assignmentReminders") === "on",
    taskReminders: formData.get("taskReminders") === "on",
    habitReminders: formData.get("habitReminders") === "on",
    budgetAlerts: formData.get("budgetAlerts") === "on",
    studyGoalAlerts: formData.get("studyGoalAlerts") === "on",
  };
}
