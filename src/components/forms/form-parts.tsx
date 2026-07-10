import type { ActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";

export const inputClass =
  "focus-ring min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-foreground";

export function FieldError({
  state,
  field,
}: {
  state: ActionState;
  field: string;
}) {
  const error = state.fieldErrors?.[field]?.[0];

  return error ? (
    <p className="mt-1 text-xs text-destructive">{error}</p>
  ) : null;
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        state.status === "error"
          ? "bg-error-container text-on-error-container"
          : "bg-secondary-container/45 text-on-secondary-container",
      )}
    >
      {state.message}
    </p>
  );
}

export function FormLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}
