import type { Database } from "@/types/database.generated";

export type EventType = Database["public"]["Enums"]["calendar_event_type"];

/** Categories offered when creating an event, in display order. */
export const EVENT_CATEGORIES: { value: EventType; label: string }[] = [
  { value: "class", label: "Aula" },
  { value: "exam", label: "Prova" },
  { value: "seminar", label: "Seminário" },
  { value: "assignment", label: "Trabalho" },
  { value: "deadline", label: "Entrega / prazo" },
  { value: "presentation", label: "Apresentação" },
  { value: "meeting", label: "Reunião" },
  { value: "university_event", label: "Evento universitário" },
  { value: "project_deadline", label: "Prazo de projeto" },
  { value: "extracurricular", label: "Atividade extracurricular" },
  { value: "study_session", label: "Sessão de estudo" },
  { value: "personal_event", label: "Pessoal" },
  { value: "task", label: "Tarefa" },
];

export const EVENT_LABEL = Object.fromEntries(EVENT_CATEGORIES.map((item) => [item.value, item.label])) as Record<EventType, string>;

/** Discreet tones: each maps to a dot color and a soft chip. */
export type Tone = "navy" | "wine" | "gold" | "sage" | "slate" | "plum" | "teal";
export const EVENT_TONE: Record<EventType, Tone> = {
  class: "navy",
  exam: "wine",
  seminar: "plum",
  assignment: "gold",
  deadline: "gold",
  presentation: "plum",
  meeting: "teal",
  university_event: "teal",
  project_deadline: "gold",
  extracurricular: "sage",
  study_session: "sage",
  personal_event: "slate",
  task: "slate",
};

export const TONE_CLASSES: Record<Tone, { dot: string; chip: string }> = {
  navy: { dot: "bg-[#1c2b45] dark:bg-[#b9c6dd]", chip: "border-l-[#1c2b45] bg-primary-fixed/70 text-on-primary-fixed dark:border-l-[#b9c6dd]" },
  wine: { dot: "bg-destructive", chip: "border-l-destructive bg-error-container/70 text-on-error-container" },
  gold: { dot: "bg-gold", chip: "border-l-gold bg-tertiary-container/70 text-on-tertiary-container" },
  sage: { dot: "bg-secondary", chip: "border-l-secondary bg-secondary-container/70 text-on-secondary-container" },
  slate: { dot: "bg-outline", chip: "border-l-outline bg-surface-container-high text-on-surface-variant" },
  plum: { dot: "bg-[#6b5b95]", chip: "border-l-[#6b5b95] bg-[#6b5b95]/12 text-foreground" },
  teal: { dot: "bg-[#3f6f86]", chip: "border-l-[#3f6f86] bg-[#3f6f86]/12 text-foreground" },
};
