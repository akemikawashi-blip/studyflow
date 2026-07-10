import type * as React from "react";

import { cn } from "@/lib/utils";

export function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-px w-full bg-outline-variant/55", className)}
      {...props}
    />
  );
}
