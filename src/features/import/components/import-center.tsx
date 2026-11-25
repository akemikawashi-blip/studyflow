"use client";

import { AlertTriangle, CalendarRange, Check, FileText, Shapes, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { inputClass } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { EVENT_LABEL } from "@/features/calendar/lib/categories";
import { deleteCalendarSourceAction, importCalendarAction, importCoursesAction, type ImportResult } from "@/features/import/actions/import-actions";
import { parseCalendar, parseCourses } from "@/features/import/lib/parse";
import { UENP_2027_CALENDAR, UENP_2027_SEMESTERS, UENP_2027_SOURCE, UENP_MED_COURSES } from "@/features/import/lib/templates";
import { formatKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Semester = { id: string; semester_name: string; institution: string | null; is_current: boolean };

function Result({ result }: { result: ImportResult | null }) {
  if (!result) return null;
  return (
    <p role={result.status === "error" ? "alert" : "status"} className={cn("rounded-lg px-4 py-3 text-sm", result.status === "error" ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container")}>
      {result.message}
    </p>
  );
}

function Errors({ errors }: { errors: { line: number; message: string }[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="rounded-lg border border-destructive/30 bg-error-container/40 p-3 text-sm text-on-error-container">
      {errors.map((error) => <li key={error.line} className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Linha {error.line}: {error.message}</li>)}
    </ul>
  );
}

const range = (start: string, end: string) =>
  start === end ? formatKey(start, { day: "2-digit", month: "short" }) : `${formatKey(start, { day: "2-digit", month: "short" })} – ${formatKey(end, { day: "2-digit", month: "short" })}`;

function CalendarImporter({ sources, defaultInstitution }: { sources: { source: string; count: number }[]; defaultInstitution: string }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [withSemesters, setWithSemesters] = useState(false);
  const [semesters, setSemesters] = useState<typeof UENP_2027_SEMESTERS>([]);
  const [institution, setInstitution] = useState(defaultInstitution);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parsed = useMemo(() => parseCalendar(text, /^\d{4}$/.test(year) ? Number(year) : null), [text, year]);
  const selected = parsed.rows.filter((row) => !excluded.has(row.line));

  const loadTemplate = () => {
    setText(UENP_2027_CALENDAR);
    setSource(UENP_2027_SOURCE);
    setYear("2027");
    setInstitution("UENP");
    setSemesters(UENP_2027_SEMESTERS);
    setWithSemesters(true);
    setExcluded(new Set());
    setResult(null);
  };

  const submit = async () => {
    setPending(true);
    setResult(null);
    const outcome = await importCalendarAction({
      source,
      mode,
      rows: selected.map(({ start, end, title, category, description }) => ({ start, end, title, category, description })),
      semesters: withSemesters ? semesters : [],
      institution,
    });
    setPending(false);
    setResult(outcome);
  };

  const remove = async (label: string, count: number) => {
    if (!window.confirm(`Remover os ${count} itens de “${label}” do calendário? Compromissos criados por você não são afetados.`)) return;
    setResult(await deleteCalendarSourceAction(label));
  };

  return (
    <section className="rounded-xl border border-outline-variant/70 bg-card p-5 shadow-card" aria-labelledby="calendar-import-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Calendário institucional</p>
          <h2 id="calendar-import-title" className="font-display text-2xl font-semibold">Importar calendário acadêmico</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Uma linha por item: <code className="rounded bg-surface-container px-1">DATA ou DATA a DATA | título | categoria | observação</code>. Categorias: feriado, prova, prazo, aula, evento, seminário, reunião…</p>
        </div>
        <Button variant="outline" onClick={loadTemplate}><FileText className="size-4" /> Carregar UENP 2027</Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_1fr]">
        <div>
          <label htmlFor="import-source" className="mb-1 block text-sm font-medium">Nome do conjunto</label>
          <input id="import-source" value={source} onChange={(event) => setSource(event.target.value)} maxLength={80} placeholder="Ex.: UENP 2027" className={inputClass} />
        </div>
        <div>
          <label htmlFor="import-year" className="mb-1 block text-sm font-medium">Ano padrão</label>
          <input id="import-year" value={year} onChange={(event) => setYear(event.target.value)} inputMode="numeric" maxLength={4} className={inputClass} />
        </div>
        <div>
          <label htmlFor="import-institution" className="mb-1 block text-sm font-medium">Instituição</label>
          <input id="import-institution" value={institution} onChange={(event) => setInstitution(event.target.value)} maxLength={160} className={inputClass} />
        </div>
      </div>
      <label htmlFor="import-calendar-text" className="mb-1 mt-3 block text-sm font-medium">Itens</label>
      <textarea id="import-calendar-text" value={text} onChange={(event) => { setText(event.target.value); setResult(null); }} rows={10} spellCheck={false} className={`${inputClass} py-2 font-mono text-xs leading-5`} placeholder={"01/03/2027 | Início das aulas | aula\n05/07/2027 a 24/07/2027 | Recesso acadêmico | recesso"} />

      <div className="mt-3 flex flex-col gap-3">
        <Errors errors={parsed.errors} />
        {parsed.rows.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-outline-variant/70">
            <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 text-xs font-semibold">
              <span>Prévia — {selected.length} de {parsed.rows.length} selecionados</span>
              <button type="button" className="text-primary underline" onClick={() => setExcluded(excluded.size ? new Set() : new Set(parsed.rows.map((row) => row.line)))}>{excluded.size ? "Selecionar todos" : "Desmarcar todos"}</button>
            </div>
            <ul className="max-h-80 divide-y divide-outline-variant/50 overflow-y-auto text-sm">
              {parsed.rows.map((row) => (
                <li key={row.line}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-surface-container-low">
                    <input type="checkbox" checked={!excluded.has(row.line)} onChange={() => setExcluded((current) => { const next = new Set(current); if (next.has(row.line)) next.delete(row.line); else next.add(row.line); return next; })} className="mt-1 size-4 accent-[var(--primary)]" />
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">{range(row.start, row.end)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{row.title}</span>
                      <span className="ml-2 text-xs text-gold">{EVENT_LABEL[row.category]}</span>
                      {row.description ? <span className="block text-xs text-muted-foreground">{row.description}</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {semesters.length > 0 ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={withSemesters} onChange={(event) => setWithSemesters(event.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>Criar também os semestres {semesters.map((semester) => `${semester.name} (${range(semester.start, semester.end)})`).join(" e ")}{institution ? ` — ${institution}` : ""}. Semestres que já existem com o mesmo nome e instituição não são duplicados.</span>
          </label>
        ) : null}

        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="sr-only">Se o conjunto já existir</legend>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === "add"} onChange={() => setMode("add")} className="accent-[var(--primary)]" /> Importar (avisa se já existir)</label>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} className="accent-[var(--primary)]" /> Substituir importação anterior com o mesmo nome</label>
        </fieldset>

        <Result result={result} />
        <div>
          <Button onClick={() => void submit()} disabled={pending || selected.length === 0 || !source.trim()}>
            <CalendarRange className="size-4" /> {pending ? "Importando…" : `Importar ${selected.length} ${selected.length === 1 ? "item" : "itens"}`}
          </Button>
        </div>
      </div>

      {sources.length > 0 ? (
        <div className="mt-6 border-t border-outline-variant/70 pt-4">
          <h3 className="text-sm font-semibold">Calendários importados</h3>
          <p className="mb-2 text-xs text-muted-foreground">Em caso de transferência, você pode remover o calendário da instituição anterior de uma vez.</p>
          <ul className="flex flex-col gap-1.5">
            {sources.map((item) => (
              <li key={item.source} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                <span><span className="font-medium">{item.source}</span> <span className="text-muted-foreground">· {item.count} itens</span></span>
                <button type="button" onClick={() => void remove(item.source, item.count)} className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-error-container/60" aria-label={`Remover ${item.source}`}>
                  <Trash2 className="size-3.5" /> Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function CoursesImporter({ semesters }: { semesters: Semester[] }) {
  const [text, setText] = useState("");
  const [semesterId, setSemesterId] = useState(semesters.find((semester) => semester.is_current)?.id ?? "");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const parsed = useMemo(() => parseCourses(text), [text]);
  const selected = parsed.rows.filter((row) => !excluded.has(row.line));

  const submit = async () => {
    setPending(true);
    setResult(null);
    const outcome = await importCoursesAction({ semesterId: semesterId || null, rows: selected.map(({ code, name, hours }) => ({ code, name, hours })) });
    setPending(false);
    setResult(outcome);
  };

  return (
    <section className="rounded-xl border border-outline-variant/70 bg-card p-5 shadow-card" aria-labelledby="courses-import-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Matriz curricular</p>
          <h2 id="courses-import-title" className="font-display text-2xl font-semibold">Importar disciplinas</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Uma linha por disciplina: <code className="rounded bg-surface-container px-1">CÓDIGO | nome | carga horária</code>. O código e a carga horária são opcionais.</p>
        </div>
        <Button variant="outline" onClick={() => { setText(UENP_MED_COURSES); setExcluded(new Set()); setResult(null); }}><FileText className="size-4" /> Carregar disciplinas da imagem</Button>
      </div>
      <div className="mt-4 max-w-sm">
        <label htmlFor="import-semester" className="mb-1 block text-sm font-medium">Semestre de destino</label>
        <select id="import-semester" value={semesterId} onChange={(event) => setSemesterId(event.target.value)} className={inputClass}>
          <option value="">Sem semestre</option>
          {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.semester_name}{semester.institution ? ` — ${semester.institution}` : ""}{semester.is_current ? " (atual)" : ""}</option>)}
        </select>
      </div>
      <label htmlFor="import-courses-text" className="mb-1 mt-3 block text-sm font-medium">Disciplinas</label>
      <textarea id="import-courses-text" value={text} onChange={(event) => { setText(event.target.value); setResult(null); }} rows={8} spellCheck={false} className={`${inputClass} py-2 font-mono text-xs leading-5`} placeholder={"MED_010 | Bioquímica II | 72"} />
      <div className="mt-3 flex flex-col gap-3">
        <Errors errors={parsed.errors} />
        {parsed.rows.length > 0 ? (
          <ul className="max-h-72 divide-y divide-outline-variant/50 overflow-y-auto rounded-lg border border-outline-variant/70 text-sm">
            {parsed.rows.map((row) => (
              <li key={row.line}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-container-low">
                  <input type="checkbox" checked={!excluded.has(row.line)} onChange={() => setExcluded((current) => { const next = new Set(current); if (next.has(row.line)) next.delete(row.line); else next.add(row.line); return next; })} className="size-4 accent-[var(--primary)]" />
                  <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{row.code ?? "—"}</span>
                  <span className="min-w-0 flex-1 font-medium">{row.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{row.hours !== null ? `${row.hours} h` : ""}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        <Result result={result} />
        <div>
          <Button onClick={() => void submit()} disabled={pending || selected.length === 0}>
            <Shapes className="size-4" /> {pending ? "Importando…" : `Importar ${selected.length} ${selected.length === 1 ? "disciplina" : "disciplinas"}`}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ImportCenter({ semesters, sources, defaultInstitution }: { semesters: Semester[]; sources: { source: string; count: number }[]; defaultInstitution: string }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
        <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
        Nada é salvo até você clicar em importar. Revise a prévia, desmarque o que não quiser e corrija o texto à vontade — os modelos foram transcritos dos documentos que você enviou.
      </p>
      <CalendarImporter sources={sources} defaultInstitution={defaultInstitution} />
      <CoursesImporter semesters={semesters} />
    </div>
  );
}
