import type * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full bg-surface-container-high px-3 text-xs font-medium text-on-surface-variant",
        className,
      )}
      {...props}
    />
  );
}
