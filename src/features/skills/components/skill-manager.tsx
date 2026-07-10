"use client";

import {
  BookOpenCheck,
  Code2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createSkillAction,
  deleteSkillAction,
  updateSkillAction,
} from "@/features/skills/actions/skill-actions";
import { SkillFormFields } from "@/features/skills/components/skill-form-fields";
import { initialActionState } from "@/lib/forms/action-state";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type SkillRow = Database["public"]["Tables"]["skills"]["Row"];
type Filter = "all" | SkillRow["status"];

function label(value: string) {
  return value
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function CreateSkillForm() {
  const [state, action, pending] = useActionState(
    createSkillAction,
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
          Add a new skill
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
        <SkillFormFields state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding skill…" : "Add skill"}
        </Button>
      </form>
    </details>
  );
}

function EditSkillForm({ skill }: { skill: SkillRow }) {
  const [state, action, pending] = useActionState(
    updateSkillAction,
    initialActionState,
  );

  return (
    <details className="mt-5 rounded-2xl border border-outline-variant/55 bg-background p-4">
      <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-primary">
        <Pencil className="size-4" aria-hidden="true" />
        Edit skill
      </summary>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="id" value={skill.id} />
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
        <SkillFormFields state={state} skill={skill} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </details>
  );
}

export function SkillManager({ skills }: { skills: SkillRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const filteredSkills = useMemo(
    () =>
      filter === "all"
        ? skills
        : skills.filter((skill) => skill.status === filter),
    [filter, skills],
  );

  return (
    <div>
      <CreateSkillForm />

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Skill filters">
        {(["all", "planned", "learning", "paused", "completed"] as const).map(
          (item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "focus-ring min-h-11 shrink-0 rounded-full border px-5 text-sm font-semibold",
                filter === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-outline-variant bg-background hover:border-primary",
              )}
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
            >
              {label(item)}
            </button>
          ),
        )}
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredSkills.map((skill) => (
          <article
            key={skill.id}
            className="surface-panel rounded-card p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
                {skill.category?.toLowerCase().includes("development") ? (
                  <Code2 className="size-6" aria-hidden="true" />
                ) : (
                  <BookOpenCheck className="size-6" aria-hidden="true" />
                )}
              </span>
              <div className="flex items-center gap-2">
                <Badge>{skill.category || "General"}</Badge>
                <form
                  action={deleteSkillAction}
                  onSubmit={(event) => {
                    if (!window.confirm(`Delete “${skill.title}”?`)) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="id" value={skill.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="size-9 min-h-9 text-destructive"
                    aria-label={`Delete ${skill.title}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </form>
              </div>
            </div>

            <h2 className="mt-5 text-xl font-semibold">{skill.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {label(skill.current_level)} → {label(skill.target_level)}
            </p>
            {skill.description ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {skill.description}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="font-semibold text-primary">
                {Math.round(skill.progress_percentage)}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-highest">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, skill.progress_percentage),
                  )}%`,
                }}
              />
            </div>

            <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                <Sparkles className="size-4" aria-hidden="true" />
                Next action
              </p>
              <p className="mt-2 text-sm font-medium">
                {skill.next_action || "Add a next action"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge className="bg-secondary-container/45 text-on-secondary-container">
                {label(skill.status)}
              </Badge>
              <span>{skill.weekly_target_minutes} min/week</span>
              {skill.target_date ? <span>Target {skill.target_date}</span> : null}
            </div>

            <EditSkillForm skill={skill} />
          </article>
        ))}
      </div>

      {filteredSkills.length === 0 ? (
        <div className="mt-4 rounded-card border border-dashed border-outline-variant p-10 text-center">
          <p className="font-semibold">
            {skills.length === 0 ? "No skills yet" : "No skills in this view"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {skills.length === 0
              ? "Use the form above to create your first learning goal."
              : "Choose another filter or add a new skill."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
