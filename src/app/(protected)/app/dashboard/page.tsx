import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flame,
  ListChecks,
  TrendingUp,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressRing } from "@/components/shared/progress-ring";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

function dateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function deadlineLabel(dueDate: string, today: string) {
  const due = new Date(`${dueDate}T00:00:00Z`);
  const now = new Date(`${today}T00:00:00Z`);
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000);

  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("time_zone,currency_code")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const timeZone = preferences?.time_zone || "Asia/Dhaka";
  const currency = preferences?.currency_code || "BDT";
  const today = dateKey(new Date(), timeZone);
  const displayDate = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const [
    { data: tasks },
    { data: assignments },
    { data: studySessions },
    { data: transactions },
    { data: skills },
    { data: courseProgress },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,status,due_date,due_time,priority,category")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from("assignments")
      .select("id,title,due_date,due_time,priority,submission_status")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("study_sessions")
      .select("duration_minutes,started_at,status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("transactions")
      .select("amount,transaction_type,transaction_date")
      .eq("user_id", user.id)
      .eq("transaction_date", today),
    supabase
      .from("skills")
      .select("id,title,next_action,progress_percentage,status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("course_progress")
      .select("completion_percentage")
      .eq("user_id", user.id),
  ]);

  const allTasks = tasks ?? [];
  const todayTasks = allTasks.filter((task) => task.due_date === today);
  const completedTodayTasks = todayTasks.filter(
    (task) => task.status === "completed",
  );
  const taskProgress =
    todayTasks.length === 0
      ? 0
      : Math.round((completedTodayTasks.length / todayTasks.length) * 100);

  const studyMinutesToday = (studySessions ?? [])
    .filter((session) => dateKey(new Date(session.started_at), timeZone) === today)
    .reduce((sum, session) => sum + session.duration_minutes, 0);

  const dailySpending = (transactions ?? [])
    .filter((item) => item.transaction_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const activeSkills = (skills ?? []).filter(
    (skill) => skill.status === "learning" || skill.status === "planned",
  );
  const topSkill = activeSkills[0];

  const assignmentItems = (assignments ?? []).filter(
    (assignment) =>
      assignment.submission_status !== "graded" &&
      assignment.submission_status !== "submitted",
  );

  const agenda = [
    ...todayTasks.map((task) => ({
      id: `task-${task.id}`,
      time: task.due_time?.slice(0, 5) || "All day",
      title: task.title,
      meta: `Task · ${task.category}`,
      tone:
        task.priority === "urgent" || task.priority === "high"
          ? "bg-destructive"
          : task.priority === "medium"
            ? "bg-tertiary"
            : "bg-primary",
    })),
    ...assignmentItems
      .filter((assignment) => assignment.due_date === today)
      .map((assignment) => ({
        id: `assignment-${assignment.id}`,
        time: assignment.due_time?.slice(0, 5) || "All day",
        title: assignment.title,
        meta: "Assignment due today",
        tone: "bg-secondary",
      })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const deadlineItems = assignmentItems.slice(0, 4);
  const syllabusAverage =
    courseProgress && courseProgress.length > 0
      ? Math.round(
          courseProgress.reduce(
            (sum, course) => sum + Number(course.completion_percentage ?? 0),
            0,
          ) / courseProgress.length,
        )
      : 0;

  const displayName =
    profile?.full_name ||
    (typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : "Student");

  return (
    <PageContainer>
      <PageHeader
        eyebrow={displayDate}
        title={`${greeting(timeZone)}, ${displayName}`}
        description="Your dashboard now reads from your private Supabase records."
      />

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_1.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Daily progress</CardTitle>
              <Badge className="bg-primary-fixed text-on-primary-fixed">
                Today
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 pt-2 text-center">
            <ProgressRing value={taskProgress} size="lg" />
            <div>
              <p className="font-medium">
                {todayTasks.length === 0
                  ? "No tasks are due today."
                  : `${completedTodayTasks.length} of ${todayTasks.length} tasks completed.`}
              </p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Add or complete tasks from the Tasks page and this card updates
                automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2">
          <StatCard
            label="Tasks completed"
            value={`${completedTodayTasks.length} / ${todayTasks.length}`}
            note="Tasks due today"
            icon={ListChecks}
          />
          <StatCard
            label="Study time"
            value={`${Math.floor(studyMinutesToday / 60)}h ${studyMinutesToday % 60}m`}
            note="Recorded today"
            icon={Clock3}
            tone="secondary"
          />
          <StatCard
            label="Daily spending"
            value={formatMoney(dailySpending, currency)}
            note="Expenses recorded today"
            icon={CircleDollarSign}
            tone="tertiary"
          />
          <StatCard
            label="Active skills"
            value={String(activeSkills.length)}
            note="Planned or currently learning"
            icon={Flame}
            tone="error"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Today&apos;s agenda</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tasks and assignments due today.
                </p>
              </div>
              <CalendarClock className="size-5 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {agenda.length > 0 ? (
              agenda.map((item) => (
                <article
                  key={item.id}
                  className="relative overflow-hidden rounded-2xl border border-outline-variant/55 bg-surface-container-lowest p-4 pl-5"
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1.5 ${item.tone}`}
                    aria-hidden="true"
                  />
                  <div className="flex items-start gap-4">
                    <time className="w-16 shrink-0 text-sm font-semibold text-primary">
                      {item.time}
                    </time>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.meta}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-outline-variant p-8 text-center">
                <p className="font-semibold">Your agenda is clear</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tasks and assignments due today will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Deadline summary</CardTitle>
              <TrendingUp className="size-5 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {deadlineItems.length > 0 ? (
              deadlineItems.map((item) => {
                const label = deadlineLabel(item.due_date, today);
                const overdue = label === "Overdue";
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-surface-container-low p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {label}
                      </p>
                    </div>
                    <Badge
                      className={
                        overdue
                          ? "bg-error-container text-on-error-container"
                          : "bg-tertiary-container text-on-tertiary-container"
                      }
                    >
                      {overdue ? "Overdue" : "Upcoming"}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-outline-variant p-6 text-center text-sm text-muted-foreground">
                No active assignment deadlines.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Card className="p-5">
          <BookOpen className="size-6 text-secondary" aria-hidden="true" />
          <h2 className="mt-5 text-lg font-semibold">Study sessions</h2>
          <p className="mt-2 text-3xl font-semibold">{studyMinutesToday} min</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Completed study time today
          </p>
        </Card>
        <Card className="p-5">
          <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-lg font-semibold">Syllabus coverage</h2>
          <p className="mt-2 text-3xl font-semibold">{syllabusAverage}%</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Average across your courses
          </p>
        </Card>
        <Card className="p-5">
          <BookOpen className="size-6 text-tertiary" aria-hidden="true" />
          <h2 className="mt-5 text-lg font-semibold">Active skill</h2>
          <p className="mt-2 text-xl font-semibold">
            {topSkill?.title || "No active skill"}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {topSkill?.next_action || "Add a skill and define its next action."}
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
