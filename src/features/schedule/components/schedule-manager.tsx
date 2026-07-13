
"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  ActionMessage,
  FieldError,
  FormLabel,
  inputClass,
} from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createExamAction,
  createTimetableAction,
  deleteExamAction,
  deleteTimetableAction,
  updateExamAction,
  updateTimetableAction,
} from "@/features/schedule/actions/schedule-actions";
import { formatDate } from "@/lib/display";
import { initialActionState, type ActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type TimetableEntry = Database["public"]["Tables"]["class_timetable_entries"]["Row"];
type Exam = Database["public"]["Tables"]["exam_schedules"]["Row"];
type Section = "timetable" | "exams";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function timeLabel(value: string | null) {
  if (!value) return "Time not set";
  const [hourString, minute] = value.slice(0, 5).split(":");
  const hour = Number(hourString);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function courseLabel(course?: Course) {
  return course ? `${course.course_code} — ${course.course_name}` : "No course linked";
}

function TimetableFields({
  state,
  courses,
  entry,
}: {
  state: ActionState;
  courses: Course[];
  entry?: TimetableEntry;
}) {
  const suffix = entry?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`class-title-${suffix}`}>Class title</FormLabel>
          <input
            id={`class-title-${suffix}`}
            name="title"
            defaultValue={entry?.title ?? ""}
            className={inputClass}
            placeholder="Database Systems lecture"
            required
          />
          <FieldError state={state} field="title" />
        </div>
        <div>
          <FormLabel htmlFor={`class-course-${suffix}`}>Course</FormLabel>
          <select
            id={`class-course-${suffix}`}
            name="courseId"
            defaultValue={entry?.course_id ?? ""}
            className={inputClass}
          >
            <option value="">No course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_code} — {course.course_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FormLabel htmlFor={`class-day-${suffix}`}>Day</FormLabel>
          <select
            id={`class-day-${suffix}`}
            name="dayOfWeek"
            defaultValue={entry?.day_of_week ?? 0}
            className={inputClass}
          >
            {dayNames.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FormLabel htmlFor={`class-start-${suffix}`}>Start time</FormLabel>
          <input
            id={`class-start-${suffix}`}
            name="startTime"
            type="time"
            defaultValue={entry?.start_time?.slice(0, 5) ?? ""}
            className={inputClass}
            required
          />
          <FieldError state={state} field="startTime" />
        </div>
        <div>
          <FormLabel htmlFor={`class-end-${suffix}`}>End time</FormLabel>
          <input
            id={`class-end-${suffix}`}
            name="endTime"
            type="time"
            defaultValue={entry?.end_time?.slice(0, 5) ?? ""}
            className={inputClass}
            required
          />
          <FieldError state={state} field="endTime" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`class-location-${suffix}`}>Room or location</FormLabel>
          <input
            id={`class-location-${suffix}`}
            name="location"
            defaultValue={entry?.location ?? ""}
            className={inputClass}
            placeholder="Room 402"
          />
        </div>
        <div>
          <FormLabel htmlFor={`class-instructor-${suffix}`}>Teacher</FormLabel>
          <input
            id={`class-instructor-${suffix}`}
            name="instructorName"
            defaultValue={entry?.instructor_name ?? ""}
            className={inputClass}
            placeholder="Instructor name"
          />
        </div>
      </div>

      <div>
        <FormLabel htmlFor={`class-notes-${suffix}`}>Notes</FormLabel>
        <textarea
          id={`class-notes-${suffix}`}
          name="notes"
          defaultValue={entry?.notes ?? ""}
          className={`${inputClass} min-h-20 py-3`}
          placeholder="Optional class notes"
        />
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          name="active"
          type="checkbox"
          defaultChecked={entry?.active ?? true}
          className="size-4 rounded border-outline-variant accent-primary"
        />
        Show this class in the active timetable
      </label>
    </div>
  );
}

