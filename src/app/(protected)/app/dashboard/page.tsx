import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpenText, CalendarDays, CheckCircle2, Clock3, GraduationCap, Search } from "lucide-react";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { loadDashboard, type AgendaItem, type AgendaKind } from "@/features/dashboard/data";
import { NewNoteDialog } from "@/features/notes/components/new-note-dialog";
import { requireUser } from "@/lib/auth/current-user";
import { daysBetween, formatKey, greeting, relativeDayLabel } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel" };

const KIND_STYLE: Record<AgendaKind, { label: string; dot: string; chip: string }> = {
  class: { label: "Aula", dot: "bg-primary", chip: "bg-primary-fixed text-on-primary-fixed" },
  exam: { label: "Prova", dot: "bg-destructive", chip: "bg-error-container text-on-error-container" },
  assignment: { label: "Entrega", dot: "bg-gold", chip: "bg-tertiary-container text-on-tertiary-container" },
  event: { label: "Evento", dot: "bg-secondary", chip: "bg-secondary-container text-on-secondary-container" },
  task: { label: "Tarefa", dot: "bg-outline", chip: "bg-surface-container-high text-on-surface-variant" },
};

const ASSIGNMENT_STATUS: Record<string, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  ready_to_submit: "Pronto para entregar",
};

function Panel({ title, eyebrow, action, children, className }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col rounded-xl border border-outline-variant/70 bg-card p-5 shadow-card", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-semibold text-on-surface-variant hover:text-primary">
      {children} <ArrowRight className="size-3.5" />
    </Link>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-outline-variant px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Stat({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-container text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold leading-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  const style = KIND_STYLE[item.kind];
  return (
    <Link href={item.href} className="focus-ring group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-surface-container">
      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-5 group-hover:text-primary">{item.title}</span>
        <span className="block truncate text-[11px] leading-4 text-muted-foreground">{[item.time, style.label, item.detail].filter(Boolean).join(" · ")}</span>
      </span>
    </Link>
  );
}

function minutesLabel(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours > 0 ? `${hours}h${minutes ? ` ${minutes}min` : ""}` : `${minutes}min`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const data = await loadDashboard(supabase, user.id);
  const { today, timeZone } = data;

  const metaName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "";
  const firstName = (data.profile?.full_name || metaName).trim().split(/\s+/)[0] ?? "";
  const longDate = formatKey(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const weekRange = `${formatKey(data.week[0], { day: "numeric", month: "short" })} – ${formatKey(data.week[6], { day: "numeric", month: "short" })}`;
  const courseOptions = data.activeCourses.map((course) => ({ id: course.id, course_name: course.course_name }));
  const weekMax = Math.max(data.progress.dailyGoal, ...data.progress.minutesByDay.map((entry) => entry.minutes), 1);
  const goalPercent = data.progress.weeklyGoal > 0 ? Math.min(100, Math.round((data.progress.weekMinutes / data.progress.weeklyGoal) * 100)) : null;
  const nextExam = data.summary.nextExam;

  return (
    <PageContainer>
      <header className="flex flex-col gap-5 border-b border-outline-variant/70 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">{longDate}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {greeting(timeZone)}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {data.attention.length > 0
              ? `${data.attention.length} ${data.attention.length === 1 ? "item precisa" : "itens precisam"} da sua atenção.`
              : "Nada pendente com urgência. Bom momento para estudar."}
          </p>
          {!timeZone.startsWith("America/") ? (
            <p className="mt-2 text-xs text-tertiary">
              Fuso horário configurado: {timeZone}. <Link href="/app/settings" className="font-semibold underline">Ajustar em Configurações</Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <NewNoteDialog courses={courseOptions} todayKey={today} trigger={<><BookOpenText className="size-4" /> Registrar aula</>} />
          <Link href="/app/search" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant bg-card px-4 text-sm font-semibold hover:border-primary">
            <Search className="size-4" /> Buscar
          </Link>
        </div>
      </header>

      {data.errors.length > 0 ? (
        <div className="mt-5 rounded-xl bg-error-container p-4 text-sm text-on-error-container">
          Parte dos dados não pôde ser carregada. Confirme que todas as migrações do banco foram aplicadas (incluindo supabase/atlas-upgrade.sql).
        </div>
      ) : null}

      {!data.hasCourses ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gold/50 bg-tertiary-container/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold">Comece cadastrando suas disciplinas</p>
            <p className="text-sm text-on-surface-variant">Com elas, aulas, anotações, provas e prazos ficam organizados por matéria.</p>
          </div>
          <Link href="/app/courses" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Cadastrar disciplinas</Link>
        </div>
      ) : null}

      <section aria-label="Resumo da semana" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<BookOpenText className="size-5" />} label="Aulas registradas" value={String(data.summary.lessonsThisWeek)} note={`Semana de ${weekRange}`} />
        <Stat icon={<Clock3 className="size-5" />} label="Tempo de estudo" value={minutesLabel(data.progress.weekMinutes)} note={goalPercent === null ? "Defina uma meta em Configurações" : `${goalPercent}% da meta semanal`} />
        <Stat icon={<CheckCircle2 className="size-5" />} label="Concluídas na semana" value={String(data.summary.completedThisWeek)} note={`${data.summary.openTasks} tarefas em aberto`} />
        <Stat
          icon={<GraduationCap className="size-5" />}
          label="Próxima prova"
          value={nextExam ? relativeDayLabel(nextExam.date, today) : "—"}
          note={nextExam ? nextExam.title : "Nenhuma prova agendada"}
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel eyebrow={weekRange} title="Minha semana acadêmica" action={<PanelLink href="/app/calendar?view=week">Calendário</PanelLink>}>
          <div className="grid gap-px overflow-hidden rounded-lg border border-outline-variant/70 bg-outline-variant/70 md:grid-cols-7">
            {data.weekAgenda.map(({ day, items }) => {
              const isToday = day === today;
              const past = day < today;
              return (
                <div key={day} className={cn("min-h-28 bg-card p-2", isToday && "bg-primary-fixed/50", past && "bg-surface-container-low")}>
                  <p className={cn("mb-1.5 flex items-baseline gap-1.5 px-1.5 text-xs", isToday ? "font-semibold text-primary" : "text-muted-foreground")}>
                    <span className="capitalize">{formatKey(day, { weekday: "short" }).replace(".", "")}</span>
                    <span className={cn("font-display text-base", isToday ? "text-primary" : "text-foreground")}>{formatKey(day, { day: "numeric" })}</span>
                    {isToday ? <span className="ml-auto text-[10px] uppercase tracking-wider text-gold md:hidden">Hoje</span> : null}
                  </p>
                  {items.length > 0 ? (
                    <div className="flex flex-col gap-0.5">{items.map((item) => <AgendaRow key={item.id} item={item} />)}</div>
                  ) : (
                    <p className="px-1.5 text-[11px] text-muted-foreground/70">Livre</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {(Object.keys(KIND_STYLE) as AgendaKind[]).map((kind) => (
              <span key={kind} className="inline-flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", KIND_STYLE[kind].dot)} />{KIND_STYLE[kind].label}</span>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Automático" title="Preciso resolver">
          {data.attention.length === 0 ? (
            <Empty>Nenhuma tarefa atrasada, prova próxima ou entrega urgente.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.attention.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className={cn("focus-ring flex items-start gap-3 rounded-lg border p-3 hover:border-primary/50", item.severity === "overdue" ? "border-destructive/30 bg-error-container/40" : "border-outline-variant/70 bg-surface-container-low")}>
                    <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", item.severity === "overdue" ? "text-destructive" : item.severity === "today" ? "text-gold" : "text-muted-foreground")} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">{item.reason}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {data.attention.length > 8 ? <li className="px-1 text-xs text-muted-foreground">+ {data.attention.length - 8} outros itens</li> : null}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel eyebrow="Avaliações" title="Próximas provas" action={<PanelLink href="/app/schedule">Ver todas</PanelLink>}>
          {data.upcomingExams.length === 0 ? (
            <Empty>Nenhuma prova cadastrada para os próximos 60 dias.</Empty>
          ) : (
            <ul className="divide-y divide-outline-variant/60">
              {data.upcomingExams.map((exam) => {
                const days = daysBetween(today, exam.date);
                return (
                  <li key={exam.id} className="flex items-center gap-3 py-2.5">
                    <div className={cn("grid w-12 shrink-0 place-items-center rounded-lg py-1 text-center", days <= 7 ? "bg-error-container text-on-error-container" : "bg-surface-container")}>
                      <span className="font-display text-lg font-semibold leading-none">{formatKey(exam.date, { day: "2-digit" })}</span>
                      <span className="text-[10px] uppercase">{formatKey(exam.date, { month: "short" }).replace(".", "")}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{exam.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{[relativeDayLabel(exam.date, today), exam.time, exam.detail].filter(Boolean).join(" · ")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Prazos" title="Trabalhos pendentes" action={<PanelLink href="/app/planner">Ver todos</PanelLink>}>
          {data.pendingAssignments.length === 0 ? (
            <Empty>Nenhum trabalho pendente.</Empty>
          ) : (
            <ul className="divide-y divide-outline-variant/60">
              {data.pendingAssignments.map((assignment) => {
                const overdue = assignment.date < today;
                return (
                  <li key={assignment.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{assignment.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{[assignment.type, assignment.course, ASSIGNMENT_STATUS[assignment.status]].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", overdue ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant")}>
                      {overdue ? "Atrasado" : relativeDayLabel(assignment.date, today)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel eyebrow={formatKey(today, { month: "long", year: "numeric" })} title="Calendário" action={<PanelLink href="/app/calendar">Abrir</PanelLink>} className="lg:col-span-2 xl:col-span-1">
          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-muted-foreground">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((label, index) => <span key={index} className="pb-1 font-semibold">{label}</span>)}
            {data.month.map((day) => {
              const kinds = data.monthMarks.get(day);
              const inMonth = day.slice(0, 7) === today.slice(0, 7);
              return (
                <div key={day} className="flex flex-col items-center gap-0.5 py-0.5">
                  <span className={cn("grid size-7 place-items-center rounded-full text-xs", day === today ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/50")}>
                    {Number(day.slice(8))}
                  </span>
                  <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                    {kinds ? [...kinds].slice(0, 3).map((kind) => <span key={kind} className={cn("size-1 rounded-full", KIND_STYLE[kind].dot)} />) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel eyebrow="Caderno" title="Aulas recentes" action={<PanelLink href="/app/notes?view=date">Caderno</PanelLink>}>
          {data.recentLessons.length === 0 ? (
            <Empty>Nenhuma aula registrada ainda. Use “Registrar aula” para começar.</Empty>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.recentLessons.map((lesson) => {
                const body = (
                  <>
                    <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: lesson.color ?? "var(--outline-variant)" }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{lesson.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{[formatKey(lesson.date, { day: "2-digit", month: "short" }), lesson.course, lesson.topic].filter(Boolean).join(" · ")}</span>
                    </span>
                  </>
                );
                return (
                  <li key={lesson.id}>
                    {lesson.noteId ? (
                      <Link href={`/app/notes/${lesson.noteId}`} className="focus-ring flex items-start gap-3 rounded-lg p-2 hover:bg-surface-container">{body}</Link>
                    ) : (
                      <div className="flex items-start gap-3 p-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Em andamento" title="Disciplinas" action={<PanelLink href="/app/courses">Gerenciar</PanelLink>}>
          {data.activeCourses.length === 0 ? (
            <Empty>Nenhuma disciplina ativa.</Empty>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.activeCourses.slice(0, 8).map((course) => (
                <li key={course.id}>
                  <Link href={`/app/courses/${course.id}`} className="focus-ring flex items-center gap-3 rounded-lg p-2 hover:bg-surface-container">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{course.course_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{[course.instructor_name, course.semester].filter(Boolean).join(" · ") || course.course_code}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{course.noteCount} {course.noteCount === 1 ? "anotação" : "anotações"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel eyebrow="Esta semana" title="Progresso de estudos" action={<PanelLink href="/app/study">Estudos</PanelLink>} className="lg:col-span-2 xl:col-span-1">
          <div className="flex items-end justify-between gap-2" aria-label="Minutos de estudo por dia">
            {data.progress.minutesByDay.map(({ day, minutes }) => (
              <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{minutes > 0 ? minutesLabel(minutes) : ""}</span>
                <div className="relative h-24 w-full max-w-8 overflow-hidden rounded-md bg-surface-container">
                  <div className={cn("absolute inset-x-0 bottom-0 rounded-md", day === today ? "bg-primary" : "bg-secondary")} style={{ height: `${Math.round((minutes / weekMax) * 100)}%` }} />
                  {data.progress.dailyGoal > 0 ? (
                    <div className="absolute inset-x-0 border-t border-dashed border-gold" style={{ bottom: `${Math.round((data.progress.dailyGoal / weekMax) * 100)}%` }} aria-hidden="true" />
                  ) : null}
                </div>
                <span className={cn("text-[11px] capitalize", day === today ? "font-semibold text-primary" : "text-muted-foreground")}>{formatKey(day, { weekday: "narrow" })}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {minutesLabel(data.progress.weekMinutes)} registrados
            {data.progress.weeklyGoal > 0 ? ` de ${minutesLabel(data.progress.weeklyGoal)} na meta semanal` : ""}
            {data.progress.dailyGoal > 0 ? " · linha tracejada = meta diária" : ""}
          </p>
        </Panel>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" /> Provas parciais, testes e provas finais cadastrados em Disciplinas e prazos também aparecem como provas.
      </p>
    </PageContainer>
  );
}
