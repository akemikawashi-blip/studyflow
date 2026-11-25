export type NotebookView = "course" | "date" | "topic" | "professor" | "keyword";

export const VIEW_LABELS: Record<NotebookView, string> = {
  course: "Por disciplina",
  date: "Por data",
  topic: "Por assunto",
  professor: "Por professor",
  keyword: "Por palavra-chave",
};

export function isNotebookView(value: string): value is NotebookView {
  return Object.prototype.hasOwnProperty.call(VIEW_LABELS, value);
}

export type NotebookFilterValues = {
  q: string;
  view: NotebookView;
  course: string;
  professor: string;
  tag: string;
  from: string;
  to: string;
  fav: boolean;
};
