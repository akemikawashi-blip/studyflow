import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ItemChip, ItemRow, NewEventButton } from "@/features/calendar/components/calendar-parts";
import { TONE_CLASSES } from "@/features/calendar/lib/categories";
import { loadCalendar, type CalendarItem } from "@/features/calendar/lib/load-calendar";
import { requireUser } from "@/lib/auth/current-user";
import { addDays, dateKey, formatKey, monthGrid, relativeDayLabel, weekKeys } from "@/lib/dates";
import { getTimeZone } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendário" };

const VIEWS = [
  { id: "month", label: "Mês" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Dia" },
  { id: "list", label: "Lista" },
] as const;
type View = (typeof VIEWS)[number]["id"];

const LEGEND: { tone: keyof typeof TONE_CLASSES; label: string }[] = [
  { tone: "navy", label: "Aulas" },
  { tone: "wine", label: "Provas" },
  { tone: "gold", label: "Trabalhos e entregas" },
  { tone: "plum", label: "Seminários e apresentações" },
  { tone: "teal", label: "Reuniões e eventos" },
  { tone: "sage", label: "Estudo e extracurricular" },
  { tone: "slate", label: "Tarefas e pessoal" },
];

function shiftMonth(key: string, delta: number) {
  const date = new Date(`${key.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 10);
}

function groupByDay(items: CalendarItem[]) {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) map.set(item.date, [...(map.get(item.date) ?? []), item]);
  return map;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const viewParam = first(params.view);
  const view: View = VIEWS.some((item) => item.id === viewParam) ? (viewParam as View) : "month";

  const user = await requireUser();
  const supabase = await createClient();
  const timeZone = await getTimeZone(supabase, user.id);
  const today = dateKey(new Date(), timeZone);
  const dateParam = first(params.date);
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !Number.isNaN(Date.parse(dateParam)) ? dateParam : today;

  const grid = monthGrid(anchor);
  const week = weekKeys(anchor);
  const range = view === "month" ? [grid[0], grid[41]] : view === "week" ? [week[0], week[6]] : view === "day" ? [anchor, anchor] : [anchor, addDays(anchor, 59)];
  const data = await loadCalendar(supabase, user.id, range[0], range[1], timeZone, today);
  const byDay = groupByDay(data.items);

  const step = { month: [shiftMonth(anchor, -1), shiftMonth(anchor, 1)], week: [addDays(anchor, -7), addDays(anchor, 7)], day: [addDays(anchor, -1), addDays(anchor, 1)], list: [addDays(anchor, -30), addDays(anchor, 30)] }[view];
  const href = (nextView: View, date: string) => `/app/calendar?view=${nextView}&date=${date}`;
  const title =
    view === "month"
      ? formatKey(anchor, { month: "long", year: "numeric" })
      : view === "week"
        ? `${formatKey(week[0], { day: "numeric", month: "short" })} – ${formatKey(week[6], { day: "numeric", month: "short", year: "numeric" })}`
        : view === "day"
          ? formatKey(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
          : `A partir de ${formatKey(anchor, { day: "numeric", month: "long" })}`;

  return (
    <PageContainer>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Calendário acadêmico</p>
          <h1 className="font-display text-3xl font-semibold first-letter:uppercase sm:text-4xl">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Visualização" className="flex rounded-lg border border-outline-variant bg-card p-0.5">
            {VIEWS.map((item) => (
              <Link key={item.id} href={href(item.id, anchor)} aria-current={view === item.id ? "page" : undefined} className={cn("focus-ring rounded-md px-3 py-1.5 text-sm font-medium", view === item.id ? "bg-primary text-primary-foreground" : "text-on-surface-variant hover:bg-surface-container")}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center rounded-lg border border-outline-variant bg-card p-0.5">
            <Link href={href(view, step[0])} className="focus-ring grid size-8 place-items-center rounded-md hover:bg-surface-container" aria-label="Anterior"><ChevronLeft className="size-4" /></Link>
            <Link href={href(view, today)} className="focus-ring rounded-md px-3 py-1.5 text-sm font-medium hover:bg-surface-container">Hoje</Link>
            <Link href={href(view, step[1])} className="focus-ring grid size-8 place-items-center rounded-md hover:bg-surface-container" aria-label="Próximo"><ChevronRight className="size-4" /></Link>
          </div>
          <NewEventButton date={view === "month" && anchor.slice(0, 7) !== today.slice(0, 7) ? anchor : view === "month" ? today : anchor} courses={data.courses} />
        </div>
      </header>

      {data.errors.length > 0 ? (
        <div className="mt-5 rounded-xl bg-error-container p-4 text-sm text-on-error-container">Parte dos compromissos não pôde ser carregada. Confirme que supabase/atlas-upgrade.sql foi aplicado.</div>
      ) : null}

      {data.overdue.length > 0 ? (
        <details className="mt-5 rounded-xl border border-destructive/30 bg-error-container/40 p-4">
          <summary className="focus-ring flex cursor-pointer items-center gap-2 rounded text-sm font-semibold text-on-error-container">
            <AlertTriangle className="size-4" /> {data.overdue.length} {data.overdue.length === 1 ? "pendência atrasada" : "pendências atrasadas"}
          </summary>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.overdue.map((item) => (
              <li key={item.key}><ItemChip item={{ ...item, detail: [relativeDayLabel(item.date, today), item.detail].filter(Boolean).join(" · ") }} courses={data.courses} showTime={false} /></li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-5">
        {view === "month" ? (
          <>
            <div className="overflow-hidden rounded-xl border border-outline-variant/70 bg-card shadow-card">
              <div className="grid grid-cols-7 border-b border-outline-variant/70 bg-surface-container-low text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <span key={day} className="py-2">{day}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-outline-variant/60">
                {grid.map((day) => {
                  const items = byDay.get(day) ?? [];
                  const inMonth = day.slice(0, 7) === anchor.slice(0, 7);
                  return (
                    <div key={day} className={cn("group min-h-16 bg-card p-1 sm:min-h-28 sm:p-1.5", !inMonth && "bg-surface-container-low/70")}>
                      <div className="flex items-center justify-between">
                        <Link href={href("day", day)} className={cn("focus-ring grid size-7 place-items-center rounded-full text-xs", day === today ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "hover:bg-surface-container" : "text-muted-foreground/60")} aria-label={formatKey(day, { day: "numeric", month: "long" })}>
                          {Number(day.slice(8))}
                        </Link>
                        <span className="hidden sm:block"><NewEventButton date={day} courses={data.courses} compact /></span>
                      </div>
                      <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
                        {items.slice(0, 3).map((item) => <ItemChip key={item.key} item={item} courses={data.courses} />)}
                        {items.length > 3 ? <Link href={href("day", day)} className="px-1 text-[11px] font-medium text-muted-foreground hover:text-primary">+{items.length - 3} mais</Link> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden" aria-hidden="true">
                        {items.slice(0, 4).map((item) => <span key={item.key} className={cn("size-1.5 rounded-full", TONE_CLASSES[item.tone].dot)} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <section className="mt-5 sm:hidden" aria-label="Compromissos do mês">
              {grid.filter((day) => day.slice(0, 7) === anchor.slice(0, 7) && (byDay.get(day)?.length ?? 0) > 0).map((day) => (
                <div key={day} className="mb-4">
                  <h2 className="mb-1.5 text-sm font-semibold first-letter:uppercase">{formatKey(day, { weekday: "long", day: "numeric", month: "short" })}</h2>
                  <div className="flex flex-col gap-1.5">{(byDay.get(day) ?? []).map((item) => <ItemRow key={item.key} item={item} courses={data.courses} />)}</div>
                </div>
              ))}
            </section>
          </>
        ) : null}

        {view === "week" ? (
          <div className="grid gap-px overflow-hidden rounded-xl border border-outline-variant/70 bg-outline-variant/60 shadow-card md:grid-cols-7">
            {week.map((day) => (
              <div key={day} className={cn("min-h-40 bg-card p-2", day === today && "bg-primary-fixed/40")}>
                <div className="mb-2 flex items-center justify-between">
                  <Link href={href("day", day)} className="focus-ring rounded text-sm hover:text-primary">
                    <span className="capitalize text-muted-foreground">{formatKey(day, { weekday: "short" }).replace(".", "")}</span>{" "}
                    <span className={cn("font-display text-lg", day === today && "font-semibold text-primary")}>{Number(day.slice(8))}</span>
                  </Link>
                  <NewEventButton date={day} courses={data.courses} compact />
                </div>
                <div className="flex flex-col gap-1">
                  {(byDay.get(day) ?? []).map((item) => <ItemChip key={item.key} item={item} courses={data.courses} />)}
                  {(byDay.get(day) ?? []).length === 0 ? <p className="text-[11px] text-muted-foreground/70">Livre</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {view === "day" ? (
          <div className="rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card sm:p-6">
            {(byDay.get(anchor) ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
            ) : (
              <div className="flex flex-col gap-2">{(byDay.get(anchor) ?? []).map((item) => <ItemRow key={item.key} item={item} courses={data.courses} />)}</div>
            )}
          </div>
        ) : null}

        {view === "list" ? (
          data.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-outline p-10 text-center text-sm text-muted-foreground">Nenhum compromisso nos próximos 60 dias.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {[...byDay.entries()].map(([day, items]) => (
                <section key={day} aria-label={formatKey(day, { day: "numeric", month: "long" })}>
                  <h2 className="mb-2 flex items-baseline gap-2 border-b border-outline-variant/70 pb-1">
                    <span className="font-display text-lg font-semibold first-letter:uppercase">{formatKey(day, { weekday: "long", day: "numeric", month: "long" })}</span>
                    <span className="text-xs text-muted-foreground">{relativeDayLabel(day, today)}</span>
                  </h2>
                  <div className="flex flex-col gap-1.5">{items.map((item) => <ItemRow key={item.key} item={item} courses={data.courses} />)}</div>
                </section>
              ))}
            </div>
          )
        ) : null}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Legenda">
        {LEGEND.map((entry) => <li key={entry.tone} className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", TONE_CLASSES[entry.tone].dot)} />{entry.label}</li>)}
        <li className="inline-flex items-center gap-1.5"><AlertTriangle className="size-3 text-destructive" /> atrasado</li>
        <li className="inline-flex items-center gap-1.5"><AlertTriangle className="size-3 text-gold" /> prazo em até 3 dias</li>
      </ul>
    </PageContainer>
  );
}
