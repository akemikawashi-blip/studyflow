"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { useState } from "react";

import type { AppShellUser } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { desktopNavigation } from "@/lib/navigation";
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
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-outline-variant/55 bg-surface-container-low transition-[width] duration-200 lg:flex",
        collapsed ? "w-24" : "w-72",
      )}
    >
      <div className="flex h-20 items-center gap-3 px-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_rgb(36_56_156_/_0.18)]">
          <GraduationCap className="size-6" aria-hidden="true" />
        </span>
        <div className={cn("min-w-0", collapsed && "sr-only")}>
          <p className="truncate text-lg font-semibold tracking-[-0.02em]">
            StudyFlow
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Student Life Manager
          </p>
        </div>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1.5 px-3 py-4"
        aria-label="Primary navigation"
      >
        {desktopNavigation.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-ring flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-on-surface-variant transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgb(36_56_156_/_0.14)]"
                  : "hover:bg-surface-container-high hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className={cn("truncate", collapsed && "sr-only")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant/55 p-3">
        <div
          className={cn(
            "mb-3 flex items-center gap-3 rounded-2xl bg-surface-container px-3 py-3",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-sm font-semibold text-on-primary-fixed">
            {user.initials}
          </span>
          <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          {!collapsed ? <SignOutButton iconOnly /> : null}
        </div>

        {collapsed ? (
          <div className="mb-2">
            <SignOutButton collapsed />
          </div>
        ) : null}

        <Button
          variant="ghost"
          className={cn("w-full", collapsed ? "px-0" : "justify-between")}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <span className={cn(collapsed && "sr-only")}>
            {collapsed ? "Expand" : "Collapse sidebar"}
          </span>
          {collapsed ? (
            <ChevronRight className="size-5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="size-5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </aside>
  );
}
