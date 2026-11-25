import { cn } from "@/lib/utils";

/** The Atlas monogram: a meridian globe inside a seal ring. */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("size-9", className)} aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="20" cy="20" rx="5.2" ry="12" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 20h24M10 14h20M10 26h20" stroke="currentColor" strokeWidth="1" opacity="0.8" />
    </svg>
  );
}
