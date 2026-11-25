import { STORAGE_BUCKET } from "@/features/materials/lib/files";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Stable, private URL for a stored file: /api/files/<user-id>/<...>.
 * Only the owner gets through; the response is a short-lived signed URL, so
 * the bucket itself never has to be public.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Autenticação necessária.", { status: 401 });

  const { path } = await params;
  const storagePath = path.map((segment) => decodeURIComponent(segment)).join("/");
  if (!storagePath.startsWith(`${user.id}/`) || storagePath.split("/").includes("..")) {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60, download ? { download: true } : undefined);

  if (error || !data?.signedUrl) return new Response("Arquivo não encontrado.", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" },
  });
}
