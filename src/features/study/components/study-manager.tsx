"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, Pause, Pencil, Play, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

import { ActionMessage, FieldError, FormLabel, inputClass } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { createStudySessionAction, deleteStudySessionAction, updateStudySessionAction } from "@/features/study/actions/study-actions";
import { formatDate, formatLabel } from "@/lib/display";
import { initialActionState, type ActionState } from "@/lib/forms/action-state";
import type { Database } from "@/types/database.generated";

type Session = Database["public"]["Tables"]["study_sessions"]["Row"];
type Course = Database["public"]["Tables"]["courses"]["Row"];

function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining].map((value) => String(value).padStart(2, "0")).join(":");
}

function SessionFields({ state, session, courses }: { state: ActionState; session?: Session; courses: Course[] }) {
  const suffix = session?.id ?? "manual";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`study-title-${suffix}`}>Session title</FormLabel>
          <input id={`study-title-${suffix}`} name="title" defaultValue={session?.title ?? ""} className={inputClass} placeholder="Chapter 4 revision" required />
          <FieldError state={state} field="title" />
        </div>
        <div>
          <FormLabel htmlFor={`study-course-${suffix}`}>Course</FormLabel>
          <select id={`study-course-${suffix}`} name="courseId" defaultValue={session?.course_id ?? ""} className={inputClass}>
            <option value="">No course</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} — {course.course_name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <FormLabel htmlFor={`study-type-${suffix}`}>Type</FormLabel>
          <select id={`study-type-${suffix}`} name="sessionType" defaultValue={session?.session_type ?? "revision"} className={inputClass}>
            {['reading','revision','assignment','practice','lecture_review','skill_learning','other'].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </div>
        <div>
          <FormLabel htmlFor={`study-duration-${suffix}`}>Minutes</FormLabel>
          <input id={`study-duration-${suffix}`} name="durationMinutes" type="number" min="1" max="1440" defaultValue={session?.duration_minutes ?? ""} className={inputClass} required />
          <FieldError state={state} field="durationMinutes" />
        </div>
        {!session ? (
          <div>
            <FormLabel htmlFor="study-started-manual">Started at</FormLabel>
            <input id="study-started-manual" name="startedAt" type="datetime-local" className={inputClass} />
          </div>
        ) : <input type="hidden" name="startedAt" value="" />}
        <div>
          <FormLabel htmlFor={`study-focus-${suffix}`}>Focus rating</FormLabel>
          <select id={`study-focus-${suffix}`} name="focusRating" defaultValue={session?.focus_rating ?? ""} className={inputClass}>
            <option value="">Not rated</option>
            {[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}/5</option>)}
          </select>
        </div>
      </div>
      <div>
        <FormLabel htmlFor={`study-notes-${suffix}`}>Notes</FormLabel>
        <textarea id={`study-notes-${suffix}`} name="notes" defaultValue={session?.notes ?? ""} className={`${inputClass} min-h-20 py-3`} placeholder="What did you cover?" />
      </div>
      <input type="hidden" name="accumulatedSeconds" value={session ? session.duration_minutes * 60 : 0} />
    </div>
  );
}

function StudyTimer({ courses }: { courses: Course[] }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [state, action, pending] = useActionState(createStudySessionAction, initialActionState);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);


  return (
    <Card className="p-5 sm:p-6">
      <form action={action} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Focus timer</h2>
            <p className="mt-1 text-sm text-muted-foreground">Run the timer, then save the completed session to your account.</p>
          </div>
          <Badge className={running ? "bg-secondary-container text-on-secondary-container" : ""}>{running ? "Running" : seconds > 0 ? "Paused" : "Ready"}</Badge>
        </div>
        <ActionMessage state={state} />
        <div className="rounded-card bg-surface-container-low p-6 text-center">
          <p className="font-mono text-5xl font-semibold tracking-tight sm:text-6xl" aria-live="polite">{formatClock(seconds)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FormLabel htmlFor="timer-title">Session title</FormLabel>
            <input id="timer-title" name="title" className={inputClass} placeholder="Focused study session" required />
            <FieldError state={state} field="title" />
          </div>
          <div>
            <FormLabel htmlFor="timer-course">Course</FormLabel>
            <select id="timer-course" name="courseId" className={inputClass} defaultValue="">
              <option value="">No course</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} — {course.course_name}</option>)}
            </select>
          </div>
          <div>
            <FormLabel htmlFor="timer-type">Session type</FormLabel>
            <select id="timer-type" name="sessionType" className={inputClass} defaultValue="revision">
              {['reading','revision','assignment','practice','lecture_review','skill_learning','other'].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </div>
          <div>
            <FormLabel htmlFor="timer-focus">Focus rating</FormLabel>
            <select id="timer-focus" name="focusRating" className={inputClass} defaultValue="">
              <option value="">Not rated</option>
              {[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}/5</option>)}
            </select>
          </div>
        </div>
        <div>
          <FormLabel htmlFor="timer-notes">Notes</FormLabel>
          <textarea id="timer-notes" name="notes" className={`${inputClass} min-h-20 py-3`} placeholder="Optional session notes" />
        </div>
        <input type="hidden" name="durationMinutes" value={Math.ceil(seconds / 60)} />
        <input type="hidden" name="accumulatedSeconds" value={seconds} />
        <input type="hidden" name="startedAt" value="" />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setRunning((value) => !value)}>{running ? <Pause className="size-4" /> : <Play className="size-4" />}{running ? "Pause" : seconds > 0 ? "Resume" : "Start"}</Button>
          <Button type="button" variant="outline" onClick={() => { setRunning(false); setSeconds(0); }} disabled={seconds === 0}><RotateCcw className="size-4" />Reset</Button>
          <Button type="submit" variant="secondary" disabled={pending || seconds === 0}><Save className="size-4" />{pending ? "Saving…" : "Save session"}</Button>
        </div>
      </form>
    </Card>
  );
}

