export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/app/dashboard",
) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}
