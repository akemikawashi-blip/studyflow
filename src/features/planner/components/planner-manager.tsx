"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { ActionMessage, FieldError, FormLabel, inputClass } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createAssignmentAction,
  createCourseAction,
  createEventAction,
  deleteAssignmentAction,
  deleteCourseAction,
  deleteEventAction,
  updateAssignmentAction,
  updateCourseAction,
  updateEventAction,
} from "@/features/planner/actions/planner-actions";
import { formatDate, formatLabel, toDateTimeLocal } from "@/lib/display";
import { initialActionState, type ActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
type Section = "courses" | "assignments" | "calendar";

const sectionLabels: Record<Section, string> = {
  courses: "Courses",
  assignments: "Assignments",
  calendar: "Calendar",
};

function CourseFields({ state, course }: { state: ActionState; course?: Course }) {
  const suffix = course?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`course-code-${suffix}`}>Course code</FormLabel>
          <input id={`course-code-${suffix}`} name="courseCode" defaultValue={course?.course_code ?? ""} className={inputClass} placeholder="CSE 230" required />
          <FieldError state={state} field="courseCode" />
        </div>
        <div>
          <FormLabel htmlFor={`course-name-${suffix}`}>Course name</FormLabel>
          <input id={`course-name-${suffix}`} name="courseName" defaultValue={course?.course_name ?? ""} className={inputClass} placeholder="Database Systems" required />
          <FieldError state={state} field="courseName" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FormLabel htmlFor={`course-instructor-${suffix}`}>Instructor</FormLabel>
          <input id={`course-instructor-${suffix}`} name="instructorName" defaultValue={course?.instructor_name ?? ""} className={inputClass} />
        </div>
        <div>
          <FormLabel htmlFor={`course-semester-${suffix}`}>Semester</FormLabel>
          <input id={`course-semester-${suffix}`} name="semester" defaultValue={course?.semester ?? ""} className={inputClass} placeholder="Fall 2026" />
        </div>
        <div>
          <FormLabel htmlFor={`course-credit-${suffix}`}>Credit hours</FormLabel>
          <input id={`course-credit-${suffix}`} name="creditHours" type="number" min="0" step="0.5" defaultValue={course?.credit_hours ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FormLabel htmlFor={`course-color-${suffix}`}>Course color</FormLabel>
          <input id={`course-color-${suffix}`} name="color" type="color" defaultValue={course?.color ?? "#24389c"} className={`${inputClass} p-1`} />
        </div>
        <div>
          <FormLabel htmlFor={`course-target-${suffix}`}>Target grade</FormLabel>
          <input id={`course-target-${suffix}`} name="targetGrade" defaultValue={course?.target_grade ?? ""} className={inputClass} placeholder="A" />
        </div>
        <div>
          <FormLabel htmlFor={`course-current-${suffix}`}>Current grade</FormLabel>
          <input id={`course-current-${suffix}`} name="currentGrade" defaultValue={course?.current_grade ?? ""} className={inputClass} placeholder="B+" />
        </div>
      </div>
    </div>
  );
}

