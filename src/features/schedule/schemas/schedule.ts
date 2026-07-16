import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");

const optionalTimeSchema = z
  .string()
  .nullable()
  .refine(
    (value) => value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "Enter a valid time.",
  );

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const timetableInputSchema = z
  .object({
    courseId: z.string().uuid().nullable(),
    title: z.string().trim().min(1, "Class title is required.").max(180),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    location: optionalText(240),
    instructorName: optionalText(120),
    notes: optionalText(3000),
    active: z.boolean(),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export const timetableMutationSchema = timetableInputSchema.extend({
  id: z.string().uuid(),
});

export const examInputSchema = z
  .object({
    courseId: z.string().uuid().nullable(),
    title: z.string().trim().min(1, "Exam title is required.").max(180),
    examType: z.string().trim().min(1, "Exam type is required.").max(80),
    examDate: dateSchema,
    startTime: optionalTimeSchema,
    endTime: optionalTimeSchema,
    location: optionalText(240),
    seatInfo: optionalText(120),
    notes: optionalText(3000),
  })
  .refine(
    (value) =>
      value.startTime === null ||
      value.endTime === null ||
      value.endTime > value.startTime,
    {
      message: "End time must be after start time.",
      path: ["endTime"],
    },
  );

export const examMutationSchema = examInputSchema.extend({
  id: z.string().uuid(),
});

export const idSchema = z.string().uuid();

function optionalValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim() || null;
}

export function timetableFormValues(formData: FormData) {
  return {
    courseId: optionalValue(formData, "courseId"),
    title: String(formData.get("title") ?? ""),
    dayOfWeek: Number(String(formData.get("dayOfWeek") ?? "0")),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    location: String(formData.get("location") ?? ""),
    instructorName: String(formData.get("instructorName") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    active: formData.get("active") === "on",
  };
}

export function examFormValues(formData: FormData) {
  return {
    courseId: optionalValue(formData, "courseId"),
    title: String(formData.get("title") ?? ""),
    examType: String(formData.get("examType") ?? "Exam"),
    examDate: String(formData.get("examDate") ?? ""),
    startTime: optionalValue(formData, "startTime"),
    endTime: optionalValue(formData, "endTime"),
    location: String(formData.get("location") ?? ""),
    seatInfo: String(formData.get("seatInfo") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}
