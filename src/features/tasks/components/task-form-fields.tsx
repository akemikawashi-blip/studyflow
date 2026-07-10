import type { Database } from "@/types/database.generated";
import type { ActionState } from "@/lib/forms/action-state";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

const inputClass =
  "focus-ring min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-foreground";

function FieldError({
  state,
  field,
}: {
  state: ActionState;
  field: string;
}) {
  const error = state.fieldErrors?.[field]?.[0];

  return error ? (
    <p className="mt-1 text-xs text-destructive">{error}</p>
  ) : null;
}

export function TaskFormFields({
  state,
  task,
}: {
  state: ActionState;
  task?: TaskRow;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor={task ? `title-${task.id}` : "new-task-title"} className="mb-1.5 block text-sm font-medium">
          Title
        </label>
        <input
          id={task ? `title-${task.id}` : "new-task-title"}
          name="title"
          defaultValue={task?.title ?? ""}
          className={inputClass}
          placeholder="What needs to be done?"
          maxLength={160}
          required
        />
        <FieldError state={state} field="title" />
      </div>

      <div>
        <label htmlFor={task ? `description-${task.id}` : "new-task-description"} className="mb-1.5 block text-sm font-medium">
          Description
        </label>
        <textarea
          id={task ? `description-${task.id}` : "new-task-description"}
          name="description"
          defaultValue={task?.description ?? ""}
          className={`${inputClass} min-h-24 resize-y py-3`}
          placeholder="Optional details"
          maxLength={2000}
        />
        <FieldError state={state} field="description" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={task ? `category-${task.id}` : "new-task-category"} className="mb-1.5 block text-sm font-medium">
            Category
          </label>
          <select
            id={task ? `category-${task.id}` : "new-task-category"}
            name="category"
            defaultValue={task?.category ?? "study"}
            className={inputClass}
          >
            <option value="study">Study</option>
            <option value="assignment">Assignment</option>
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="health">Health</option>
            <option value="finance">Finance</option>
            <option value="other">Other</option>
          </select>
          <FieldError state={state} field="category" />
        </div>

        <div>
          <label htmlFor={task ? `priority-${task.id}` : "new-task-priority"} className="mb-1.5 block text-sm font-medium">
            Priority
          </label>
          <select
            id={task ? `priority-${task.id}` : "new-task-priority"}
            name="priority"
            defaultValue={task?.priority ?? "medium"}
            className={inputClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <FieldError state={state} field="priority" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={task ? `due-date-${task.id}` : "new-task-due-date"} className="mb-1.5 block text-sm font-medium">
            Due date
          </label>
          <input
            id={task ? `due-date-${task.id}` : "new-task-due-date"}
            name="dueDate"
            type="date"
            defaultValue={task?.due_date ?? ""}
            className={inputClass}
          />
          <FieldError state={state} field="dueDate" />
        </div>

        <div>
          <label htmlFor={task ? `due-time-${task.id}` : "new-task-due-time"} className="mb-1.5 block text-sm font-medium">
            Due time
          </label>
          <input
            id={task ? `due-time-${task.id}` : "new-task-due-time"}
            name="dueTime"
            type="time"
            defaultValue={task?.due_time?.slice(0, 5) ?? ""}
            className={inputClass}
          />
          <FieldError state={state} field="dueTime" />
        </div>

        <div>
          <label htmlFor={task ? `minutes-${task.id}` : "new-task-minutes"} className="mb-1.5 block text-sm font-medium">
            Estimated minutes
          </label>
          <input
            id={task ? `minutes-${task.id}` : "new-task-minutes"}
            name="estimatedMinutes"
            type="number"
            min={0}
            max={10080}
            defaultValue={task?.estimated_minutes ?? ""}
            className={inputClass}
            placeholder="60"
          />
          <FieldError state={state} field="estimatedMinutes" />
        </div>
      </div>
    </div>
  );
}