function ExamFields({
  state,
  courses,
  exam,
}: {
  state: ActionState;
  courses: Course[];
  exam?: Exam;
}) {
  const suffix = exam?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`exam-title-${suffix}`}>Exam title</FormLabel>
          <input
            id={`exam-title-${suffix}`}
            name="title"
            defaultValue={exam?.title ?? ""}
            className={inputClass}
            placeholder="Data Structures Final"
            required
          />
          <FieldError state={state} field="title" />
        </div>
        <div>
          <FormLabel htmlFor={`exam-course-${suffix}`}>Course</FormLabel>
          <select
            id={`exam-course-${suffix}`}
            name="courseId"
            defaultValue={exam?.course_id ?? ""}
            className={inputClass}
          >
            <option value="">No course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_code} — {course.course_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FormLabel htmlFor={`exam-type-${suffix}`}>Exam type</FormLabel>
          <input
            id={`exam-type-${suffix}`}
            name="examType"
            defaultValue={exam?.exam_type ?? "Final Exam"}
            className={inputClass}
            placeholder="Midterm"
            required
          />
          <FieldError state={state} field="examType" />
        </div>
        <div>
          <FormLabel htmlFor={`exam-date-${suffix}`}>Date</FormLabel>
          <input
            id={`exam-date-${suffix}`}
            name="examDate"
            type="date"
            defaultValue={exam?.exam_date ?? ""}
            className={inputClass}
            required
          />
          <FieldError state={state} field="examDate" />
        </div>
        <div>
          <FormLabel htmlFor={`exam-start-${suffix}`}>Start time</FormLabel>
          <input
            id={`exam-start-${suffix}`}
            name="startTime"
            type="time"
            defaultValue={exam?.start_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <FormLabel htmlFor={`exam-end-${suffix}`}>End time</FormLabel>
          <input
            id={`exam-end-${suffix}`}
            name="endTime"
            type="time"
            defaultValue={exam?.end_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
          <FieldError state={state} field="endTime" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`exam-location-${suffix}`}>Room or location</FormLabel>
          <input
            id={`exam-location-${suffix}`}
            name="location"
            defaultValue={exam?.location ?? ""}
            className={inputClass}
            placeholder="Exam Hall A"
          />
        </div>
        <div>
          <FormLabel htmlFor={`exam-seat-${suffix}`}>Seat or roll information</FormLabel>
          <input
            id={`exam-seat-${suffix}`}
            name="seatInfo"
            defaultValue={exam?.seat_info ?? ""}
            className={inputClass}
            placeholder="Seat 18 / Row C"
          />
        </div>
      </div>

      <div>
        <FormLabel htmlFor={`exam-notes-${suffix}`}>Notes</FormLabel>
        <textarea
          id={`exam-notes-${suffix}`}
          name="notes"
          defaultValue={exam?.notes ?? ""}
          className={`${inputClass} min-h-20 py-3`}
          placeholder="Syllabus, instructions or required materials"
        />
      </div>
    </div>
  );
}

