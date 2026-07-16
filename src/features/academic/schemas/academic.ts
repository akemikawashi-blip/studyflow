import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);

export const semesterInputSchema = z.object({
  semesterName: z.string().trim().min(1, "Semester name is required.").max(120),
  academicYear: optionalText(40),
  gpa: z.number().min(0, "GPA cannot be negative.").max(4, "GPA cannot exceed 4.00."),
  totalCredits: z.number().min(0, "Credits cannot be negative.").max(300),
  notes: optionalText(3000),
  sortOrder: z.number().int().min(0).max(1000),
});

export const semesterMutationSchema = semesterInputSchema.extend({
  id: z.string().uuid(),
});

export const idSchema = z.string().uuid();

function numberFrom(formData: FormData, name: string, fallback = 0) {
  const value = String(formData.get(name) ?? "").trim();
  return value === "" ? fallback : Number(value);
}

export function semesterFormValues(formData: FormData) {
  return {
    semesterName: String(formData.get("semesterName") ?? ""),
    academicYear: String(formData.get("academicYear") ?? ""),
    gpa: numberFrom(formData, "gpa"),
    totalCredits: numberFrom(formData, "totalCredits"),
    notes: String(formData.get("notes") ?? ""),
    sortOrder: numberFrom(formData, "sortOrder"),
  };
}
