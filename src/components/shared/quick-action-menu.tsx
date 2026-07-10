"use client";

import Link from "next/link";
import { CalendarPlus, CircleDollarSign, GraduationCap, Plus, Sparkles, SquareCheckBig, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const quickActions = [
  { label: "Open tasks", href: "/app/tasks", icon: SquareCheckBig },
  { label: "Open planner", href: "/app/planner", icon: CalendarPlus },
  { label: "Log study", href: "/app/study", icon: GraduationCap },
  { label: "Open finance", href: "/app/finance", icon: CircleDollarSign },
  { label: "Open skills", href: "/app/skills", icon: Sparkles },
];

export function QuickActionMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="fixed bottom-[100px] right-4 z-30 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {open ? (
        <div className="w-64 rounded-card border border-outline-variant/55 bg-popover p-3 shadow-[0_18px_50px_rgb(17_17_24_/_0.18)]">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quick navigation
          </p>
          <div className="flex flex-col gap-1">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="focus-ring flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium hover:bg-surface-container-high"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-primary-fixed text-on-primary-fixed">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
      <Button
        ref={buttonRef}
        size="icon"
        className="size-14 min-h-14 rounded-[20px] shadow-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <Plus className="size-7" aria-hidden="true" />}
      </Button>
    </div>
  );
}
