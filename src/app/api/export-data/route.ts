import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabase = await createClient();
  const [
    profile,
    preferences,
    courses,
    assignments,
    tasks,
    calendarEvents,
    studySessions,
    transactions,
    budgets,
    skills,
    notes,
    notifications,
    timetable,
    exams,
    semesters,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("courses").select("*").eq("user_id", user.id).order("course_code"),
    supabase.from("assignments").select("*").eq("user_id", user.id).order("due_date"),
    supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("calendar_events").select("*").eq("user_id", user.id).order("start_at"),
    supabase.from("study_sessions").select("*").eq("user_id", user.id).order("started_at"),
    supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date"),
    supabase.from("budgets").select("*").eq("user_id", user.id).order("budget_month"),
    supabase.from("skills").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at"),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("class_timetable_entries").select("*").eq("user_id", user.id).order("day_of_week").order("start_time"),
    supabase.from("exam_schedules").select("*").eq("user_id", user.id).order("exam_date").order("start_time"),
    supabase.from("academic_semesters").select("*").eq("user_id", user.id).order("sort_order").order("created_at"),
  ]);

  const results = [
    profile,
    preferences,
    courses,
    assignments,
    tasks,
    calendarEvents,
    studySessions,
    transactions,
    budgets,
    skills,
    notes,
    notifications,
    timetable,
    exams,
    semesters,
  ];
  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    return Response.json(
      {
        error:
          "StudyFlow could not prepare the export. Confirm that all database migrations are installed.",
      },
      { status: 500 },
    );
  }

  return Response.json({
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at,
    },
    profile: profile.data,
    preferences: preferences.data,
    courses: courses.data ?? [],
    assignments: assignments.data ?? [],
    tasks: tasks.data ?? [],
    calendarEvents: calendarEvents.data ?? [],
    studySessions: studySessions.data ?? [],
    transactions: transactions.data ?? [],
    budgets: budgets.data ?? [],
    skills: skills.data ?? [],
    notes: notes.data ?? [],
    notifications: notifications.data ?? [],
    classTimetable: timetable.data ?? [],
    examSchedule: exams.data ?? [],
    academicSemesters: semesters.data ?? [],
  });
}
