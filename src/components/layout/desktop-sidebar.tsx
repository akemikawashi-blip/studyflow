"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { AppShellUser } from "@/components/layout/app-shell";
import { AtlasMark } from "@/components/shared/atlas-mark";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { navigationSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSidebar({ user }: { user: AppShellUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-20" : "w-68",
      )}
    >
      <div className={cn("flex h-20 items-center gap-3 px-5", collapsed && "justify-center px-0")}>
        <AtlasMark className="size-9 shrink-0 text-gold" />
        <div className={cn("min-w-0", collapsed && "sr-only")}>
          <p className="truncate font-display text-xl font-semibold leading-tight tracking-tight">Atlas Acadêmico</p>
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-sidebar-muted">Medicina</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4 pt-2" aria-label="Navegação principal">
        {navigationSections.map((section) => (
          <div key={section.title}>
            <p className={cn("mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted", collapsed && "sr-only")}>
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "focus-ring relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                        : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" aria-hidden="true" /> : null}
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-3">
        <div className={cn("mb-2 flex items-center gap-3 rounded-lg px-2 py-2", collapsed && "justify-center px-0")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent font-display text-sm font-semibold text-gold">
            {user.initials}
          </span>
          <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
          </div>
          {!collapsed ? <SignOutButton iconOnly /> : null}
        </div>
        {collapsed ? (
          <div className="mb-2">
            <SignOutButton collapsed />
          </div>
        ) : null}
        <button
          type="button"
          className={cn(
            "focus-ring flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            collapsed ? "justify-center px-0" : "justify-between",
          )}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-expanded={!collapsed}
        >
          <span className={cn(collapsed && "sr-only")}>Recolher</span>
          {collapsed ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronLeft className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </aside>
  );
}
