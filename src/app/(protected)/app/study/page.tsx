import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StudyManager } from "@/features/study/components/study-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

function dateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default async function StudyPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: sessions, error: sessionError }, { data: courses, error: courseError }, { data: preferences }] = await Promise.all([
    supabase.from("study_sessions").select("*").eq("user_id", user.id).eq("status", "completed").order("started_at", { ascending: false }).limit(100),
    supabase.from("courses").select("*").eq("user_id", user.id).order("course_code"),
    supabase.from("user_preferences").select("time_zone,daily_study_goal_minutes,weekly_study_goal_minutes").eq("user_id", user.id).maybeSingle(),
  ]);

  const timeZone = preferences?.time_zone || "Asia/Dhaka";
  const now = new Date();
  const today = dateKey(now, timeZone);
  const startOfWeek = new Date(now);
  const weekday = Number(new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now) === "Sun" ? 0 : now.getDay());
  startOfWeek.setDate(now.getDate() - ((weekday + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const completed = sessions ?? [];
  const todayMinutes = completed.filter((session) => dateKey(new Date(session.started_at), timeZone) === today).reduce((sum, session) => sum + session.duration_minutes, 0);
  const weekMinutes = completed.filter((session) => new Date(session.started_at) >= startOfWeek).reduce((sum, session) => sum + session.duration_minutes, 0);
  const weeklyBars = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + index);
    const key = dateKey(day, timeZone);
    return { label: ["M","T","W","T","F","S","S"][index], minutes: completed.filter((session) => dateKey(new Date(session.started_at), timeZone) === key).reduce((sum, session) => sum + session.duration_minutes, 0) };
  });
  const error = sessionError || courseError;

  return (
    <PageContainer>
      <PageHeader title="Study tracker" description="Use a real focus timer, record sessions, connect them to courses, and measure daily and weekly progress." />
      {error ? <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container"><p className="font-semibold">Study data could not be loaded.</p><p className="mt-1 text-sm">Confirm that the Supabase migration is complete.</p></div> : <div className="mt-7"><StudyManager sessions={completed} courses={courses ?? []} todayMinutes={todayMinutes} weekMinutes={weekMinutes} dailyGoal={preferences?.daily_study_goal_minutes ?? 60} weeklyGoal={preferences?.weekly_study_goal_minutes ?? 420} weeklyBars={weeklyBars} /></div>}
    </PageContainer>
  );
}