function AssignmentFields({ state, assignment, courses }: { state: ActionState; assignment?: Assignment; courses: Course[] }) {
  const suffix = assignment?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`assignment-title-${suffix}`}>Title</FormLabel>
          <input id={`assignment-title-${suffix}`} name="title" defaultValue={assignment?.title ?? ""} className={inputClass} required />
          <FieldError state={state} field="title" />
        </div>
        <div>
          <FormLabel htmlFor={`assignment-course-${suffix}`}>Course</FormLabel>
          <select id={`assignment-course-${suffix}`} name="courseId" defaultValue={assignment?.course_id ?? ""} className={inputClass}>
            <option value="">No course</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} — {course.course_name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <FormLabel htmlFor={`assignment-description-${suffix}`}>Description</FormLabel>
        <textarea id={`assignment-description-${suffix}`} name="description" defaultValue={assignment?.description ?? ""} className={`${inputClass} min-h-20 py-3`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <FormLabel htmlFor={`assignment-type-${suffix}`}>Type</FormLabel>
          <select id={`assignment-type-${suffix}`} name="assignmentType" defaultValue={assignment?.assignment_type ?? "other"} className={inputClass}>
            {['homework','report','presentation','project','quiz','midterm','final_exam','lab','viva','other'].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </div>
        <div>
          <FormLabel htmlFor={`assignment-status-${suffix}`}>Status</FormLabel>
          <select id={`assignment-status-${suffix}`} name="submissionStatus" defaultValue={assignment?.submission_status ?? "not_started"} className={inputClass}>
            {['not_started','in_progress','ready_to_submit','submitted','graded','missed'].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </div>
        <div>
          <FormLabel htmlFor={`assignment-priority-${suffix}`}>Priority</FormLabel>
          <select id={`assignment-priority-${suffix}`} name="priority" defaultValue={assignment?.priority ?? "medium"} className={inputClass}>
            {['low','medium','high','urgent'].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </div>
        <div>
          <FormLabel htmlFor={`assignment-progress-${suffix}`}>Progress %</FormLabel>
          <input id={`assignment-progress-${suffix}`} name="progressPercentage" type="number" min="0" max="100" defaultValue={assignment?.progress_percentage ?? 0} className={inputClass} />
          <FieldError state={state} field="progressPercentage" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <FormLabel htmlFor={`assignment-assigned-${suffix}`}>Assigned date</FormLabel>
          <input id={`assignment-assigned-${suffix}`} name="assignedDate" type="date" defaultValue={assignment?.assigned_date ?? ""} className={inputClass} />
        </div>
        <div>
          <FormLabel htmlFor={`assignment-due-${suffix}`}>Due date</FormLabel>
          <input id={`assignment-due-${suffix}`} name="dueDate" type="date" defaultValue={assignment?.due_date ?? ""} className={inputClass} required />
          <FieldError state={state} field="dueDate" />
        </div>
        <div>
          <FormLabel htmlFor={`assignment-time-${suffix}`}>Due time</FormLabel>
          <input id={`assignment-time-${suffix}`} name="dueTime" type="time" defaultValue={assignment?.due_time?.slice(0, 5) ?? ""} className={inputClass} />
        </div>
        <div>
          <FormLabel htmlFor={`assignment-link-${suffix}`}>Submission link</FormLabel>
          <input id={`assignment-link-${suffix}`} name="submissionLink" type="url" defaultValue={assignment?.submission_link ?? ""} className={inputClass} placeholder="https://…" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`assignment-total-${suffix}`}>Total marks</FormLabel>
          <input id={`assignment-total-${suffix}`} name="totalMarks" type="number" min="0" step="0.01" defaultValue={assignment?.total_marks ?? ""} className={inputClass} />
        </div>
        <div>
          <FormLabel htmlFor={`assignment-obtained-${suffix}`}>Obtained marks</FormLabel>
          <input id={`assignment-obtained-${suffix}`} name="obtainedMarks" type="number" min="0" step="0.01" defaultValue={assignment?.obtained_marks ?? ""} className={inputClass} />
          <FieldError state={state} field="obtainedMarks" />
        </div>
      </div>
    </div>
  );
}

function EventFields({ state, event, courses }: { state: ActionState; event?: CalendarEvent; courses: Course[] }) {
  const suffix = event?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`event-title-${suffix}`}>Event title</FormLabel>
          <input id={`event-title-${suffix}`} name="title" defaultValue={event?.title ?? ""} className={inputClass} required />
          <FieldError state={state} field="title" />
        </div>
        <div>
          <FormLabel htmlFor={`event-type-${suffix}`}>Event type</FormLabel>
          <select id={`event-type-${suffix}`} name="eventType" defaultValue={event?.event_type ?? "personal_event"} className={inputClass}>
            {['class','study_session','assignment','exam','meeting','personal_event','task'].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`event-start-${suffix}`}>Start</FormLabel>
          <input id={`event-start-${suffix}`} name="startAt" type="datetime-local" defaultValue={toDateTimeLocal(event?.start_at ?? null)} className={inputClass} required />
          <FieldError state={state} field="startAt" />
        </div>
        <div>
          <FormLabel htmlFor={`event-end-${suffix}`}>End</FormLabel>
          <input id={`event-end-${suffix}`} name="endAt" type="datetime-local" defaultValue={toDateTimeLocal(event?.end_at ?? null)} className={inputClass} required />
          <FieldError state={state} field="endAt" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FormLabel htmlFor={`event-course-${suffix}`}>Course</FormLabel>
          <select id={`event-course-${suffix}`} name="courseId" defaultValue={event?.course_id ?? ""} className={inputClass}>
            <option value="">No course</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.course_code}</option>)}
          </select>
        </div>
        <div>
          <FormLabel htmlFor={`event-location-${suffix}`}>Location</FormLabel>
          <input id={`event-location-${suffix}`} name="location" defaultValue={event?.location ?? ""} className={inputClass} />
        </div>
        <div>
          <FormLabel htmlFor={`event-url-${suffix}`}>Meeting URL</FormLabel>
          <input id={`event-url-${suffix}`} name="meetingUrl" type="url" defaultValue={event?.meeting_url ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <FormLabel htmlFor={`event-description-${suffix}`}>Description</FormLabel>
        <textarea id={`event-description-${suffix}`} name="description" defaultValue={event?.description ?? ""} className={`${inputClass} min-h-20 py-3`} />
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-medium">
        <input name="allDay" type="checkbox" defaultChecked={event?.all_day ?? false} className="size-4" />
        All-day event
      </label>
    </div>
  );
}

