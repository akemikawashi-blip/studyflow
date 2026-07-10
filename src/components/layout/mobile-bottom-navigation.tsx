"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MoreMenu } from "@/components/navigation/more-menu";
import { mobilePrimaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid h-[84px] grid-cols-4 items-center gap-1 rounded-t-[24px] border-t border-outline-variant/45 bg-surface-container/96 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(36_56_156_/_0.08)] backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      {mobilePrimaryNavigation.map((item) => {
        const active = isActiveRoute(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="focus-ring flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-xs font-medium"
          >
            <span
              className={cn(
                "grid h-8 min-w-14 place-items-center rounded-full px-4 transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-on-surface-variant",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className={cn("truncate", active ? "text-primary" : "text-on-surface-variant")}>
              {item.label}
            </span>
          </Link>
        );
      })}
      <MoreMenu />
    </nav>
  );
}
