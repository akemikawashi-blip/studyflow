"use client";

import { useActionState, useMemo } from "react";
import { Award, BarChart3, Pencil, Plus, Trash2 } from "lucide-react";

import {
  ActionMessage,
  FieldError,
  FormLabel,
  inputClass,
} from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import {
  createSemesterAction,
  deleteSemesterAction,
  updateSemesterAction,
} from "@/features/academic/actions/academic-actions";
import { initialActionState, type ActionState } from "@/lib/forms/action-state";
import type { Database } from "@/types/database.generated";

type Semester = Database["public"]["Tables"]["academic_semesters"]["Row"];

function SemesterFields({
  state,
  semester,
  defaultOrder,
}: {
  state: ActionState;
  semester?: Semester;
  defaultOrder: number;
}) {
  const suffix = semester?.id ?? "new";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={`semester-name-${suffix}`}>Semester</FormLabel>
          <input
            id={`semester-name-${suffix}`}
            name="semesterName"
            defaultValue={semester?.semester_name ?? ""}
            className={inputClass}
            placeholder="Semester 1"
            required
          />
          <FieldError state={state} field="semesterName" />
        </div>
        <div>
          <FormLabel htmlFor={`semester-year-${suffix}`}>Academic year</FormLabel>
          <input
            id={`semester-year-${suffix}`}
            name="academicYear"
            defaultValue={semester?.academic_year ?? ""}
            className={inputClass}
            placeholder="2025–2026"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FormLabel htmlFor={`semester-gpa-${suffix}`}>GPA (out of 4.00)</FormLabel>
          <input
            id={`semester-gpa-${suffix}`}
            name="gpa"
            type="number"
            min="0"
            max="4"
            step="0.01"
            defaultValue={semester?.gpa ?? ""}
            className={inputClass}
            placeholder="3.75"
            required
          />
          <FieldError state={state} field="gpa" />
        </div>
        <div>
          <FormLabel htmlFor={`semester-credits-${suffix}`}>Completed credits</FormLabel>
          <input
            id={`semester-credits-${suffix}`}
            name="totalCredits"
            type="number"
            min="0"
            max="300"
            step="0.5"
            defaultValue={semester?.total_credits ?? 0}
            className={inputClass}
          />
          <FieldError state={state} field="totalCredits" />
        </div>
        <div>
          <FormLabel htmlFor={`semester-order-${suffix}`}>Display order</FormLabel>
          <input
            id={`semester-order-${suffix}`}
            name="sortOrder"
            type="number"
            min="0"
            max="1000"
            step="1"
            defaultValue={semester?.sort_order ?? defaultOrder}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <FormLabel htmlFor={`semester-notes-${suffix}`}>Notes</FormLabel>
        <textarea
          id={`semester-notes-${suffix}`}
          name="notes"
          defaultValue={semester?.notes ?? ""}
          className={`${inputClass} min-h-20 py-3`}
          placeholder="Optional academic notes"
        />
      </div>
    </div>
  );
}

function AddSemesterForm({ nextOrder }: { nextOrder: number }) {
  const [state, action, pending] = useActionState(
    createSemesterAction,
    initialActionState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5" /> Add semester GPA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <ActionMessage state={state} />
          <SemesterFields state={state} defaultOrder={nextOrder} />
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add semester"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EditSemesterForm({ semester }: { semester: Semester }) {
  const [state, action, pending] = useActionState(
    updateSemesterAction,
    initialActionState,
  );
  return (
    <details className="mt-4 rounded-2xl bg-surface-container-low p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        <Pencil className="size-4" /> Edit semester
      </summary>
      <form action={action} className="mt-4 space-y-5">
        <input type="hidden" name="id" value={semester.id} />
        <ActionMessage state={state} />
        <SemesterFields
          state={state}
          semester={semester}
          defaultOrder={semester.sort_order}
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}

export function AcademicManager({ semesters }: { semesters: Semester[] }) {
  const sorted = useMemo(
    () =>
      [...semesters].sort(
        (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
      ),
    [semesters],
  );

  const totalCredits = sorted.reduce(
    (sum, semester) => sum + Number(semester.total_credits),
    0,
  );
  const weightedPoints = sorted.reduce(
    (sum, semester) =>
      sum + Number(semester.gpa) * Number(semester.total_credits),
    0,
  );
  const cgpa =
    sorted.length === 0
      ? 0
      : totalCredits > 0
        ? weightedPoints / totalCredits
        : sorted.reduce((sum, semester) => sum + Number(semester.gpa), 0) /
          sorted.length;

  const bestSemester = sorted.reduce<Semester | null>(
    (best, semester) =>
      !best || Number(semester.gpa) > Number(best.gpa) ? semester : best,
    null,
  );

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Overall CGPA"
          value={sorted.length ? cgpa.toFixed(2) : "—"}
          note={
            totalCredits > 0
              ? "Credit-weighted across all semesters"
              : "Average of semester GPAs"
          }
          icon={Award}
          tone="secondary"
        />
        <StatCard
          label="Semesters"
          value={String(sorted.length)}
          note="Saved semester results"
          icon={BarChart3}
          tone="tertiary"
        />
        <StatCard
          label="Completed credits"
          value={totalCredits.toFixed(totalCredits % 1 === 0 ? 0 : 1)}
          note={bestSemester ? `Best GPA: ${Number(bestSemester.gpa).toFixed(2)}` : "Add your first result"}
          icon={Award}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <AddSemesterForm nextOrder={sorted.length + 1} />

        <div className="space-y-4">
          {sorted.length === 0 ? (
            <Card className="p-10 text-center">
              <Award className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-3 font-semibold">No semester GPA added</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add each semester GPA to calculate your overall CGPA.
              </p>
            </Card>
          ) : (
            sorted.map((semester, index) => (
              <Card key={semester.id} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-fixed text-lg font-bold text-on-primary-fixed">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{semester.semester_name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {semester.academic_year || "Academic year not specified"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-sm">GPA {Number(semester.gpa).toFixed(2)}</Badge>
                        <form
                          action={deleteSemesterAction}
                          onSubmit={(event) => {
                            if (
                              !window.confirm(
                                `Delete “${semester.semester_name}”?`,
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={semester.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label={`Delete ${semester.semester_name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge>{Number(semester.total_credits).toFixed(semester.total_credits % 1 === 0 ? 0 : 1)} credits</Badge>
                      {totalCredits > 0 ? (
                        <Badge>
                          {((Number(semester.total_credits) / totalCredits) * 100).toFixed(1)}% CGPA weight
                        </Badge>
                      ) : null}
                    </div>
                    {semester.notes ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {semester.notes}
                      </p>
                    ) : null}
                    <EditSemesterForm semester={semester} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
