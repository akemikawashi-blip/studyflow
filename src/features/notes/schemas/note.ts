import { z } from "zod";

export const idSchema = z.string().uuid();

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), "Informe uma data válida.");

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Use no máximo ${max.toLocaleString("pt-BR")} caracteres.`)
    .transform((value) => (value.trim() === "" ? null : value))
    .nullable();

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .transform((value) => (value === "" ? null : value))
    .nullable();

export const NOTE_CONTENT_MAX = 1_500_000;

/** New note from the "Nova anotação" dialog. */
export const createNoteSchema = z
  .object({
    kind: z.enum(["lesson", "free"]),
    title: z.string().trim().min(1, "Dê um título à anotação.").max(180, "Título muito longo."),
    courseId: idSchema.nullable(),
    lessonDate: dateKeySchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "lesson" && !value.lessonDate) {
      ctx.addIssue({ code: "custom", path: ["lessonDate"], message: "Informe a data da aula." });
    }
  });

export function createNoteFormValues(formData: FormData) {
  return {
    kind: formData.get("kind") === "free" ? "free" : "lesson",
    title: String(formData.get("title") ?? ""),
    courseId: String(formData.get("courseId") ?? "").trim() || null,
    lessonDate: String(formData.get("lessonDate") ?? "").trim() || null,
  };
}

/** Autosave payload sent by the editor workspace. */
export const saveNoteSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1, "Dê um título à anotação.").max(180, "Título muito longo."),
  contentHtml: z.string().max(NOTE_CONTENT_MAX, "A anotação ficou grande demais para um único registro."),
  plainText: z.string().max(NOTE_CONTENT_MAX),
  courseId: idSchema.nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(40, "Use no máximo 40 palavras-chave."),
  keyPoints: optionalText(20_000),
  memorize: optionalText(20_000),
  doubts: optionalText(20_000),
  professorRemarks: optionalText(20_000),
  referencesText: optionalText(20_000),
  lesson: z
    .object({
      lessonDate: dateKeySchema,
      professor: optionalLine(160),
      topic: optionalLine(200),
      unit: optionalLine(200),
    })
    .nullable(),
});

export type SaveNoteInput = z.input<typeof saveNoteSchema>;

export function parseTags(value: string) {
  return value
    .split(/[,;\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === index);
}

export function previewFrom(plainText: string) {
  return plainText.replace(/\s+/g, " ").trim().slice(0, 240);
}
