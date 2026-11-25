"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

import { desktopNavigation } from "@/lib/navigation";

function getCurrentLabel(pathname: string) {
  return (
    desktopNavigation.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? "Atlas Acadêmico"
  );
}

export function MobileHeader({ initials, unreadCount = 0 }: { initials: string; unreadCount?: number }) {
  const pathname = usePathname();
  const label = getCurrentLabel(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-outline-variant/45 bg-background/92 px-4 backdrop-blur-xl lg:hidden">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-xs font-semibold text-on-primary-fixed">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-semibold leading-tight text-primary">Atlas Acadêmico</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
      <Link
        href="/app/search"
        className="focus-ring grid size-11 place-items-center rounded-2xl text-on-surface-variant hover:bg-surface-container-high"
        aria-label="Abrir busca"
      >
        <Search className="size-5" aria-hidden="true" />
      </Link>
      <Link
        href="/app/notifications"
        className="focus-ring relative grid size-11 place-items-center rounded-2xl text-on-surface-variant hover:bg-surface-container-high"
        aria-label="Abrir notificações"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-tertiary-container px-1 text-[10px] font-bold text-on-tertiary-container ring-2 ring-background"
            aria-label={`${unreadCount} notificações não lidas`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Link>
    </header>
  );
}
