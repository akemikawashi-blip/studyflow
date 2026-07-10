"use client";

import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/features/auth/schemas/auth";
import { cn } from "@/lib/utils";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function AuthField({
  label,
  error,
  className,
  id,
  ...props
}: AuthFieldProps) {
  const inputId = id ?? props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "focus-ring min-h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-base text-foreground placeholder:text-muted-foreground/75 disabled:opacity-60",
          error && "border-destructive",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthMessage({ state }: { state: AuthActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-5",
        state.status === "error"
          ? "border-destructive/25 bg-error-container text-on-error-container"
          : "border-secondary/25 bg-secondary-container/45 text-on-secondary-container",
      )}
    >
      {state.message}
    </div>
  );
}

export function AuthSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="min-h-12 w-full rounded-full"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? "Please wait…" : children}
    </Button>
  );
}
