import {
  Award,
  Bell,
  BookOpenText,
  CalendarClock,
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
  { label: "Schedule", href: "/app/schedule", icon: CalendarClock },
  { label: "GPA & CGPA", href: "/app/academic", icon: Award },
  { label: "Study", href: "/app/study", icon: GraduationCap },
  { label: "Finance", href: "/app/finance", icon: CircleDollarSign },
  { label: "Skills", href: "/app/skills", icon: Sparkles },
  { label: "Notes", href: "/app/notes", icon: FileText },
  { label: "Search", href: "/app/search", icon: Search },
  { label: "Notifications", href: "/app/notifications", icon: Bell },
  { label: "Export & PDF", href: "/app/export", icon: Download },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export const mobilePrimaryNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: Gauge },
  { label: "Tasks", href: "/app/tasks", icon: SquareCheckBig },
  { label: "Planner", href: "/app/planner", icon: CalendarDays },
];

export const mobileMoreNavigation: NavigationItem[] = [
  { label: "Schedule", href: "/app/schedule", icon: CalendarClock },
  { label: "GPA & CGPA", href: "/app/academic", icon: Award },
  { label: "Study", href: "/app/study", icon: GraduationCap },
  { label: "Finance", href: "/app/finance", icon: CircleDollarSign },
  { label: "Skills", href: "/app/skills", icon: Sparkles },
  { label: "Notes", href: "/app/notes", icon: BookOpenText },
  { label: "Export & PDF", href: "/app/export", icon: Download },
  { label: "Settings", href: "/app/settings", icon: Settings },
];
