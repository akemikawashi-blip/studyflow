import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "tertiary" | "error";
};

const toneClasses = {
  primary: "bg-primary-fixed text-on-primary-fixed",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  error: "bg-error-container text-on-error-container",
};

export function StatCard({ label, value, note, icon: Icon, tone = "primary" }: StatCardProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-foreground">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", toneClasses[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
