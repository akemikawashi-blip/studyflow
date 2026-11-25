import type { MaterialCategory } from "@/types/database.generated";

export const STORAGE_BUCKET = "atlas-files";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Must match storage.buckets.allowed_mime_types in the Atlas migration. */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.presentation",
  "text/plain",
  "text/markdown",
  "text/csv",
] as const;

export const FILE_INPUT_ACCEPT = [
  ...ALLOWED_MIME_TYPES,
  ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.odt,.odp,.txt,.md,.csv,.heic,.heif",
].join(",");

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  odp: "application/vnd.oasis.opendocument.presentation",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
};

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  pdf: "PDF",
  slides: "Slides",
  photo: "Fotografia",
  image: "Imagem",
  book: "Livro",
  article: "Artigo científico",
  summary: "Resumo",
  mind_map: "Mapa mental",
  document: "Documento",
  reference: "Referência",
  other: "Outro",
};

export function resolveMimeType(file: { type: string; name: string }) {
  if (file.type && (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[extension] ?? file.type ?? "";
}

export function isAllowedMimeType(mime: string) {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function guessCategory(mime: string): MaterialCategory {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "slides";
  return "document";
}

/** ASCII-only, storage-safe file name that keeps the extension. */
export function safeFileName(name: string) {
  const normalized = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+/, "");
  return (cleaned || "arquivo").slice(-120);
}

export function fileUrl(storagePath: string, options?: { download?: boolean }) {
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `/api/files/${encoded}${options?.download ? "?download=1" : ""}`;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
