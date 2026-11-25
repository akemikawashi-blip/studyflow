"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { inputClass } from "@/components/forms/form-parts";
import { VIEW_LABELS, type NotebookFilterValues, type NotebookView } from "@/features/notes/lib/notebook-views";

export function NotebookFilters({
  values,
  courses,
  professors,
  tags,
}: {
  values: NotebookFilterValues;
  courses: { id: string; course_name: string }[];
  professors: string[];
  tags: string[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();
  const active = values.q || values.course || values.professor || values.tag || values.from || values.to || values.fav;

  return (
    <form ref={form} method="get" className="flex flex-col gap-3" role="search">
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">Buscar no caderno</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={values.q} placeholder="Buscar em todo o texto das anotações — ex.: artéria renal" className={`${inputClass} pl-10`} />
        </label>
        <select name="view" defaultValue={values.view} onChange={submit} className={`${inputClass} md:w-52`} aria-label="Organizar">
          {(Object.keys(VIEW_LABELS) as NotebookView[]).map((view) => (
            <option key={view} value={view}>{VIEW_LABELS[view]}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select name="course" defaultValue={values.course} onChange={submit} className={inputClass} aria-label="Disciplina">
          <option value="">Todas as disciplinas</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>)}
        </select>
        <select name="professor" defaultValue={values.professor} onChange={submit} className={inputClass} aria-label="Professor">
          <option value="">Todos os professores</option>
          {professors.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select name="tag" defaultValue={values.tag} onChange={submit} className={inputClass} aria-label="Palavra-chave">
          <option value="">Todas as palavras-chave</option>
          {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <label className="flex flex-col">
          <span className="sr-only">De</span>
          <input type="date" name="from" defaultValue={values.from} onChange={submit} className={inputClass} aria-label="Data inicial" />
        </label>
        <label className="flex flex-col">
          <span className="sr-only">Até</span>
          <input type="date" name="to" defaultValue={values.to} onChange={submit} className={inputClass} aria-label="Data final" />
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm">
          <input type="checkbox" name="fav" value="1" defaultChecked={values.fav} onChange={submit} className="size-4 accent-[var(--primary)]" />
          Favoritas
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="focus-ring min-h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Aplicar</button>
        {active ? (
          <Link href={`/app/notes?view=${values.view}`} className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
            <X className="size-4" /> Limpar filtros
          </Link>
        ) : null}
      </div>
    </form>
  );
}
