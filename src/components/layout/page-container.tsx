import type * as React from "react";

import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8",
        className,
      )}
      {...props}
    />
  );
}
