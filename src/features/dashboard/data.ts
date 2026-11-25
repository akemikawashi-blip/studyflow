import { addDays, dateKey, daysBetween, DEFAULT_TIME_ZONE, isValidTimeZone, monthGrid, weekday, weekKeys } from "@/lib/dates";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type AgendaKind = "class" | "exam" | "assignment" | "event" | "task";

export type AgendaItem = {
  id: string;
  kind: AgendaKind;
  date: string;
  time: string | null;
  title: string;
  detail: string | null;
  href: string;
  color?: string | null;
};

export type AttentionItem = {
  id: string;
  title: string;
  reason: string;
  severity: "overdue" | "soon" | "today";
  href: string;
  sortKey: string;
};

const EXAM_ASSIGNMENT_TYPES = new Set(["quiz", "midterm", "final_exam"]);
const OPEN_ASSIGNMENT = new Set(["not_started", "in_progress", "ready_to_submit"]);
const OPEN_TASK = new Set(["todo", "in_progress"]);

const ASSIGNMENT_TYPE_LABEL: Record<string, string> = {
  homework: "Atividade",
  report: "Relatório",
  presentation: "Apresentação",
  project: "Projeto",
  quiz: "Teste",
  midterm: "Prova parcial",
  final_exam: "Prova final",
  lab: "Laboratório",
  viva: "Prova oral",
  other: "Trabalho",
};

