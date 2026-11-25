import { CircleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";

export type ErrorStateProps = {
  title?: string;
  description?: string;
};

export function ErrorState({
  title = "Algo deu errado",
  description = "The page could not be loaded. Please try again.",
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/25 bg-error-container/45 p-6">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-on-error-container">{title}</h2>
          <p className="mt-1 text-sm text-on-error-container/85">{description}</p>
        </div>
      </div>
    </Card>
  );
}
