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
  examId: z.string().uuid().nullable().optional(),
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

  const owned = async (table: "notes" | "lessons" | "courses" | "exam_schedules", id: string | null | undefined) => {
    if (!id) return true;
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("id", id).eq("user_id", user.id);
    return count === 1;
  };
  const [noteOk, lessonOk, courseOk, examOk] = await Promise.all([
    owned("notes", data.noteId),
    owned("lessons", data.lessonId),
    owned("courses", data.courseId),
    owned("exam_schedules", data.examId),
  ]);
  if (!noteOk || !lessonOk || !courseOk || !examOk) return { status: "error", message: "Registro relacionado não encontrado." };

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
      exam_id: data.examId ?? null,
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

const detailsSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(200),
  category: z.enum(categories),
  description: z.string().max(5000).transform((value) => value.trim() || null),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  courseId: z.string().uuid().nullable(),
  lessonId: z.string().uuid().nullable(),
  examId: z.string().uuid().nullable(),
});

async function linksOwned(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, data: { courseId: string | null; lessonId: string | null; examId: string | null }) {
  const check = async (table: "courses" | "lessons" | "exam_schedules", id: string | null) => {
    if (!id) return true;
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("id", id).eq("user_id", userId);
    return count === 1;
  };
  const results = await Promise.all([check("courses", data.courseId), check("lessons", data.lessonId), check("exam_schedules", data.examId)]);
  return results.every(Boolean);
}

export type MaterialMutationResult = { status: "ok"; material: Material } | { status: "error"; message: string };

export async function updateMaterialAction(id: string, input: z.input<typeof detailsSchema>): Promise<MaterialMutationResult> {
  const user = await requireUser();
  const parsed = detailsSchema.safeParse(input);
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return { status: "error", message: parsed.success ? "Material inválido." : parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();
  if (!(await linksOwned(supabase, user.id, parsed.data))) return { status: "error", message: "Disciplina, aula ou prova não encontrada." };
  const { data: material, error } = await supabase
    .from("materials")
    .update({
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      tags: parsed.data.tags,
      course_id: parsed.data.courseId,
      lesson_id: parsed.data.lessonId,
      exam_id: parsed.data.examId,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !material) return { status: "error", message: "Não foi possível salvar o material." };
  return { status: "ok", material };
}

export async function createLinkMaterialAction(input: z.input<typeof detailsSchema> & { url: string }): Promise<MaterialMutationResult> {
  const user = await requireUser();
  const parsed = detailsSchema.safeParse(input);
  const url = z.string().trim().url("Informe um endereço válido (https://…).").max(2000).refine((value) => /^https?:\/\//i.test(value), "Use um endereço http ou https.").safeParse(input.url);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!url.success) return { status: "error", message: url.error.issues[0]?.message ?? "Endereço inválido." };
  const supabase = await createClient();
  if (!(await linksOwned(supabase, user.id, parsed.data))) return { status: "error", message: "Disciplina, aula ou prova não encontrada." };
  const { data: material, error } = await supabase
    .from("materials")
    .insert({
      user_id: user.id,
      external_url: url.data,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      tags: parsed.data.tags,
      course_id: parsed.data.courseId,
      lesson_id: parsed.data.lessonId,
      exam_id: parsed.data.examId,
    })
    .select("*")
    .single();
  if (error || !material) return { status: "error", message: "Não foi possível adicionar o link." };
  return { status: "ok", material };
}
