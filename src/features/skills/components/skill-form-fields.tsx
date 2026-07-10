import type { ActionState } from "@/lib/forms/action-state";
import type { Database } from "@/types/database.generated";

type SkillRow = Database["public"]["Tables"]["skills"]["Row"];

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

export function SkillFormFields({
  state,
  skill,
}: {
  state: ActionState;
  skill?: SkillRow;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={skill ? `skill-title-${skill.id}` : "new-skill-title"}
            className="mb-1.5 block text-sm font-medium"
          >
            Skill title
          </label>
          <input
            id={skill ? `skill-title-${skill.id}` : "new-skill-title"}
            name="title"
            defaultValue={skill?.title ?? ""}
            className={inputClass}
            placeholder="React, public speaking…"
            maxLength={120}
            required
          />
          <FieldError state={state} field="title" />
        </div>

        <div>
          <label
            htmlFor={skill ? `skill-category-${skill.id}` : "new-skill-category"}
            className="mb-1.5 block text-sm font-medium"
          >
            Category
          </label>
          <input
            id={skill ? `skill-category-${skill.id}` : "new-skill-category"}
            name="category"
            defaultValue={skill?.category ?? ""}
            className={inputClass}
            placeholder="Development, communication…"
            maxLength={80}
          />
          <FieldError state={state} field="category" />
        </div>
      </div>

      <div>
        <label
          htmlFor={skill ? `skill-description-${skill.id}` : "new-skill-description"}
          className="mb-1.5 block text-sm font-medium"
        >
          Description
        </label>
        <textarea
          id={skill ? `skill-description-${skill.id}` : "new-skill-description"}
          name="description"
          defaultValue={skill?.description ?? ""}
          className={`${inputClass} min-h-20 resize-y py-3`}
          placeholder="What do you want to learn?"
          maxLength={2000}
        />
        <FieldError state={state} field="description" />
      </div>

      <div>
        <label
          htmlFor={skill ? `skill-motivation-${skill.id}` : "new-skill-motivation"}
          className="mb-1.5 block text-sm font-medium"
        >
          Motivation
        </label>
        <textarea
          id={skill ? `skill-motivation-${skill.id}` : "new-skill-motivation"}
          name="motivation"
          defaultValue={skill?.motivation ?? ""}
          className={`${inputClass} min-h-20 resize-y py-3`}
          placeholder="Why does this skill matter to you?"
          maxLength={1000}
        />
        <FieldError state={state} field="motivation" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor={skill ? `skill-current-${skill.id}` : "new-skill-current"}
            className="mb-1.5 block text-sm font-medium"
          >
            Current level
          </label>
          <select
            id={skill ? `skill-current-${skill.id}` : "new-skill-current"}
            name="currentLevel"
            defaultValue={skill?.current_level ?? "beginner"}
            className={inputClass}
          >
            <option value="beginner">Beginner</option>
            <option value="elementary">Elementary</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <FieldError state={state} field="currentLevel" />
        </div>

        <div>
          <label
            htmlFor={skill ? `skill-target-${skill.id}` : "new-skill-target"}
            className="mb-1.5 block text-sm font-medium"
          >
            Target level
          </label>
          <select
            id={skill ? `skill-target-${skill.id}` : "new-skill-target"}
            name="targetLevel"
            defaultValue={skill?.target_level ?? "intermediate"}
            className={inputClass}
          >
            <option value="beginner">Beginner</option>
            <option value="elementary">Elementary</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <FieldError state={state} field="targetLevel" />
        </div>

        <div>
          <label
            htmlFor={skill ? `skill-status-${skill.id}` : "new-skill-status"}
            className="mb-1.5 block text-sm font-medium"
          >
            Status
          </label>
          <select
            id={skill ? `skill-status-${skill.id}` : "new-skill-status"}
            name="status"
            defaultValue={skill?.status ?? "planned"}
            className={inputClass}
          >
            <option value="planned">Planned</option>
            <option value="learning">Learning</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          <FieldError state={state} field="status" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor={skill ? `skill-date-${skill.id}` : "new-skill-date"}
            className="mb-1.5 block text-sm font-medium"
          >
            Target date
          </label>
          <input
            id={skill ? `skill-date-${skill.id}` : "new-skill-date"}
            name="targetDate"
            type="date"
            defaultValue={skill?.target_date ?? ""}
            className={inputClass}
          />
          <FieldError state={state} field="targetDate" />
        </div>

        <div>
          <label
            htmlFor={skill ? `skill-minutes-${skill.id}` : "new-skill-minutes"}
            className="mb-1.5 block text-sm font-medium"
          >
            Weekly minutes
          </label>
          <input
            id={skill ? `skill-minutes-${skill.id}` : "new-skill-minutes"}
            name="weeklyTargetMinutes"
            type="number"
            min={0}
            max={10080}
            defaultValue={skill?.weekly_target_minutes ?? 0}
            className={inputClass}
          />
          <FieldError state={state} field="weeklyTargetMinutes" />
        </div>

        <div>
          <label
            htmlFor={skill ? `skill-action-${skill.id}` : "new-skill-action"}
            className="mb-1.5 block text-sm font-medium"
          >
            Next action
          </label>
          <input
            id={skill ? `skill-action-${skill.id}` : "new-skill-action"}
            name="nextAction"
            defaultValue={skill?.next_action ?? ""}
            className={inputClass}
            placeholder="Build a small project"
            maxLength={300}
          />
          <FieldError state={state} field="nextAction" />
        </div>
      </div>
    </div>
  );
}
