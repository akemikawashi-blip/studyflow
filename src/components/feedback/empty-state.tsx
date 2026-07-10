import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="grid min-h-64 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}
