import { z } from "zod";

export const noteInputSchema = z.object({
  title: z.string().trim().min(1, "Note title is required.").max(180),
  content: z.string().max(20000, "Note content is too long."),
  courseId: z.string().uuid().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  favorite: z.boolean(),
  pinned: z.boolean(),
});

export const noteMutationSchema = noteInputSchema.extend({ id: z.string().uuid() });
export const idSchema = z.string().uuid();

export function noteFormValues(formData: FormData) {
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index);

  return {
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    courseId: String(formData.get("courseId") ?? "").trim() || null,
    tags,
    favorite: formData.get("favorite") === "on",
    pinned: formData.get("pinned") === "on",
  };
}
