"use server";

import { z } from "zod";

import { MATERIAL_CATEGORY_LABELS, MAX_FILE_BYTES, STORAGE_BUCKET, isAllowedMimeType } from "@/features/materials/lib/files";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Database, MaterialCategory } from "@/types/database.generated";

type Material = Database["public"]["Tables"]["materials"]["Row"];

const categories = Object.keys(MATERIAL_CATEGORY_LABELS) as [MaterialCategory, ...MaterialCategory[]];

const registerSchema = z.object({
  storagePath: z.string().min(3).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().refine(isAllowedMimeType, "Tipo de arquivo não permitido."),
  sizeBytes: z.number().int().min(0).max(MAX_FILE_BYTES),
  title: z.string().trim().min(1).max(200),
  category: z.enum(categories),
  noteId: z.string().uuid().nullable(),
  lessonId: z.string().uuid().nullable(),
  courseId: z.string().uuid().nullable(),
});

export type RegisterMaterialResult =
  | { status: "ok"; material: Material }
  | { status: "error"; message: string };

/** Records a file that the browser has already uploaded to the private bucket. */
export async function registerMaterialAction(input: z.input<typeof registerSchema>): Promise<RegisterMaterialResult> {
  const user = await requireUser();
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Arquivo inválido." };
  const data = parsed.data;

  if (!data.storagePath.startsWith(`${user.id}/`) || data.storagePath.includes("..")) {
    return { status: "error", message: "Caminho de arquivo inválido." };
  }

  const supabase = await createClient();

  const owned = async (table: "notes" | "lessons" | "courses", id: string | null) => {
    if (!id) return true;
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("id", id).eq("user_id", user.id);
    return count === 1;
  };
  const [noteOk, lessonOk, courseOk] = await Promise.all([
    owned("notes", data.noteId),
    owned("lessons", data.lessonId),
    owned("courses", data.courseId),
  ]);
  if (!noteOk || !lessonOk || !courseOk) return { status: "error", message: "Registro relacionado não encontrado." };

  const { data: material, error } = await supabase
    .from("materials")
    .insert({
      user_id: user.id,
      storage_path: data.storagePath,
      file_name: data.fileName,
      mime_type: data.mimeType,
      size_bytes: data.sizeBytes,
      title: data.title,
      category: data.category,
      note_id: data.noteId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
    })
    .select("*")
    .single();

  if (error || !material) {
    await supabase.storage.from(STORAGE_BUCKET).remove([data.storagePath]);
    return { status: "error", message: "O arquivo foi enviado, mas não pôde ser registrado. Tente novamente." };
  }

  return { status: "ok", material };
}

export async function deleteMaterialAction(id: string): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { status: "error", message: "Material inválido." };
  const supabase = await createClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id,storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!material) return { status: "error", message: "Material não encontrado." };

  if (material.storage_path) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([material.storage_path]);
    if (storageError) return { status: "error", message: "Não foi possível remover o arquivo do armazenamento." };
  }

  const { error } = await supabase.from("materials").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { status: "error", message: "Não foi possível excluir o material." };

  return { status: "ok" };
}
