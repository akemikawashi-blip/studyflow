import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ScheduleManager } from "@/features/schedule/components/schedule-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function SchedulePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: courses, error: courseError },
    { data: timetable, error: timetableError },
    { data: exams, error: examError },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("course_code"),
    supabase
      .from("class_timetable_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("exam_schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("exam_date")
      .order("start_time"),
  ]);

  const error = courseError || timetableError || examError;

  return (
    <PageContainer>
      <PageHeader
        title="Class & exam schedule"
        description="Build a weekly class timetable and keep every exam date, time and room in one place."
      />
      {error ? (
        <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container">
          <p className="font-semibold">Schedule data could not be loaded.</p>
          <p className="mt-1 text-sm">
            Run supabase/phase3-academic-tools.sql in the Supabase SQL Editor,
            then refresh this page.
          </p>
        </div>
      ) : (
        <div className="mt-7">
          <ScheduleManager
            courses={courses ?? []}
            timetable={timetable ?? []}
            exams={exams ?? []}
          />
        </div>
      )}
    </PageContainer>
  );
}
