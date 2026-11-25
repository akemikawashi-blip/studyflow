"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Accessible modal built on <dialog>. `trigger` receives an `open` callback;
 * `children` receives `close`. Content mounts only while open, so forms reset.
 */
export function Dialog({
  trigger,
  title,
  eyebrow,
  children,
  size = "md",
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  eyebrow?: string;
  children: (close: () => void) => ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {trigger(() => setOpen(true))}
      <dialog
        ref={ref}
        onClose={close}
        onClick={(event) => {
          if (event.target === ref.current) close();
        }}
        aria-label={title}
        className={cn(
          "m-auto max-h-[92svh] w-[min(100%-2rem,var(--dialog-width))] rounded-xl border border-outline-variant bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]",
          size === "md" && "[--dialog-width:32rem]",
          size === "lg" && "[--dialog-width:44rem]",
          size === "xl" && "[--dialog-width:64rem]",
        )}
      >
        {open ? (
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
                <h2 className="truncate font-display text-2xl font-semibold">{title}</h2>
              </div>
              <button type="button" onClick={close} className="focus-ring grid size-9 shrink-0 place-items-center rounded-md hover:bg-surface-container-high" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>
            {children(close)}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
