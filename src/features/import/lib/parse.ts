import type { EventType } from "@/features/calendar/lib/categories";

export type CalendarRow = { line: number; start: string; end: string; title: string; category: EventType; description: string | null };
export type CourseRow = { line: number; code: string | null; name: string; hours: number | null };
export type ParseError = { line: number; message: string };

const CATEGORY_WORDS: [RegExp, EventType][] = [
  [/^(feriado|recesso|f[eé]rias)/i, "holiday"],
  [/^(prova|exame|avalia)/i, "exam"],
  [/^(prazo|entrega|matr[ií]cula|deadline)/i, "deadline"],
  [/^(semin[aá]rio)/i, "seminar"],
  [/^(apresenta)/i, "presentation"],
  [/^(reuni)/i, "meeting"],
  [/^(aula|in[ií]cio|t[eé]rmino|per[ií]odo letivo)/i, "class"],
  [/^(projeto)/i, "project_deadline"],
  [/^(extracurricular|extens)/i, "extracurricular"],
  [/^(estudo)/i, "study_session"],
  [/^(pessoal)/i, "personal_event"],
  [/^(evento|data comemorativa|comemora)/i, "university_event"],
];

export function categoryFromWord(word: string): EventType | null {
  const value = word.trim();
  if (!value) return null;
  return CATEGORY_WORDS.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

function parseDate(value: string, defaultYear: number | null): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!match) return null;
  const year = match[3] ? Number(match[3]) : defaultYear;
  if (!year) return null;
  const month = Number(match[2]);
  const day = Number(match[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function splitFields(line: string) {
  return line.split(/\s*[|;\t]\s*/).map((field) => field.trim());
}

const meaningful = (line: string) => line.trim() !== "" && !line.trim().startsWith("#");

/**
 * One item per line:  DATA[ a DATA] | Título | categoria | descrição (opcional)
 * Dates: DD/MM/AAAA or DD/MM (uses `defaultYear`). Lines starting with # are ignored.
 */
export function parseCalendar(text: string, defaultYear: number | null): { rows: CalendarRow[]; errors: ParseError[] } {
  const rows: CalendarRow[] = [];
  const errors: ParseError[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    if (!meaningful(raw)) return;
    const [dates = "", title = "", category = "", description = ""] = splitFields(raw);
    const [first, second] = dates.split(/\s*(?:até|a|-|–)\s*/i);
    const start = parseDate(first ?? "", defaultYear);
    const end = second ? parseDate(second, defaultYear) : start;
    if (!start || !end) return errors.push({ line, message: `Data inválida: “${dates}”. Use DD/MM/AAAA ou DD/MM/AAAA a DD/MM/AAAA.` });
    if (end < start) return errors.push({ line, message: "A data final é anterior à inicial." });
    if (!title) return errors.push({ line, message: "Falta o título." });
    if (title.length > 200) return errors.push({ line, message: "Título com mais de 200 caracteres." });
    const mapped = categoryFromWord(category);
    if (!mapped) return errors.push({ line, message: `Categoria não reconhecida: “${category || "(vazia)"}”. Use feriado, prova, prazo, evento, aula, seminário…` });
    rows.push({ line, start, end, title, category: mapped, description: description || null });
  });
  return { rows, errors };
}

/** One course per line:  CÓDIGO | Nome | carga horária (opcional). Code is optional. */
export function parseCourses(text: string): { rows: CourseRow[]; errors: ParseError[] } {
  const rows: CourseRow[] = [];
  const errors: ParseError[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    if (!meaningful(raw)) return;
    const fields = splitFields(raw).filter(Boolean);
    let code: string | null = null;
    let name = "";
    let hoursText = "";
    if (fields.length >= 3) [code, name, hoursText] = fields as [string, string, string];
    else if (fields.length === 2) {
      if (/^\d+([.,]\d+)?$/.test(fields[1])) [name, hoursText] = fields as [string, string];
      else [code, name] = fields as [string, string];
    } else name = fields[0] ?? "";
    if (!name) return errors.push({ line, message: "Falta o nome da disciplina." });
    if (name.length > 160) return errors.push({ line, message: "Nome com mais de 160 caracteres." });
    if (code && code.length > 30) return errors.push({ line, message: "Código com mais de 30 caracteres." });
    const hours = hoursText ? Number(hoursText.replace(",", ".")) : null;
    if (hours !== null && (!Number.isFinite(hours) || hours < 0 || hours > 999)) return errors.push({ line, message: `Carga horária inválida: “${hoursText}”.` });
    rows.push({ line, code, name, hours });
  });
  return { rows, errors };
}
