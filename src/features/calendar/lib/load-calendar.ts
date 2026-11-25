import { EVENT_LABEL, EVENT_TONE, type EventType, type Tone } from "@/features/calendar/lib/categories";
import { assignmentTypeLabel } from "@/features/dashboard/data";
import { addDays, dateKey, daysBetween, timeInZone, weekday } from "@/lib/dates";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type EditableEvent = {
  id: string;
  title: string;
  eventType: EventType;
  courseId: string | null;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
};

export type CalendarItem = {
  key: string;
  date: string;
  start: string | null;
  end: string | null;
  title: string;
  label: string;
  detail: string | null;
  tone: Tone;
  href: string | null;
  alert: "overdue" | "soon" | null;
  done: boolean;
  courseColor: string | null;
  event?: EditableEvent;
};

const OPEN_ASSIGNMENT = new Set(["not_started", "in_progress", "ready_to_submit"]);
const OPEN_TASK = new Set(["todo", "in_progress"]);
const EXAM_ASSIGNMENT = new Set(["quiz", "midterm", "final_exam", "viva"]);

export async function loadCalendar(supabase: ServerClient, userId: string, from: string, to: string, timeZone: string, today: string) {
  const fromIso = new Date(Date.parse(`${from}T00:00:00Z`) - 86_400_000).toISOString();
  const toIso = new Date(Date.parse(`${to}T23:59:59Z`) + 86_400_000).toISOString();

  const [courses, semesters, events, exams, assignments, timetable, tasks] = await Promise.all([
    supabase.from("courses").select("id,course_name,color,semester_id,archived").eq("user_id", userId).order("sort_order").order("course_name"),
    supabase.from("academic_semesters").select("id,start_date,end_date").eq("user_id", userId),
    supabase.from("calendar_events").select("*").eq("user_id", userId).gte("start_at", fromIso).lte("start_at", toIso).order("start_at"),
    supabase.from("exam_schedules").select("id,title,exam_type,exam_date,start_time,end_time,location,course_id").eq("user_id", userId).gte("exam_date", from).lte("exam_date", to),
    supabase.from("assignments").select("id,title,assignment_type,due_date,due_time,submission_status,course_id").eq("user_id", userId).gte("due_date", from).lte("due_date", to),
    supabase.from("class_timetable_entries").select("id,title,day_of_week,start_time,end_time,location,course_id").eq("user_id", userId).eq("active", true),
    supabase.from("tasks").select("id,title,due_date,due_time,status,course_id").eq("user_id", userId).not("due_date", "is", null).gte("due_date", from).lte("due_date", to),
  ]);

  const errors = [courses, semesters, events, exams, assignments, timetable, tasks].map((result) => result.error).filter(Boolean);
  const courseById = new Map((courses.data ?? []).map((course) => [course.id, course]));
  const semesterById = new Map((semesters.data ?? []).map((semester) => [semester.id, semester]));
  const courseName = (id: string | null) => (id ? courseById.get(id)?.course_name ?? null : null);
  const courseColor = (id: string | null) => (id ? courseById.get(id)?.color ?? null : null);
  const deadlineAlert = (date: string, open: boolean): CalendarItem["alert"] => {
    if (!open) return null;
    const days = daysBetween(today, date);
    return days < 0 ? "overdue" : days <= 3 ? "soon" : null;
  };

  const items: CalendarItem[] = [];

  for (const event of events.data ?? []) {
    const date = dateKey(new Date(event.start_at), timeZone);
    if (date < from || date > to) continue;
    const start = event.all_day ? null : timeInZone(event.start_at, timeZone);
    const end = event.all_day ? null : timeInZone(event.end_at, timeZone);
    items.push({
      key: `event-${event.id}`,
      date,
      start,
      end: end && end !== start ? end : null,
      title: event.title,
      label: EVENT_LABEL[event.event_type] ?? "Evento",
      detail: [courseName(event.course_id), event.location].filter(Boolean).join(" · ") || null,
      tone: EVENT_TONE[event.event_type] ?? "slate",
      href: null,
      alert: ["deadline", "project_deadline", "assignment"].includes(event.event_type) ? deadlineAlert(date, date >= today) : null,
      done: false,
      courseColor: courseColor(event.course_id),
      event: {
        id: event.id,
        title: event.title,
        eventType: event.event_type,
        courseId: event.course_id,
        date,
        allDay: event.all_day,
        startTime: start ?? "",
        endTime: end && end !== start ? end : "",
        location: event.location ?? "",
        description: event.description ?? "",
      },
    });
  }

  for (const exam of exams.data ?? []) {
    items.push({
      key: `exam-${exam.id}`,
      date: exam.exam_date,
      start: exam.start_time?.slice(0, 5) ?? null,
      end: exam.end_time?.slice(0, 5) ?? null,
      title: exam.title,
      label: "Prova",
      detail: [exam.exam_type, courseName(exam.course_id), exam.location].filter(Boolean).join(" · ") || null,
      tone: "wine",
      href: "/app/schedule",
      alert: exam.exam_date >= today && daysBetween(today, exam.exam_date) <= 3 ? "soon" : null,
      done: exam.exam_date < today,
      courseColor: courseColor(exam.course_id),
    });
  }

  for (const assignment of assignments.data ?? []) {
    const open = OPEN_ASSIGNMENT.has(assignment.submission_status);
    const isExam = EXAM_ASSIGNMENT.has(assignment.assignment_type);
    items.push({
      key: `assignment-${assignment.id}`,
      date: assignment.due_date,
      start: assignment.due_time?.slice(0, 5) ?? null,
      end: null,
      title: assignment.title,
      label: isExam ? "Prova" : assignmentTypeLabel(assignment.assignment_type),
      detail: courseName(assignment.course_id),
      tone: isExam ? "wine" : "gold",
      href: "/app/planner",
      alert: isExam ? null : deadlineAlert(assignment.due_date, open),
      done: !open,
      courseColor: courseColor(assignment.course_id),
    });
  }

  for (const task of tasks.data ?? []) {
    if (!task.due_date) continue;
    const open = OPEN_TASK.has(task.status);
    items.push({
      key: `task-${task.id}`,
      date: task.due_date,
      start: task.due_time?.slice(0, 5) ?? null,
      end: null,
      title: task.title,
      label: "Tarefa",
      detail: courseName(task.course_id),
      tone: "slate",
      href: "/app/tasks",
      alert: deadlineAlert(task.due_date, open),
      done: !open,
      courseColor: courseColor(task.course_id),
    });
  }

  // Weekly timetable classes, limited to their course's semester dates when known.
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const dow = weekday(day);
    for (const entry of timetable.data ?? []) {
      if (entry.day_of_week !== dow) continue;
      const course = entry.course_id ? courseById.get(entry.course_id) : undefined;
      if (course?.archived) continue;
      const semester = course?.semester_id ? semesterById.get(course.semester_id) : undefined;
      if (semester?.start_date && day < semester.start_date) continue;
      if (semester?.end_date && day > semester.end_date) continue;
      items.push({
        key: `class-${entry.id}-${day}`,
        date: day,
        start: entry.start_time.slice(0, 5),
        end: entry.end_time.slice(0, 5),
        title: entry.title,
        label: "Aula",
        detail: [courseName(entry.course_id), entry.location].filter(Boolean).join(" · ") || null,
        tone: "navy",
        href: entry.course_id ? `/app/courses/${entry.course_id}` : "/app/schedule",
        alert: null,
        done: false,
        courseColor: courseColor(entry.course_id),
      });
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? "") || a.title.localeCompare(b.title, "pt-BR"));

  // Overdue open work from before the visible range (for the list view).
  const { data: overdueAssignments } = await supabase
    .from("assignments")
    .select("id,title,assignment_type,due_date,course_id,submission_status")
    .eq("user_id", userId)
    .lt("due_date", today)
    .in("submission_status", ["not_started", "in_progress", "ready_to_submit"])
    .order("due_date")
    .limit(50);
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id,title,due_date,course_id,status")
    .eq("user_id", userId)
    .lt("due_date", today)
    .in("status", ["todo", "in_progress"])
    .order("due_date")
    .limit(50);
  const overdue: CalendarItem[] = [
    ...(overdueAssignments ?? []).map((item) => ({
      key: `overdue-assignment-${item.id}`,
      date: item.due_date,
      start: null,
      end: null,
      title: item.title,
      label: assignmentTypeLabel(item.assignment_type),
      detail: courseName(item.course_id),
      tone: "gold" as Tone,
      href: "/app/planner",
      alert: "overdue" as const,
      done: false,
      courseColor: courseColor(item.course_id),
    })),
    ...(overdueTasks ?? []).filter((item) => item.due_date).map((item) => ({
      key: `overdue-task-${item.id}`,
      date: item.due_date!,
      start: null,
      end: null,
      title: item.title,
      label: "Tarefa",
      detail: courseName(item.course_id),
      tone: "slate" as Tone,
      href: "/app/tasks",
      alert: "overdue" as const,
      done: false,
      courseColor: courseColor(item.course_id),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    errors,
    items,
    overdue,
    courses: (courses.data ?? []).filter((course) => !course.archived).map(({ id, course_name }) => ({ id, course_name })),
  };
}
