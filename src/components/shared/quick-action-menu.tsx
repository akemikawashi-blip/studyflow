"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, CalendarPlus, CalendarRange, GraduationCap, Library, Plus, Search, SquareCheckBig, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { NewNoteForm, type NoteCourseOption } from "@/features/notes/components/new-note-dialog";

const quickLinks = [
  { label: "Compromisso", href: "/app/calendar", icon: CalendarRange },
  { label: "Enviar material", href: "/app/materials", icon: Library },
  { label: "Nova tarefa", href: "/app/tasks", icon: SquareCheckBig },
  { label: "Trabalho ou prazo", href: "/app/planner", icon: CalendarPlus },
  { label: "Prova ou horário", href: "/app/schedule", icon: CalendarClock },
  { label: "Sessão de estudo", href: "/app/study", icon: GraduationCap },
  { label: "Buscar", href: "/app/search", icon: Search },
];

export type QuickCaptureContext = {
  courses: NoteCourseOption[];
  todayKey: string;
};

export function QuickActionMenu({ context }: { context: QuickCaptureContext }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close after navigation (e.g. once a new note opens in the editor).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

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

  if (pathname.startsWith("/app/notes/")) return null;

  return (
    <div className="fixed bottom-[100px] right-4 z-30 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {open ? (
        <section
          role="dialog"
          aria-label="Captura rápida"
          className="fade-in max-h-[70svh] w-[min(calc(100vw-2rem),24rem)] overflow-y-auto rounded-xl border border-outline-variant bg-popover p-4 shadow-[0_18px_50px_rgb(17_17_24_/_0.2)]"
        >
          <p className="eyebrow">Captura rápida</p>
          <h2 className="mb-3 font-display text-xl font-semibold">Registrar aula</h2>
          <NewNoteForm courses={context.courses} todayKey={context.todayKey} />
          <div className="mt-4 border-t border-outline-variant/70 pt-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Ou ir direto para</p>
            <div className="grid grid-cols-2 gap-1">
              {quickLinks.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} className="focus-ring flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface-container-high">
                    <Icon className="size-4 text-secondary" aria-hidden="true" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
      <Button
        ref={buttonRef}
        size="icon"
        className="size-14 min-h-14 rounded-2xl shadow-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Fechar captura rápida" : "Captura rápida"}
        aria-expanded={open}
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <Plus className="size-7" aria-hidden="true" />}
      </Button>
    </div>
  );
}
