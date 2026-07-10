"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { mobileMoreNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MoreMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const active = mobileMoreNavigation.some((item) => isActiveRoute(pathname, item.href));

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="focus-ring flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-xs font-medium"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span
          className={cn(
            "grid h-8 min-w-14 place-items-center rounded-full px-4 transition-colors",
            active ? "bg-primary text-primary-foreground" : "text-on-surface-variant",
          )}
        >
          <Grid2X2 className="size-5" aria-hidden="true" />
        </span>
        <span className={cn(active ? "text-primary" : "text-on-surface-variant")}>More</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close more menu"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-menu-title"
            className="absolute inset-x-0 bottom-0 rounded-t-[32px] border border-outline-variant/55 bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgb(17_17_24_/_0.18)]"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 id="more-menu-title" className="text-xl font-semibold">More tools</h2>
                <p className="mt-1 text-sm text-muted-foreground">Open another StudyFlow workspace.</p>
              </div>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close more menu"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mobileMoreNavigation.map((item) => {
                const Icon = item.icon;
                const itemActive = isActiveRoute(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "focus-ring flex min-h-24 flex-col justify-between rounded-card border border-outline-variant/55 bg-surface-container-lowest p-4",
                      itemActive && "border-primary bg-primary-fixed/55 text-on-primary-fixed",
                    )}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