function AddManualSession({ courses }: { courses: Course[] }) {
  const [state, action, pending] = useActionState(createStudySessionAction, initialActionState);
  return (
    <details className="surface-panel rounded-card p-5">
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl font-semibold"><Plus className="size-5 text-primary" />Record a session manually</summary>
      <form action={action} className="mt-5 space-y-5"><ActionMessage state={state} /><SessionFields state={state} courses={courses} /><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save session"}</Button></form>
    </details>
  );
}

function EditSession({ session, courses }: { session: Session; courses: Course[] }) {
  const [state, action, pending] = useActionState(updateStudySessionAction, initialActionState);
  return (
    <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary"><Pencil className="size-4" />Edit session</summary>
      <form action={action} className="mt-4 space-y-4"><input type="hidden" name="id" value={session.id} /><ActionMessage state={state} /><SessionFields state={state} session={session} courses={courses} /><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form>
    </details>
  );
}

export function StudyManager({ sessions, courses, todayMinutes, weekMinutes, dailyGoal, weeklyGoal, weeklyBars }: { sessions: Session[]; courses: Course[]; todayMinutes: number; weekMinutes: number; dailyGoal: number; weeklyGoal: number; weeklyBars: { label: string; minutes: number }[] }) {
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const maxMinutes = Math.max(1, ...weeklyBars.map((item) => item.minutes));

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <StudyTimer courses={courses} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <StatCard label="Today" value={`${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`} note={`Goal: ${Math.floor(dailyGoal / 60)}h ${dailyGoal % 60}m`} icon={Clock3} tone="secondary" />
          <StatCard label="This week" value={`${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m`} note={`Goal: ${Math.floor(weeklyGoal / 60)}h ${weeklyGoal % 60}m`} icon={BookOpen} tone="tertiary" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Weekly focus</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-52 items-end gap-3 border-b border-outline-variant/55">
              {weeklyBars.map((item) => (
                <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div className="min-h-1 rounded-t-xl bg-primary" style={{ height: `${Math.max(3, (item.minutes / maxMinutes) * 100)}%` }} title={`${item.minutes} minutes`} />
                  <span className="pb-3 text-center text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <AddManualSession courses={courses} />
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Recent sessions</h2>
        <div className="mt-4 space-y-4">
          {sessions.length === 0 ? <div className="rounded-card border border-dashed border-outline-variant p-10 text-center text-sm text-muted-foreground">No study sessions yet. Start the timer or record one manually.</div> : sessions.map((session) => {
            const course = session.course_id ? courseById.get(session.course_id) : undefined;
            return (
              <Card key={session.id} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed"><BookOpen className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h3 className="font-semibold">{session.title}</h3><p className="mt-1 text-sm text-muted-foreground">{course ? `${course.course_code} · ` : ""}{formatLabel(session.session_type)} · {session.duration_minutes} min</p></div>
                      <form action={deleteStudySessionAction} onSubmit={(event) => { if (!window.confirm(`Delete “${session.title}”?`)) event.preventDefault(); }}><input type="hidden" name="id" value={session.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${session.title}`}><Trash2 className="size-4" /></Button></form>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2"><Badge>{formatDate(session.started_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Badge>{session.focus_rating ? <Badge>Focus {session.focus_rating}/5</Badge> : null}</div>
                    {session.notes ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{session.notes}</p> : null}
                    <EditSession session={session} courses={courses} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
