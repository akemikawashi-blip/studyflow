import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);

const optionalNumber = (max: number) =>
  z.union([z.number().min(0).max(max), z.null()]);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalDate = z
  .string()
  .nullable()
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date.");

const optionalTime = z
  .string()
  .nullable()
  .refine((value) => value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), "Enter a valid time.");

export const courseInputSchema = z.object({
  courseCode: z.string().trim().min(1, "Course code is required.").max(30),
  courseName: z.string().trim().min(1, "Course name is required.").max(160),
  instructorName: optionalText(120),
  semester: optionalText(80),
  creditHours: optionalNumber(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Choose a valid color."),
  targetGrade: optionalText(20),
  currentGrade: optionalText(20),
});

export const courseMutationSchema = courseInputSchema.extend({
  id: z.string().uuid(),
});

export const assignmentTypes = [
  "homework",
  "report",
  "presentation",
  "project",
  "quiz",
  "midterm",
  "final_exam",
  "lab",
  "viva",
  "other",
] as const;

export const assignmentStatuses = [
  "not_started",
  "in_progress",
  "ready_to_submit",
  "submitted",
  "graded",
  "missed",
] as const;

export const priorities = ["low", "medium", "high", "urgent"] as const;

export const assignmentInputSchema = z.object({
  courseId: z.string().uuid().nullable(),
  title: z.string().trim().min(1, "Assignment title is required.").max(180),
  description: optionalText(3000),
  assignmentType: z.enum(assignmentTypes),
  assignedDate: optionalDate,
  dueDate: dateSchema,
  dueTime: optionalTime,
  totalMarks: optionalNumber(1000000),
  obtainedMarks: optionalNumber(1000000),
  submissionStatus: z.enum(assignmentStatuses),
  priority: z.enum(priorities),
  progressPercentage: z.number().int().min(0).max(100),
  submissionLink: optionalText(1000),
});

export const assignmentMutationSchema = assignmentInputSchema.extend({
  id: z.string().uuid(),
});

export const eventTypes = [
  "class",
  "study_session",
  "assignment",
  "exam",
  "meeting",
  "personal_event",
  "task",
] as const;

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, "Event title is required.").max(180),
    description: optionalText(3000),
    startAt: z.string().min(1, "Start time is required."),
    endAt: z.string().min(1, "End time is required."),
    allDay: z.boolean(),
    eventType: z.enum(eventTypes),
    courseId: z.string().uuid().nullable(),
    location: optionalText(240),
    meetingUrl: optionalText(1000),
  })
  .refine((value) => new Date(value.endAt).getTime() >= new Date(value.startAt).getTime(), {
    message: "End time must be after the start time.",
    path: ["endAt"],
  });

export const eventMutationSchema = eventInputSchema.extend({
  id: z.string().uuid(),
});

export const idSchema = z.string().uuid();

function optionalNumberFrom(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? Number(value) : null;
}

function localDateTimeToIso(value: string) {
  if (!value) return value;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+06:00`).toISOString();
}

export function courseFormValues(formData: FormData) {
  return {
    courseCode: String(formData.get("courseCode") ?? ""),
    courseName: String(formData.get("courseName") ?? ""),
    instructorName: String(formData.get("instructorName") ?? ""),
    semester: String(formData.get("semester") ?? ""),
    creditHours: optionalNumberFrom(formData, "creditHours"),
    color: String(formData.get("color") ?? "#24389c"),
    targetGrade: String(formData.get("targetGrade") ?? ""),
    currentGrade: String(formData.get("currentGrade") ?? ""),
  };
}

export function assignmentFormValues(formData: FormData) {
  return {
    courseId: String(formData.get("courseId") ?? "").trim() || null,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    assignmentType: String(formData.get("assignmentType") ?? "other"),
    assignedDate: String(formData.get("assignedDate") ?? "").trim() || null,
    dueDate: String(formData.get("dueDate") ?? ""),
    dueTime: String(formData.get("dueTime") ?? "").trim() || null,
    totalMarks: optionalNumberFrom(formData, "totalMarks"),
    obtainedMarks: optionalNumberFrom(formData, "obtainedMarks"),
    submissionStatus: String(formData.get("submissionStatus") ?? "not_started"),
    priority: String(formData.get("priority") ?? "medium"),
    progressPercentage: Number(String(formData.get("progressPercentage") ?? "0")),
    submissionLink: String(formData.get("submissionLink") ?? ""),
  };
}

export function eventFormValues(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    startAt: localDateTimeToIso(String(formData.get("startAt") ?? "")),
    endAt: localDateTimeToIso(String(formData.get("endAt") ?? "")),
    allDay: formData.get("allDay") === "on",
    eventType: String(formData.get("eventType") ?? "personal_event"),
    courseId: String(formData.get("courseId") ?? "").trim() || null,
    location: String(formData.get("location") ?? ""),
    meetingUrl: String(formData.get("meetingUrl") ?? ""),
  };
}