function CreateCourse() {
  const [state, action, pending] = useActionState(createCourseAction, initialActionState);
  return <details className="surface-panel rounded-card p-5" open><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl font-semibold"><Plus className="size-5 text-primary" />Add course</summary><form action={action} className="mt-5 space-y-5"><ActionMessage state={state} /><CourseFields state={state} /><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add course"}</Button></form></details>;
}

function CreateAssignment({ courses }: { courses: Course[] }) {
  const [state, action, pending] = useActionState(createAssignmentAction, initialActionState);
  return <details className="surface-panel rounded-card p-5" open><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl font-semibold"><Plus className="size-5 text-primary" />Add assignment</summary><form action={action} className="mt-5 space-y-5"><ActionMessage state={state} /><AssignmentFields state={state} courses={courses} /><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add assignment"}</Button></form></details>;
}

function CreateEvent({ courses }: { courses: Course[] }) {
  const [state, action, pending] = useActionState(createEventAction, initialActionState);
  return <details className="surface-panel rounded-card p-5" open><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl font-semibold"><Plus className="size-5 text-primary" />Add calendar event</summary><form action={action} className="mt-5 space-y-5"><ActionMessage state={state} /><EventFields state={state} courses={courses} /><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add event"}</Button></form></details>;
}

function EditCourse({ course }: { course: Course }) {
  const [state, action, pending] = useActionState(updateCourseAction, initialActionState);
  return <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4"><summary className="focus-ring flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary"><Pencil className="size-4" />Edit</summary><form action={action} className="mt-4 space-y-4"><input type="hidden" name="id" value={course.id} /><ActionMessage state={state} /><CourseFields state={state} course={course} /><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form></details>;
}

function EditAssignment({ assignment, courses }: { assignment: Assignment; courses: Course[] }) {
  const [state, action, pending] = useActionState(updateAssignmentAction, initialActionState);
  return <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4"><summary className="focus-ring flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary"><Pencil className="size-4" />Edit</summary><form action={action} className="mt-4 space-y-4"><input type="hidden" name="id" value={assignment.id} /><ActionMessage state={state} /><AssignmentFields state={state} assignment={assignment} courses={courses} /><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form></details>;
}

