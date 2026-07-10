import {
  Bell,
  BookOpenText,
  CalendarDays,
  CircleDollarSign,
  Download,
  FileText,
  Gauge,
  GraduationCap,
  Search,
  Settings,
  Sparkles,
  SquareCheckBig,
} from "lucide-react";

import type { NavigationItem } from "@/types/navigation";

export const desktopNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: Gauge },
  { label: "Tasks", href: "/app/tasks", icon: SquareCheckBig },
  { label: "Planner", href: "/app/planner", icon: CalendarDays },
  { label: "Study", href: "/app/study", icon: GraduationCap },
  { label: "Finance", href: "/app/finance", icon: CircleDollarSign },
  { label: "Skills", href: "/app/skills", icon: Sparkles },
  { label: "Notes", href: "/app/notes", icon: FileText },
  { label: "Search", href: "/app/search", icon: Search },
  { label: "Notifications", href: "/app/notifications", icon: Bell },
  { label: "Settings", href: "/app/settings", icon: Settings },
  { label: "Install app", href: "/install", icon: Download },
];

export const mobilePrimaryNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: Gauge },
  { label: "Tasks", href: "/app/tasks", icon: SquareCheckBig },
  { label: "Planner", href: "/app/planner", icon: CalendarDays },
];

export const mobileMoreNavigation: NavigationItem[] = [
  { label: "Study", href: "/app/study", icon: GraduationCap },
  { label: "Finance", href: "/app/finance", icon: CircleDollarSign },
  { label: "Skills", href: "/app/skills", icon: Sparkles },
  { label: "Notes", href: "/app/notes", icon: BookOpenText },
  { label: "Settings", href: "/app/settings", icon: Settings },
  { label: "Install app", href: "/install", icon: Download },
];
