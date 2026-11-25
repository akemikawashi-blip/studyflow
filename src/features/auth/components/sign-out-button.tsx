"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { signOutAction } from "@/features/auth/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SignOutSubmit({
  collapsed,
  iconOnly,
}: {
  collapsed?: boolean;
  iconOnly?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      size={iconOnly ? "icon" : "default"}
      className={cn(
        "text-inherit hover:bg-white/10",
        iconOnly ? "size-9 min-h-9" : "w-full justify-start",
        collapsed && "justify-center px-0",
      )}
      disabled={pending}
      aria-label={pending ? "Saindo" : "Sair"}
      title={collapsed ? "Sair" : undefined}
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      {!iconOnly ? (
        <span className={cn("ml-2", collapsed && "sr-only")}>
          {pending ? "Saindo…" : "Sair"}
        </span>
      ) : null}
    </Button>
  );
}

export function SignOutButton({
  collapsed = false,
  iconOnly = false,
}: {
  collapsed?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <form action={signOutAction}>
      <SignOutSubmit collapsed={collapsed} iconOnly={iconOnly} />
    </form>
  );
}
