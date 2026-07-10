"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, CircleDollarSign, FileText, GraduationCap, Search, Sparkles, SquareCheckBig } from "lucide-react";
import { useMemo, useState } from "react";

import { inputClass } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatLabel, formatMoney } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];
type Note = Database["public"]["Tables"]["notes"]["Row"];
type Skill = Database["public"]["Tables"]["skills"]["Row"];
type Session = Database["public"]["Tables"]["study_sessions"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Kind = "all" | "task" | "assignment" | "course" | "note" | "skill" | "study" | "finance";

type SearchItem = {
  id: string;
  kind: Exclude<Kind, "all">;
  title: string;
  subtitle: string;
  searchable: string;
  href: string;
  meta?: string;
};

const icons = {
  task: SquareCheckBig,
  assignment: CalendarDays,
  course: GraduationCap,
  note: FileText,
  skill: Sparkles,
  study: BookOpen,
  finance: CircleDollarSign,
};

export function GlobalSearch({ tasks, assignments, courses, notes, skills, sessions, transactions }: { tasks: Task[]; assignments: Assignment[]; courses: Course[]; notes: Note[]; skills: Skill[]; sessions: Session[]; transactions: Transaction[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const items = useMemo<SearchItem[]>(() => [
    ...tasks.map((item) => ({ id: `task-${item.id}`, kind: "task" as const, title: item.title, subtitle: item.description || `${formatLabel(item.category)} task`, searchable: [item.title, item.description, item.category, item.priority, item.status].filter(Boolean).join(" "), href: "/app/tasks", meta: item.due_date ? `Due ${formatDate(item.due_date)}` : formatLabel(item.status) })),
    ...assignments.map((item) => ({ id: `assignment-${item.id}`, kind: "assignment" as const, title: item.title, subtitle: item.description || formatLabel(item.assignment_type), searchable: [item.title, item.description, item.assignment_type, item.submission_status, item.priority].filter(Boolean).join(" "), href: "/app/planner", meta: `Due ${formatDate(item.due_date)}` })),
    ...courses.map((item) => ({ id: `course-${item.id}`, kind: "course" as const, title: `${item.course_code} — ${item.course_name}`, subtitle: [item.instructor_name, item.semester].filter(Boolean).join(" · ") || "Course", searchable: [item.course_code, item.course_name, item.instructor_name, item.semester].filter(Boolean).join(" "), href: "/app/planner", meta: item.current_grade ? `Current grade ${item.current_grade}` : undefined })),
    ...notes.map((item) => ({ id: `note-${item.id}`, kind: "note" as const, title: item.title, subtitle: item.plain_text_preview || "Empty note", searchable: [item.title, item.content, ...item.tags].join(" "), href: "/app/notes", meta: item.tags.slice(0, 3).join(" · ") || undefined })),
    ...skills.map((item) => ({ id: `skill-${item.id}`, kind: "skill" as const, title: item.title, subtitle: item.description || item.next_action || "Learning goal", searchable: [item.title, item.category, item.description, item.next_action, item.status].filter(Boolean).join(" "), href: "/app/skills", meta: `${Math.round(Number(item.progress_percentage))}% · ${formatLabel(item.status)}` })),
    ...sessions.map((item) => ({ id: `study-${item.id}`, kind: "study" as const, title: item.title, subtitle: item.notes || formatLabel(item.session_type), searchable: [item.title, item.notes, item.session_type].filter(Boolean).join(" "), href: "/app/study", meta: `${item.duration_minutes} min · ${formatDate(item.started_at, { month: "short", day: "numeric" })}` })),
    ...transactions.map((item) => ({ id: `finance-${item.id}`, kind: "finance" as const, title: item.description || item.category, subtitle: `${formatLabel(item.transaction_type)} · ${item.category}`, searchable: [item.description, item.category, item.payment_method, item.transaction_type].filter(Boolean).join(" "), href: "/app/finance", meta: `${item.transaction_type === "income" ? "+" : "−"}${formatMoney(Number(item.amount), item.currency)}` })),
  ], [assignments, courses, notes, sessions, skills, tasks, transactions]);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (terms.length === 0) return true;
      const haystack = `${item.title} ${item.subtitle} ${item.searchable}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    }).slice(0, 100);
  }, [items, kind, query]);

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search all StudyFlow records</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, assignments, courses, notes, skills, sessions and finance…" className={`${inputClass} min-h-13 pl-12 text-base`} />
      </label>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {(["all", "task", "assignment", "course", "note", "skill", "study", "finance"] as Kind[]).map((value) => <button key={value} type="button" onClick={() => setKind(value)} aria-pressed={kind === value} className={cn("focus-ring min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold", kind === value ? "border-primary bg-primary text-primary-foreground" : "border-outline-variant bg-background")}>{formatLabel(value)}</button>)}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{results.length} result{results.length === 1 ? "" : "s"}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {results.map((item) => {
          const Icon = icons[item.kind];
          return <Link key={item.id} href={item.href} className="focus-ring flex min-h-28 items-start gap-4 rounded-card border border-outline-variant/55 bg-card p-4 shadow-card hover:border-primary"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.title}</p><Badge>{formatLabel(item.kind)}</Badge></div><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.subtitle}</p>{item.meta ? <p className="mt-2 text-xs font-medium text-primary">{item.meta}</p> : null}</div></Link>;
        })}
      </div>
      {results.length === 0 ? <div className="mt-8 rounded-card border border-dashed border-outline-variant p-10 text-center"><p className="font-semibold">No records matched</p><p className="mt-2 text-sm text-muted-foreground">Try fewer words or choose a different module filter.</p></div> : null}
    </div>
  );
}
