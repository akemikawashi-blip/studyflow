import {
  Award,
  Bell,
  BookOpenText,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Download,
  Gauge,
  GraduationCap,
  Search,
  Settings,
  Sparkles,
  SquareCheckBig,
} from "lucide-react";

import type { NavigationItem, NavigationSection } from "@/types/navigation";

const dashboard: NavigationItem = { label: "Painel", href: "/app/dashboard", icon: Gauge };
const notebook: NavigationItem = { label: "Caderno", href: "/app/notes", icon: BookOpenText };
const search: NavigationItem = { label: "Busca", href: "/app/search", icon: Search };
const planner: NavigationItem = { label: "Disciplinas e prazos", href: "/app/planner", icon: CalendarDays };
const schedule: NavigationItem = { label: "Horários e provas", href: "/app/schedule", icon: CalendarClock };
const tasks: NavigationItem = { label: "Tarefas", href: "/app/tasks", icon: SquareCheckBig };
const study: NavigationItem = { label: "Estudos", href: "/app/study", icon: GraduationCap };
const performance: NavigationItem = { label: "Desempenho semestral", href: "/app/academic", icon: Award };
const notifications: NavigationItem = { label: "Notificações", href: "/app/notifications", icon: Bell };
const exportData: NavigationItem = { label: "Exportar e PDF", href: "/app/export", icon: Download };
const settings: NavigationItem = { label: "Configurações", href: "/app/settings", icon: Settings };
const finance: NavigationItem = { label: "Finanças", href: "/app/finance", icon: CircleDollarSign };
const skills: NavigationItem = { label: "Habilidades", href: "/app/skills", icon: Sparkles };

export const navigationSections: NavigationSection[] = [
  { title: "Visão geral", items: [dashboard, search] },
  { title: "Acadêmico", items: [notebook, planner, schedule, tasks, study, performance] },
  { title: "Pessoal", items: [finance, skills] },
  { title: "Sistema", items: [notifications, exportData, settings] },
];

export const desktopNavigation: NavigationItem[] = navigationSections.flatMap((section) => section.items);

export const mobilePrimaryNavigation: NavigationItem[] = [dashboard, notebook, tasks];

export const mobileMoreNavigation: NavigationItem[] = desktopNavigation.filter(
  (item) => !mobilePrimaryNavigation.includes(item),
);