export function assignmentTypeLabel(type: string) {
  return ASSIGNMENT_TYPE_LABEL[type] ?? "Trabalho";
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export async function loadDashboard(supabase: ServerClient, userId: string) {
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("full_name,university_name,department").eq("id", userId).maybeSingle(),
    supabase.from("user_preferences").select("time_zone,daily_study_goal_minutes,weekly_study_goal_minutes").eq("user_id", userId).maybeSingle(),
  ]);

  const timeZone = isValidTimeZone(preferences?.time_zone) ? preferences.time_zone : DEFAULT_TIME_ZONE;
  const today = dateKey(new Date(), timeZone);
  const week = weekKeys(today);
  const month = monthGrid(today);
  const rangeStart = month[0] < week[0] ? month[0] : week[0];
  const rangeEnd = addDays(today, 60) > month[41] ? addDays(today, 60) : month[41];
  const weekStartIso = new Date(`${week[0]}T00:00:00Z`).getTime() - 14 * 3_600_000;

  const [courses, lessons, notes, tasks, assignments, exams, timetable, events, sessions] = await Promise.all([
    supabase.from("courses").select("id,course_code,course_name,color,instructor_name,semester,archived,sort_order").eq("user_id", userId).order("sort_order").order("course_name"),
    supabase.from("lessons").select("id,title,lesson_date,course_id,topic,created_at").eq("user_id", userId).order("lesson_date", { ascending: false }).order("created_at", { ascending: false }).limit(8),
    supabase.from("notes").select("id,lesson_id,course_id,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(2000),
    supabase.from("tasks").select("id,title,status,due_date,due_time,priority,completed_at,course_id").eq("user_id", userId).or(`status.in.(todo,in_progress),completed_at.gte."${new Date(weekStartIso).toISOString()}"`).limit(500),
    supabase.from("assignments").select("id,title,assignment_type,due_date,due_time,submission_status,priority,course_id,completed_at,updated_at").eq("user_id", userId).gte("due_date", addDays(today, -120)).lte("due_date", rangeEnd).order("due_date").limit(500),
    supabase.from("exam_schedules").select("id,title,exam_type,exam_date,start_time,location,course_id").eq("user_id", userId).gte("exam_date", rangeStart).lte("exam_date", rangeEnd).order("exam_date").order("start_time").limit(300),
    supabase.from("class_timetable_entries").select("id,title,day_of_week,start_time,end_time,location,course_id,active").eq("user_id", userId).eq("active", true).order("start_time"),
    supabase.from("calendar_events").select("id,title,start_at,end_at,all_day,event_type,course_id,location").eq("user_id", userId).gte("end_at", new Date(Date.parse(`${rangeStart}T00:00:00Z`) - 86_400_000).toISOString()).lte("start_at", `${addDays(rangeEnd, 1)}T23:59:59Z`).order("start_at").limit(500),
    supabase.from("study_sessions").select("duration_minutes,started_at,course_id").eq("user_id", userId).eq("status", "completed").gte("started_at", new Date(weekStartIso).toISOString()).limit(500),
  ]);

  const errors = [courses, lessons, notes, tasks, assignments, exams, timetable, events, sessions]
    .map((result) => result.error)
    .filter(Boolean);

  const courseList = courses.data ?? [];
  const courseById = new Map(courseList.map((course) => [course.id, course]));
  const courseName = (id: string | null) => (id ? courseById.get(id)?.course_name ?? null : null);
  const courseColor = (id: string | null) => (id ? courseById.get(id)?.color ?? null : null);

  // ---------------------------------------------------------------- agenda
  const agenda: AgendaItem[] = [];
  for (const day of week) {
    const dow = weekday(day);
    for (const entry of timetable.data ?? []) {
      if (entry.day_of_week !== dow) continue;
      agenda.push({
        id: `class-${entry.id}-${day}`,
        kind: "class",
        date: day,
        time: entry.start_time.slice(0, 5),
        title: entry.title,
        detail: [courseName(entry.course_id), entry.location].filter(Boolean).join(" · ") || null,
        href: "/app/schedule",
        color: courseColor(entry.course_id),
      });
    }
  }
  for (const exam of exams.data ?? []) {
    agenda.push({
      id: `exam-${exam.id}`,
      kind: "exam",
      date: exam.exam_date,
      time: exam.start_time?.slice(0, 5) ?? null,
      title: exam.title,
      detail: [exam.exam_type, courseName(exam.course_id), exam.location].filter(Boolean).join(" · ") || null,
      href: "/app/schedule",
      color: courseColor(exam.course_id),
    });
  }
  for (const assignment of assignments.data ?? []) {
    if (!OPEN_ASSIGNMENT.has(assignment.submission_status)) continue;
    agenda.push({
      id: `assignment-${assignment.id}`,
      kind: EXAM_ASSIGNMENT_TYPES.has(assignment.assignment_type) ? "exam" : "assignment",
      date: assignment.due_date,
      time: assignment.due_time?.slice(0, 5) ?? null,
      title: assignment.title,
      detail: [assignmentTypeLabel(assignment.assignment_type), courseName(assignment.course_id)].filter(Boolean).join(" · "),
      href: "/app/planner",
      color: courseColor(assignment.course_id),
    });
  }
  for (const event of events.data ?? []) {
    const firstDay = dateKey(new Date(event.start_at), timeZone);
    const lastDay = event.all_day ? dateKey(new Date(event.end_at), timeZone) : firstDay;
    for (let day = firstDay < rangeStart ? rangeStart : firstDay; day <= lastDay && day <= rangeEnd; day = addDays(day, 1)) {
      agenda.push({
        id: `event-${event.id}-${day}`,
        kind: event.event_type === "exam" ? "exam" : event.event_type === "class" ? "class" : "event",
        date: day,
        time: event.all_day ? null : new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(event.start_at)),
        title: event.title,
        detail: [courseName(event.course_id), event.location].filter(Boolean).join(" · ") || null,
        href: `/app/calendar?view=day&date=${day}`,
        color: courseColor(event.course_id),
      });
    }
  }
  for (const task of tasks.data ?? []) {
    if (!task.due_date || !OPEN_TASK.has(task.status)) continue;
    agenda.push({
      id: `task-${task.id}`,
      kind: "task",
      date: task.due_date,
      time: task.due_time?.slice(0, 5) ?? null,
      title: task.title,
      detail: courseName(task.course_id),
      href: "/app/tasks",
      color: courseColor(task.course_id),
    });
  }
  agenda.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));

  const weekAgenda = week.map((day) => ({ day, items: agenda.filter((item) => item.date === day) }));
  const monthMarks = new Map<string, Set<AgendaKind>>();
  for (const item of agenda) {
    if (item.kind === "class" || item.date < month[0] || item.date > month[41]) continue;
    const kinds = monthMarks.get(item.date) ?? new Set<AgendaKind>();
    kinds.add(item.kind);
    monthMarks.set(item.date, kinds);
  }

  // ---------------------------------------------------------------- attention
  const attention: AttentionItem[] = [];
  for (const task of tasks.data ?? []) {
    if (!task.due_date || !OPEN_TASK.has(task.status)) continue;
    const days = daysBetween(today, task.due_date);
    if (days < 0) {
      attention.push({ id: `task-${task.id}`, title: task.title, reason: `Tarefa atrasada há ${plural(-days, "dia", "dias")}`, severity: "overdue", href: "/app/tasks", sortKey: `0${task.due_date}` });
    } else if (days === 0 && (task.priority === "high" || task.priority === "urgent")) {
      attention.push({ id: `task-${task.id}`, title: task.title, reason: "Tarefa prioritária para hoje", severity: "today", href: "/app/tasks", sortKey: `1${task.due_date}` });
    }
  }
  for (const assignment of assignments.data ?? []) {
    if (!OPEN_ASSIGNMENT.has(assignment.submission_status)) continue;
    const days = daysBetween(today, assignment.due_date);
    const label = assignmentTypeLabel(assignment.assignment_type);
    if (days < 0) {
      attention.push({ id: `assignment-${assignment.id}`, title: assignment.title, reason: `${label} com prazo vencido há ${plural(-days, "dia", "dias")}`, severity: "overdue", href: "/app/planner", sortKey: `0${assignment.due_date}` });
    } else if (days <= 3) {
      attention.push({ id: `assignment-${assignment.id}`, title: assignment.title, reason: days === 0 ? `${label} — entrega hoje` : `${label} — entrega em ${plural(days, "dia", "dias")}`, severity: days === 0 ? "today" : "soon", href: "/app/planner", sortKey: `1${assignment.due_date}` });
    }
  }
  for (const exam of exams.data ?? []) {
    const days = daysBetween(today, exam.exam_date);
    if (days >= 0 && days <= 7) {
      attention.push({ id: `exam-${exam.id}`, title: exam.title, reason: days === 0 ? "Prova hoje" : `Prova em ${plural(days, "dia", "dias")}`, severity: days <= 1 ? "today" : "soon", href: "/app/schedule", sortKey: `1${exam.exam_date}` });
    }
  }
  attention.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // ---------------------------------------------------------------- lists
  const upcomingExams = agenda
    .filter((item) => item.kind === "exam" && item.date >= today)
    .filter((item, index, all) => {
      const stem = (id: string) => id.replace(/-\d{4}-\d{2}-\d{2}$/, "");
      return all.findIndex((other) => stem(other.id) === stem(item.id)) === index;
    })
    .slice(0, 5);

  const pendingAssignments = (assignments.data ?? [])
    .filter((assignment) => OPEN_ASSIGNMENT.has(assignment.submission_status) && !EXAM_ASSIGNMENT_TYPES.has(assignment.assignment_type))
    .slice(0, 6)
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      date: assignment.due_date,
      type: assignmentTypeLabel(assignment.assignment_type),
      status: assignment.submission_status,
      course: courseName(assignment.course_id),
      color: courseColor(assignment.course_id),
    }));

  const noteByLesson = new Map<string, string>();
  const notesPerCourse = new Map<string, number>();
  for (const note of notes.data ?? []) {
    if (note.lesson_id && !noteByLesson.has(note.lesson_id)) noteByLesson.set(note.lesson_id, note.id);
    if (note.course_id) notesPerCourse.set(note.course_id, (notesPerCourse.get(note.course_id) ?? 0) + 1);
  }
  const recentLessons = (lessons.data ?? []).slice(0, 6).map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    date: lesson.lesson_date,
    topic: lesson.topic,
    course: courseName(lesson.course_id),
    color: courseColor(lesson.course_id),
    noteId: noteByLesson.get(lesson.id) ?? null,
  }));

  const activeCourses = courseList
    .filter((course) => !course.archived)
    .map((course) => ({ ...course, noteCount: notesPerCourse.get(course.id) ?? 0 }));

  // ---------------------------------------------------------------- progress
  const minutesByDay = new Map<string, number>(week.map((day) => [day, 0]));
  for (const session of sessions.data ?? []) {
    const day = dateKey(new Date(session.started_at), timeZone);
    if (minutesByDay.has(day)) minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + session.duration_minutes);
  }
  const weekMinutes = [...minutesByDay.values()].reduce((sum, value) => sum + value, 0);
  const completedThisWeek =
    (tasks.data ?? []).filter((task) => task.completed_at && dateKey(new Date(task.completed_at), timeZone) >= week[0]).length +
    (assignments.data ?? []).filter((assignment) => assignment.completed_at && dateKey(new Date(assignment.completed_at), timeZone) >= week[0]).length;
  const lessonsThisWeek = (lessons.data ?? []).filter((lesson) => lesson.lesson_date >= week[0] && lesson.lesson_date <= week[6]).length;

  return {
    errors,
    timeZone,
    today,
    week,
    month,
    profile: profile ?? null,
    weekAgenda,
    monthMarks,
    attention,
    upcomingExams,
    pendingAssignments,
    recentLessons,
    activeCourses,
    hasCourses: courseList.length > 0,
    progress: {
      minutesByDay: week.map((day) => ({ day, minutes: minutesByDay.get(day) ?? 0 })),
      weekMinutes,
      weeklyGoal: preferences?.weekly_study_goal_minutes ?? 0,
      dailyGoal: preferences?.daily_study_goal_minutes ?? 0,
    },
    summary: {
      lessonsThisWeek,
      completedThisWeek,
      openTasks: (tasks.data ?? []).filter((task) => OPEN_TASK.has(task.status)).length,
      nextExam: upcomingExams[0] ?? null,
    },
  };
}