function AddTimetableForm({ courses }: { courses: Course[] }) {
  const [state, action, pending] = useActionState(
    createTimetableAction,
    initialActionState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5" /> Add a class
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <ActionMessage state={state} />
          <TimetableFields state={state} courses={courses} />
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add to timetable"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EditTimetableForm({
  entry,
  courses,
}: {
  entry: TimetableEntry;
  courses: Course[];
}) {
  const [state, action, pending] = useActionState(
    updateTimetableAction,
    initialActionState,
  );
  return (
    <details className="mt-4 rounded-2xl bg-surface-container-low p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        <Pencil className="size-4" /> Edit class
      </summary>
      <form action={action} className="mt-4 space-y-5">
        <input type="hidden" name="id" value={entry.id} />
        <ActionMessage state={state} />
        <TimetableFields state={state} courses={courses} entry={entry} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}

function AddExamForm({ courses }: { courses: Course[] }) {
  const [state, action, pending] = useActionState(
    createExamAction,
    initialActionState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5" /> Add an exam
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <ActionMessage state={state} />
          <ExamFields state={state} courses={courses} />
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add exam"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EditExamForm({ exam, courses }: { exam: Exam; courses: Course[] }) {
  const [state, action, pending] = useActionState(
    updateExamAction,
    initialActionState,
  );
  return (
    <details className="mt-4 rounded-2xl bg-surface-container-low p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        <Pencil className="size-4" /> Edit exam
      </summary>
      <form action={action} className="mt-4 space-y-5">
        <input type="hidden" name="id" value={exam.id} />
        <ActionMessage state={state} />
        <ExamFields state={state} courses={courses} exam={exam} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}

export function ScheduleManager({
  courses,
  timetable,
  exams,
}: {
  courses: Course[];
  timetable: TimetableEntry[];
  exams: Exam[];
}) {
  const [section, setSection] = useState<Section>("timetable");
  const courseById = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses],
  );

  const groupedTimetable = useMemo(
    () =>
      dayNames.map((day, index) => ({
        day,
        entries: timetable
          .filter((entry) => entry.day_of_week === index)
          .sort((a, b) => a.start_time.localeCompare(b.start_time)),
      })),
    [timetable],
  );

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-container p-1.5 sm:max-w-xl">
        <button
          type="button"
          onClick={() => setSection("timetable")}
          className={cn(
            "min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors",
            section === "timetable"
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Class timetable
        </button>
        <button
          type="button"
          onClick={() => setSection("exams")}
          className={cn(
            "min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors",
            section === "exams"
              ? "bg-card text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Exam schedule
        </button>
      </div>

      {section === "timetable" ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <AddTimetableForm courses={courses} />
          <div className="space-y-5">
            {timetable.length === 0 ? (
              <Card className="p-10 text-center">
                <CalendarClock className="mx-auto size-8 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">No classes yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your weekly classes to build a timetable.
                </p>
              </Card>
            ) : (
              groupedTimetable.map((group) =>
                group.entries.length > 0 ? (
                  <section key={group.day}>
                    <h2 className="mb-3 text-lg font-semibold">{group.day}</h2>
                    <div className="space-y-3">
                      {group.entries.map((entry) => {
                        const course = entry.course_id
                          ? courseById.get(entry.course_id)
                          : undefined;
                        return (
                          <Card key={entry.id} className="p-5">
                            <div className="flex items-start gap-4">
                              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
                                <GraduationCap className="size-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h3 className="font-semibold">{entry.title}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {courseLabel(course)}
                                    </p>
                                  </div>
                                  <form
                                    action={deleteTimetableAction}
                                    onSubmit={(event) => {
                                      if (!window.confirm(`Delete “${entry.title}”?`)) {
                                        event.preventDefault();
                                      }
                                    }}
                                  >
                                    <input type="hidden" name="id" value={entry.id} />
                                    <Button
                                      type="submit"
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      aria-label={`Delete ${entry.title}`}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </form>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge className="gap-1">
                                    <Clock3 className="size-3.5" />
                                    {timeLabel(entry.start_time)} – {timeLabel(entry.end_time)}
                                  </Badge>
                                  {entry.location ? (
                                    <Badge className="gap-1">
                                      <MapPin className="size-3.5" /> {entry.location}
                                    </Badge>
                                  ) : null}
                                  {!entry.active ? <Badge>Inactive</Badge> : null}
                                </div>
                                {entry.instructor_name ? (
                                  <p className="mt-3 text-sm text-muted-foreground">
                                    Teacher: {entry.instructor_name}
                                  </p>
                                ) : null}
                                {entry.notes ? (
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {entry.notes}
                                  </p>
                                ) : null}
                                <EditTimetableForm entry={entry} courses={courses} />
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                ) : null,
              )
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <AddExamForm courses={courses} />
          <div className="space-y-4">
            {exams.length === 0 ? (
              <Card className="p-10 text-center">
                <CalendarClock className="mx-auto size-8 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">No exams scheduled</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add exam dates, times and room information.
                </p>
              </Card>
            ) : (
              exams.map((exam) => {
                const course = exam.course_id
                  ? courseById.get(exam.course_id)
                  : undefined;
                return (
                  <Card key={exam.id} className="p-5">
                    <div className="flex items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-tertiary-container text-on-tertiary-container">
                        <CalendarClock className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{exam.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {courseLabel(course)}
                            </p>
                          </div>
                          <form
                            action={deleteExamAction}
                            onSubmit={(event) => {
                              if (!window.confirm(`Delete “${exam.title}”?`)) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="id" value={exam.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              aria-label={`Delete ${exam.title}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </form>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>{exam.exam_type}</Badge>
                          <Badge>
                            {formatDate(exam.exam_date, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Badge>
                          {exam.start_time ? (
                            <Badge className="gap-1">
                              <Clock3 className="size-3.5" />
                              {timeLabel(exam.start_time)}
                              {exam.end_time ? ` – ${timeLabel(exam.end_time)}` : ""}
                            </Badge>
                          ) : null}
                          {exam.location ? (
                            <Badge className="gap-1">
                              <MapPin className="size-3.5" /> {exam.location}
                            </Badge>
                          ) : null}
                        </div>
                        {exam.seat_info ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Seat information: {exam.seat_info}
                          </p>
                        ) : null}
                        {exam.notes ? (
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {exam.notes}
                          </p>
                        ) : null}
                        <EditExamForm exam={exam} courses={courses} />
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
