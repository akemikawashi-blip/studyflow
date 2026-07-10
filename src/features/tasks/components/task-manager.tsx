"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock3, Pencil, Plus, Trash2, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createTaskAction,
  deleteTaskAction,
  toggleTaskAction,
  updateTaskAction,
} from "@/features/tasks/actions/task-actions";
import { TaskFormFields } from "@/features/tasks/components/task-form-fields";
import { initialActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type Filter = "all" | "open" | "completed";

const priorityClasses: Record<TaskRow["priority"], string> = {
  urgent: "bg-error-container text-on-error-container",
  high: "bg-error-container text-on-error-container",
  medium: "bg-tertiary-container text-on-tertiary-container",
  low: "bg-primary-fixed text-on-primary-fixed",
};

const accentClasses: Record<TaskRow["priority"], string> = {
  urgent: "bg-destructive",
  high: "bg-destructive",
  medium: "bg-[#fabd00]",
  low: "bg-primary",
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function CreateTaskForm() {
  const [state, action, pending] = useActionState(
    createTaskAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <details className="surface-panel rounded-card p-5" open>
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl font-semibold">
        <span className="inline-flex items-center gap-2">
          <Plus className="size-5 text-primary" aria-hidden="true" />
          Add a new task
        </span>
        <span className="text-xs text-muted-foreground">Persistent</span>
      </summary>
      <form ref={formRef} action={action} className="mt-5 space-y-5">
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={cn(
              "rounded-xl px-4 py-3 text-sm",
              state.status === "error"
                ? "bg-error-container text-on-error-container"
                : "bg-secondary-container/45 text-on-secondary-container",
            )}
          >
            {state.message}
          </p>
        ) : null}
        <TaskFormFields state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding task…" : "Add task"}
        </Button>
      </form>
    </details>
  );
}

function EditTaskForm({ task }: { task: TaskRow }) {
  const [state, action, pending] = useActionState(
    updateTaskAction,
    initialActionState,
  );

  return (
    <details className="mt-4 rounded-2xl border border-outline-variant/55 bg-background p-4">
      <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-primary">
        <Pencil className="size-4" aria-hidden="true" />
        Edit task
      </summary>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={task.id} />
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={cn(
              "rounded-xl px-3 py-2 text-sm",
              state.status === "error"
                ? "bg-error-container text-on-error-container"
                : "bg-secondary-container/45 text-on-secondary-container",
            )}
          >
            {state.message}
          </p>
        ) : null}
        <TaskFormFields state={state} task={task} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}

export function TaskManager({ tasks }: { tasks: TaskRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filteredTasks = useMemo(() => {
    if (filter === "completed") {
      return tasks.filter((task) => task.status === "completed");
    }
    if (filter === "open") {
      return tasks.filter((task) => task.status !== "completed");
    }
    return tasks;
  }, [filter, tasks]);

  return (
    <div>
      <CreateTaskForm />

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Task status filters">
        {(["all", "open", "completed"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "focus-ring min-h-11 shrink-0 rounded-full border px-5 text-sm font-semibold transition-colors",
              filter === item
                ? "border-primary bg-primary text-primary-foreground"
                : "border-outline-variant bg-background text-foreground hover:border-primary",
            )}
            onClick={() => setFilter(item)}
            aria-pressed={filter === item}
          >
            {formatLabel(item)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {filteredTasks.map((task) => (
          <article
            key={task.id}
            className="relative overflow-hidden rounded-card border border-outline-variant/55 bg-surface-container-low p-5 pl-7 shadow-card"
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-1.5",
                accentClasses[task.priority],
              )}
              aria-hidden="true"
            />
            <div className="flex items-start gap-4">
              <form action={toggleTaskAction}>
                <input type="hidden" name="id" value={task.id} />
                <button
                  type="submit"
                  className={cn(
                    "focus-ring mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border-2 text-sm font-bold transition-colors",
                    task.status === "completed"
                      ? "border-secondary bg-secondary text-secondary-foreground"
                      : "border-outline bg-background",
                  )}
                  aria-label={
                    task.status === "completed"
                      ? `Reopen ${task.title}`
                      : `Complete ${task.title}`
                  }
                >
                  {task.status === "completed" ? (
                    <Check className="size-5" aria-hidden="true" />
                  ) : null}
                </button>
              </form>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2
                      className={cn(
                        "text-lg font-semibold sm:text-xl",
                        task.status === "completed" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </h2>
                    {task.description ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {task.description}
                      </p>
                    ) : null}
                  </div>

                  <form
                    action={deleteTaskAction}
                    onSubmit={(event) => {
                      if (!window.confirm(`Delete “${task.title}”?`)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={task.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="size-10 min-h-10 text-destructive"
                      aria-label={`Delete ${task.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </form>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className={priorityClasses[task.priority]}>
                    {formatLabel(task.priority)}
                  </Badge>
                  <Badge className="border border-outline-variant bg-background">
                    {formatLabel(task.category)}
                  </Badge>
                  {task.due_date ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-4" aria-hidden="true" />
                      {task.due_date}
                    </span>
                  ) : null}
                  {task.due_time ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {task.due_time.slice(0, 5)}
                    </span>
                  ) : null}
                  {task.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary">
                      <Check className="size-4" aria-hidden="true" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Undo2 className="size-4" aria-hidden="true" />
                      Open
                    </span>
                  )}
                </div>

                <EditTaskForm task={task} />
              </div>
            </div>
          </article>
        ))}

        {filteredTasks.length === 0 ? (
          <div className="rounded-card border border-dashed border-outline-variant p-10 text-center">
            <p className="font-semibold">
              {tasks.length === 0 ? "No tasks yet" : "No tasks in this view"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {tasks.length === 0
                ? "Use the form above to create your first persistent task."
                : "Choose another filter or add a new task."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
