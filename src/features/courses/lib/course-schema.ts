import { z } from "zod";

export const COURSE_COLORS = ["#1c2b45", "#55715d", "#8a6d3b", "#7a4a5a", "#3f6f86", "#6b5b95", "#9b5b3b", "#4f6b4a", "#5c6470", "#2f5d62"] as const;

const text = (max: number) =>
  z.string().max(max, `Use no máximo ${max.toLocaleString("pt-BR")} caracteres.`).transform((value) => (value.trim() ? value.trim() : null));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

export const courseSchema = z.object({
  id: z.string().uuid().nullable(),
  courseName: z.string().trim().min(1, "Informe o nome da disciplina.").max(160),
  courseCode: z.string().trim().max(30),
  instructorName: text(160),
  semesterId: z.string().uuid().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  workload: z.number().min(0).max(999).nullable(),
  description: text(20_000),
  referencesText: text(20_000),
  difficulties: text(20_000),
  reviewTopics: text(20_000),
});

export function courseFormValues(formData: FormData) {
  const workload = String(formData.get("workload") ?? "").trim().replace(",", ".");
  return {
    id: String(formData.get("id") ?? "") || null,
    courseName: String(formData.get("courseName") ?? ""),
    courseCode: String(formData.get("courseCode") ?? ""),
    instructorName: String(formData.get("instructorName") ?? ""),
    semesterId: String(formData.get("semesterId") ?? "") || null,
    color: String(formData.get("color") ?? COURSE_COLORS[0]),
    workload: workload === "" ? null : Number(workload),
    description: String(formData.get("description") ?? ""),
    referencesText: String(formData.get("referencesText") ?? ""),
    difficulties: String(formData.get("difficulties") ?? ""),
    reviewTopics: String(formData.get("reviewTopics") ?? ""),
  };
}

export const semesterSchema = z
  .object({
    id: z.string().uuid().nullable(),
    name: z.string().trim().min(1, "Informe o nome do semestre (ex.: 2026.2 ou 3º período).").max(120),
    academicYear: text(40),
    startDate: isoDate,
    endDate: isoDate,
    isCurrent: z.boolean(),
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "O término deve ser depois do início.",
  });

export function semesterFormValues(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "") || null,
    name: String(formData.get("name") ?? ""),
    academicYear: String(formData.get("academicYear") ?? ""),
    startDate: String(formData.get("startDate") ?? "") || null,
    endDate: String(formData.get("endDate") ?? "") || null,
    isCurrent: formData.get("isCurrent") === "on",
  };
}
