import type { ReactNode } from "react";

import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNavigation } from "@/components/layout/mobile-bottom-navigation";
import { MobileHeader } from "@/components/layout/mobile-header";
import { QuickActionMenu } from "@/components/shared/quick-action-menu";

export type AppShellUser = {
  name: string;
  email: string;
  initials: string;
};

export function AppShell({
  children,
  user,
  unreadNotifications = 0,
}: {
  children: ReactNode;
  user: AppShellUser;
  unreadNotifications?: number;
}) {
  return (
    <div className="min-h-svh lg:flex">
      <DesktopSidebar user={user} />
      <div className="min-w-0 flex-1">
        <MobileHeader initials={user.initials} unreadCount={unreadNotifications} />
        <main>{children}</main>
      </div>
      <QuickActionMenu />
      <MobileBottomNavigation />
    </div>
  );
}
