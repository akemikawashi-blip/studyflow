import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-card bg-surface-container-high",
        className,
      )}
      aria-hidden="true"
    />
  );
}