function EditEvent({ event, courses }: { event: CalendarEvent; courses: Course[] }) {
  const [state, action, pending] = useActionState(updateEventAction, initialActionState);
  return <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4"><summary className="focus-ring flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary"><Pencil className="size-4" />Edit</summary><form action={action} className="mt-4 space-y-4"><input type="hidden" name="id" value={event.id} /><ActionMessage state={state} /><EventFields state={state} event={event} courses={courses} /><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form></details>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border border-dashed border-outline-variant p-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function PlannerManager({ courses, assignments, events }: { courses: Course[]; assignments: Assignment[]; events: CalendarEvent[] }) {
  const [section, setSection] = useState<Section>("assignments");
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Planner sections">
        {(Object.keys(sectionLabels) as Section[]).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={section === item} onClick={() => setSection(item)} className={cn("focus-ring min-h-11 rounded-full border px-5 text-sm font-semibold", section === item ? "border-primary bg-primary text-primary-foreground" : "border-outline-variant bg-background hover:border-primary")}>{sectionLabels[item]}</button>
        ))}
      </div>

      <div className="mt-5">
        {section === "courses" ? (
          <div className="space-y-5">
            <CreateCourse />
            {courses.length === 0 ? <Empty>Add your first course to connect assignments, events, notes and study sessions.</Empty> : courses.map((course) => (
              <Card key={course.id} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="mt-1 size-4 shrink-0 rounded-full" style={{ backgroundColor: course.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h2 className="text-lg font-semibold">{course.course_code} — {course.course_name}</h2><p className="mt-1 text-sm text-muted-foreground">{[course.instructor_name, course.semester, course.credit_hours !== null ? `${course.credit_hours} credits` : null].filter(Boolean).join(" · ") || "No additional details"}</p></div>
                      <form action={deleteCourseAction} onSubmit={(event) => { if (!window.confirm(`Delete “${course.course_name}”? Related records will remain but lose the course link.`)) event.preventDefault(); }}><input type="hidden" name="id" value={course.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${course.course_name}`}><Trash2 className="size-4" /></Button></form>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">{course.target_grade ? <Badge>Target: {course.target_grade}</Badge> : null}{course.current_grade ? <Badge>Current: {course.current_grade}</Badge> : null}</div>
                    <EditCourse course={course} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {section === "assignments" ? (
          <div className="space-y-5">
            <CreateAssignment courses={courses} />
            {assignments.length === 0 ? <Empty>No assignments yet. Add one and it will also appear on the dashboard.</Empty> : assignments.map((assignment) => {
              const course = assignment.course_id ? courseById.get(assignment.course_id) : undefined;
              return (
                <Card key={assignment.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed"><GraduationCap className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{assignment.title}</h2><p className="mt-1 text-sm text-muted-foreground">{course ? `${course.course_code} · ` : ""}{formatLabel(assignment.assignment_type)}</p></div><form action={deleteAssignmentAction} onSubmit={(event) => { if (!window.confirm(`Delete “${assignment.title}”?`)) event.preventDefault(); }}><input type="hidden" name="id" value={assignment.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${assignment.title}`}><Trash2 className="size-4" /></Button></form></div>
                      <div className="mt-3 flex flex-wrap items-center gap-2"><Badge className={assignment.priority === "urgent" || assignment.priority === "high" ? "bg-error-container text-on-error-container" : ""}>{formatLabel(assignment.priority)}</Badge><Badge>{formatLabel(assignment.submission_status)}</Badge><span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><CalendarDays className="size-4" />{formatDate(assignment.due_date)}</span>{assignment.due_time ? <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Clock3 className="size-4" />{assignment.due_time.slice(0,5)}</span> : null}</div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-primary" style={{ width: `${assignment.progress_percentage}%` }} /></div>
                      <p className="mt-1 text-right text-xs text-muted-foreground">{assignment.progress_percentage}% complete</p>
                      <EditAssignment assignment={assignment} courses={courses} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}

        {section === "calendar" ? (
          <div className="space-y-5">
            <CreateEvent courses={courses} />
            {events.length === 0 ? <Empty>No calendar events yet.</Empty> : events.map((event) => {
              const course = event.course_id ? courseById.get(event.course_id) : undefined;
              return (
                <Card key={event.id} className="p-5">
                  <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container"><CalendarDays className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{event.title}</h2><p className="mt-1 text-sm text-muted-foreground">{formatLabel(event.event_type)}{course ? ` · ${course.course_code}` : ""}</p></div><form action={deleteEventAction} onSubmit={(formEvent) => { if (!window.confirm(`Delete “${event.title}”?`)) formEvent.preventDefault(); }}><input type="hidden" name="id" value={event.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${event.title}`}><Trash2 className="size-4" /></Button></form></div><div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="size-4" />{formatDate(event.start_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} – {formatDate(event.end_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>{event.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{event.location}</span> : null}</div>{event.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.description}</p> : null}<EditEvent event={event} courses={courses} /></div></div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
