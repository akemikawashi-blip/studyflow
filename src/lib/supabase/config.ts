const PLACEHOLDER_MARKERS = ["your-project", "your_key", "example"];

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!url || !publishableKey) {
    return false;
  }

  const normalized = `${url} ${publishableKey}`.toLowerCase();

  return !PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey || !isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and add your project URL and publishable key.",
    );
  }

  return { url, publishableKey };
}
