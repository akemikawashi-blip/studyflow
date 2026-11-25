"use client";

import { registerMaterialAction } from "@/features/materials/actions/material-actions";
import {
  MAX_FILE_BYTES,
  STORAGE_BUCKET,
  guessCategory,
  isAllowedMimeType,
  resolveMimeType,
  safeFileName,
} from "@/features/materials/lib/files";
import { createClient } from "@/lib/supabase/client";
import type { Database, MaterialCategory } from "@/types/database.generated";

export type Material = Database["public"]["Tables"]["materials"]["Row"];

export type UploadTarget = {
  noteId?: string | null;
  lessonId?: string | null;
  courseId?: string | null;
  examId?: string | null;
  category?: MaterialCategory;
  folder: string;
};

/** Uploads straight from the browser into "<user-id>/<folder>/…" and records it. */
export async function uploadMaterial(file: File, target: UploadTarget): Promise<Material> {
  const mimeType = resolveMimeType(file);
  if (!isAllowedMimeType(mimeType)) {
    throw new Error(`“${file.name}”: tipo de arquivo não suportado. Use PDF, imagens, slides ou documentos.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`“${file.name}” tem mais de 50 MB.`);
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Sua sessão expirou. Entre novamente para enviar arquivos.");

  const unique = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  const storagePath = `${userId}/${target.folder}/${Date.now()}-${unique}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Falha ao enviar “${file.name}”. ${error.message.includes("Bucket not found") ? "O armazenamento do Atlas ainda não foi configurado (rode a migração)." : "Tente novamente."}`);
  }

  const result = await registerMaterialAction({
    storagePath,
    fileName: file.name.slice(0, 255),
    mimeType,
    sizeBytes: file.size,
    title: file.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Arquivo",
    category: target.category ?? guessCategory(mimeType),
    noteId: target.noteId ?? null,
    lessonId: target.lessonId ?? null,
    courseId: target.courseId ?? null,
    examId: target.examId ?? null,
  });
  if (result.status === "error") throw new Error(result.message);
  return result.material;
}
