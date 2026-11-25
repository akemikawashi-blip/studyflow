"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, CloudOff, Download, FileText, ImageIcon, Loader2, Paperclip, Pin, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { inputClass } from "@/components/forms/form-parts";
import { deleteMaterialAction } from "@/features/materials/actions/material-actions";
import { FILE_INPUT_ACCEPT, MATERIAL_CATEGORY_LABELS, fileUrl, formatBytes } from "@/features/materials/lib/files";
import { uploadMaterial, type Material } from "@/features/materials/lib/upload";
import { deleteNoteAction, saveNoteAction, toggleNoteFlagAction } from "@/features/notes/actions/note-actions";
import { NoteEditor, type EditorChange } from "@/features/notes/editor/note-editor";
import { parseTags, type SaveNoteInput } from "@/features/notes/schemas/note";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type Note = Database["public"]["Tables"]["notes"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type CourseOption = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "course_code" | "course_name" | "instructor_name" | "color" | "archived">;

type SaveStatus = "saved" | "dirty" | "saving" | "error" | "offline";

const AUTOSAVE_DELAY = 1200;
const RETRY_DELAY = 5000;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Notes created before the rich editor stored plain text. */
function initialHtmlFor(note: Note) {
  if (note.content_format === "html") return note.content;
  if (!note.content.trim()) return "";
  return note.content
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function draftKey(id: string) {
  return `atlas-note-draft:${id}`;
}

type Draft = { html: string; text: string; at: number };

function readDraft(id: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(id: string, draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(draftKey(id), JSON.stringify(draft));
    else window.localStorage.removeItem(draftKey(id));
  } catch {
    // Storage unavailable (private mode, quota): the server save still runs.
  }
}

function StudyField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={hint}
        rows={3}
        className={`${inputClass} min-h-20 resize-y py-2 leading-6`}
      />
    </div>
  );
}

function SaveIndicator({ status, savedAt, message, timeZone }: { status: SaveStatus; savedAt: string; message: string; timeZone: string }) {
  const time = formatDateTime(savedAt, timeZone, { hour: "2-digit", minute: "2-digit" });
  const content = {
    saved: { icon: <Check className="size-3.5" />, text: `Salvo às ${time}`, tone: "text-secondary" },
    dirty: { icon: <span className="size-1.5 rounded-full bg-gold" />, text: "Alterações não salvas", tone: "text-muted-foreground" },
    saving: { icon: <Loader2 className="size-3.5 animate-spin" />, text: "Salvando…", tone: "text-muted-foreground" },
    error: { icon: <AlertCircle className="size-3.5" />, text: message || "Erro ao salvar — tentando de novo", tone: "text-destructive" },
    offline: { icon: <CloudOff className="size-3.5" />, text: "Sem conexão — rascunho guardado neste aparelho", tone: "text-tertiary" },
  }[status];
  return (
    <p role="status" aria-live="polite" className={cn("inline-flex items-center gap-1.5 text-xs font-medium", content.tone)}>
      {content.icon}
      {content.text}
    </p>
  );
}

export function NoteWorkspace({
  note,
  lesson,
  courses,
  initialMaterials,
  todayKey,
  timeZone,
}: {
  note: Note;
  lesson: Lesson | null;
  courses: CourseOption[];
  initialMaterials: Material[];
  todayKey: string;
  timeZone: string;
}) {
  const [title, setTitle] = useState(note.title);
  const [courseId, setCourseId] = useState(note.course_id ?? "");
  const [isLesson, setIsLesson] = useState(Boolean(lesson));
  const [lessonDate, setLessonDate] = useState(lesson?.lesson_date ?? todayKey);
  const [professor, setProfessor] = useState(lesson?.professor ?? "");
  const [topic, setTopic] = useState(lesson?.topic ?? "");
  const [unit, setUnit] = useState(lesson?.unit ?? "");
  const [tagsText, setTagsText] = useState(note.tags.join(", "));
  const [keyPoints, setKeyPoints] = useState(note.key_points ?? "");
  const [memorize, setMemorize] = useState(note.memorize ?? "");
  const [doubts, setDoubts] = useState(note.doubts ?? "");
  const [professorRemarks, setProfessorRemarks] = useState(note.professor_remarks ?? "");
  const [referencesText, setReferencesText] = useState(note.references_text ?? "");
  const [materials, setMaterials] = useState(initialMaterials);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const initialHtml = useMemo(() => initialHtmlFor(note), [note]);
  const [editorHtml, setEditorHtml] = useState(initialHtml);
  const [editorKey, setEditorKey] = useState(0);
  const content = useRef<EditorChange>({ html: initialHtml, text: note.plain_text || note.content });
  const lessonIdRef = useRef<string | null>(note.lesson_id);

  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(note.updated_at);
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [version, setVersion] = useState(0);
  const savedVersion = useRef(0);
  const saving = useRef(false);
  const [recoverable, setRecoverable] = useState<Draft | null>(null);

  const latestVersion = useRef(0);
  const markDirty = useCallback(() => {
    latestVersion.current += 1;
    setVersion(latestVersion.current);
    setStatus("dirty");
  }, []);

  // Offer a local draft that is newer than what the server has.
  useEffect(() => {
    // Deferred: localStorage only exists after hydration.
    const timer = window.setTimeout(() => {
      const draft = readDraft(note.id);
      if (draft && draft.at > new Date(note.updated_at).getTime() && draft.html !== initialHtml) {
        setRecoverable(draft);
      } else if (draft) {
        writeDraft(note.id, null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialHtml, note.id, note.updated_at]);

  const buildPayload = useCallback((): SaveNoteInput => ({
    id: note.id,
    title,
    contentHtml: content.current.html,
    plainText: content.current.text,
    courseId: courseId || null,
    tags: parseTags(tagsText),
    keyPoints,
    memorize,
    doubts,
    professorRemarks,
    referencesText,
    lesson: isLesson ? { lessonDate, professor, topic, unit } : null,
  }), [courseId, doubts, isLesson, keyPoints, lessonDate, memorize, note.id, professor, professorRemarks, referencesText, tagsText, title, topic, unit]);

  const save = useCallback(async () => {
    if (saving.current) return;
    const target = version;
    if (target === savedVersion.current) return;
    if (!title.trim()) {
      setStatus("error");
      setErrorMessage("Dê um título para salvar");
      return;
    }
    if (isLesson && !/^\d{4}-\d{2}-\d{2}$/.test(lessonDate)) {
      setStatus("error");
      setErrorMessage("Informe a data da aula para salvar");
      return;
    }
    saving.current = true;
    setStatus("saving");
    try {
      const result = await saveNoteAction(buildPayload());
      if (result.status === "saved") {
        savedVersion.current = target;
        lessonIdRef.current = result.lessonId;
        setSavedAt(result.savedAt);
        setErrorMessage("");
        if (latestVersion.current === target) writeDraft(note.id, null);
        setStatus((current) => (current === "saving" ? "saved" : current));
      } else {
        setErrorMessage(result.message);
        setStatus("error");
        setAttempt((value) => value + 1);
      }
    } catch {
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      setErrorMessage("");
      setAttempt((value) => value + 1);
    } finally {
      saving.current = false;
    }
  }, [buildPayload, isLesson, lessonDate, note.id, title, version]);

  // Debounced autosave; also retries after an error.
  useEffect(() => {
    if (version === savedVersion.current) return;
    const delay = status === "error" || status === "offline" ? RETRY_DELAY : AUTOSAVE_DELAY;
    const timer = window.setTimeout(() => void save(), delay);
    return () => window.clearTimeout(timer);
  }, [attempt, save, status, version]);

  // A save that finished while newer edits arrived leaves status "saving" → "dirty".
  useEffect(() => {
    if (status === "saved" && version !== savedVersion.current) setStatus("dirty");
  }, [status, version]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") void save();
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (version !== savedVersion.current) {
        event.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", warn);
    };
  }, [save, version]);

  const onEditorChange = useCallback(
    (change: EditorChange) => {
      content.current = change;
      writeDraft(note.id, { ...change, at: Date.now() });
      markDirty();
    },
    [markDirty, note.id],
  );

  const field = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    markDirty();
  };

  const uploadTarget = useCallback(
    (category?: Material["category"]) => ({
      noteId: note.id,
      lessonId: lessonIdRef.current,
      courseId: courseId || null,
      category,
      folder: `notes/${note.id}`,
    }),
    [courseId, note.id],
  );

  const onUploadImage = useCallback(
    async (file: File) => {
      const material = await uploadMaterial(file, uploadTarget("image"));
      setMaterials((current) => [material, ...current]);
      return { src: fileUrl(material.storage_path ?? ""), alt: material.title };
    },
    [uploadTarget],
  );

  const onAttachFile = useCallback(
    async (file: File) => {
      const material = await uploadMaterial(file, uploadTarget());
      setMaterials((current) => [material, ...current]);
      return { href: fileUrl(material.storage_path ?? ""), name: material.file_name ?? material.title };
    },
    [uploadTarget],
  );

  const attachFromPanel = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setNotice("");
    try {
      for (const file of files) {
        const material = await uploadMaterial(file, uploadTarget());
        setMaterials((current) => [material, ...current]);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const removeMaterial = async (material: Material) => {
    if (!window.confirm(`Excluir “${material.title}” definitivamente? O arquivo será apagado do armazenamento. Se ele aparece no texto, o link deixará de funcionar.`)) return;
    const result = await deleteMaterialAction(material.id);
    if (result.status === "ok") setMaterials((current) => current.filter((item) => item.id !== material.id));
    else setNotice(result.message);
  };

  const activeCourses = courses.filter((course) => !course.archived || course.id === courseId);
  const selectedCourse = courses.find((course) => course.id === courseId);

  return (
    <div className="fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/notes" className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Caderno
        </Link>
        <div className="flex items-center gap-1">
          <SaveIndicator status={status} savedAt={savedAt} message={errorMessage} timeZone={timeZone} />
          <form action={toggleNoteFlagAction}>
            <input type="hidden" name="id" value={note.id} />
            <input type="hidden" name="field" value="pinned" />
            <button type="submit" className="focus-ring grid size-9 place-items-center rounded-md hover:bg-surface-container-high" aria-label={note.pinned ? "Desafixar" : "Fixar no topo"} title={note.pinned ? "Desafixar" : "Fixar no topo"}>
              <Pin className={cn("size-4", note.pinned && "fill-current text-gold")} />
            </button>
          </form>
          <form action={toggleNoteFlagAction}>
            <input type="hidden" name="id" value={note.id} />
            <input type="hidden" name="field" value="favorite" />
            <button type="submit" className="focus-ring grid size-9 place-items-center rounded-md hover:bg-surface-container-high" aria-label={note.favorite ? "Remover dos favoritos" : "Favoritar"} title={note.favorite ? "Remover dos favoritos" : "Favoritar"}>
              <Star className={cn("size-4", note.favorite && "fill-current text-gold")} />
            </button>
          </form>
          <form
            action={deleteNoteAction}
            onSubmit={(event) => {
              if (!window.confirm(`Excluir a anotação “${title || note.title}”? Esta ação não pode ser desfeita. Os anexos continuam na biblioteca.`)) {
                event.preventDefault();
                return;
              }
              savedVersion.current = version;
              writeDraft(note.id, null);
            }}
          >
            <input type="hidden" name="id" value={note.id} />
            <input type="hidden" name="redirectTo" value="notebook" />
            <button type="submit" className="focus-ring grid size-9 place-items-center rounded-md text-destructive hover:bg-error-container/60" aria-label="Excluir anotação" title="Excluir anotação">
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {recoverable ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gold/50 bg-tertiary-container/50 p-4 text-sm text-on-tertiary-container sm:flex-row sm:items-center sm:justify-between">
          <p>Encontramos um rascunho deste aparelho mais recente que a versão salva ({formatDateTime(new Date(recoverable.at), timeZone, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}).</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="focus-ring rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              onClick={() => {
                content.current = { html: recoverable.html, text: recoverable.text };
                setEditorHtml(recoverable.html);
                setEditorKey((key) => key + 1);
                setRecoverable(null);
                markDirty();
              }}
            >
              Recuperar rascunho
            </button>
            <button
              type="button"
              className="focus-ring rounded-md px-3 py-2 text-xs font-semibold hover:bg-surface-container-high"
              onClick={() => {
                writeDraft(note.id, null);
                setRecoverable(null);
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <label htmlFor="note-title" className="sr-only">Título</label>
          <input
            id="note-title"
            value={title}
            onChange={(event) => field(setTitle)(event.target.value)}
            placeholder="Título da anotação"
            maxLength={180}
            className="w-full bg-transparent font-display text-3xl font-semibold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-4xl"
          />

          <section className="mt-4 rounded-xl border border-outline-variant/70 bg-surface-container-low p-4" aria-label="Dados da aula">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <div className="col-span-2 lg:col-span-1">
                <label htmlFor="note-course" className="eyebrow mb-1 block">Disciplina</label>
                <select id="note-course" value={courseId} onChange={(event) => field(setCourseId)(event.target.value)} className={inputClass}>
                  <option value="">Sem disciplina</option>
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>{course.course_name}{course.archived ? " (arquivada)" : ""}</option>
                  ))}
                </select>
              </div>
              {isLesson ? (
                <>
                  <div>
                    <label htmlFor="lesson-date" className="eyebrow mb-1 block">Data da aula</label>
                    <input id="lesson-date" type="date" value={lessonDate} onChange={(event) => field(setLessonDate)(event.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label htmlFor="lesson-professor" className="eyebrow mb-1 block">Professor(a)</label>
                    <input id="lesson-professor" value={professor} onChange={(event) => field(setProfessor)(event.target.value)} placeholder={selectedCourse?.instructor_name ?? ""} maxLength={160} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="lesson-topic" className="eyebrow mb-1 block">Assunto</label>
                    <input id="lesson-topic" value={topic} onChange={(event) => field(setTopic)(event.target.value)} maxLength={200} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="lesson-unit" className="eyebrow mb-1 block">Unidade temática</label>
                    <input id="lesson-unit" value={unit} onChange={(event) => field(setUnit)(event.target.value)} maxLength={200} className={inputClass} />
                  </div>
                </>
              ) : (
                <div className="col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLesson(true);
                      if (!professor && selectedCourse?.instructor_name) setProfessor(selectedCourse.instructor_name);
                      markDirty();
                    }}
                    className="focus-ring min-h-11 rounded-lg border border-dashed border-outline px-4 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-foreground"
                  >
                    Registrar como anotação de aula
                  </button>
                </div>
              )}
              <div className={cn("col-span-2", isLesson ? "lg:col-span-1" : "lg:col-span-3")}>
                <label htmlFor="note-tags" className="eyebrow mb-1 block">Palavras-chave</label>
                <input id="note-tags" value={tagsText} onChange={(event) => field(setTagsText)(event.target.value)} placeholder="rim, néfron, artéria renal" className={inputClass} />
              </div>
            </div>
          </section>

          <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/70 bg-card shadow-card">
            <NoteEditor
              key={editorKey}
              initialHtml={editorHtml}
              onChange={onEditorChange}
              onUploadImage={onUploadImage}
              onAttachFile={onAttachFile}
              onError={setNotice}
            />
          </div>
          {notice ? <p role="alert" className="mt-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{notice}</p> : null}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card" aria-labelledby="study-fields-title">
            <h2 id="study-fields-title" className="font-display text-lg font-semibold">Para estudar</h2>
            <p className="mb-4 text-xs text-muted-foreground">Também aparecem na busca global.</p>
            <div className="flex flex-col gap-4">
              <StudyField id="key-points" label="Pontos importantes" hint="O essencial da aula" value={keyPoints} onChange={field(setKeyPoints)} />
              <StudyField id="memorize" label="Preciso memorizar" hint="Conceitos, classificações, valores" value={memorize} onChange={field(setMemorize)} />
              <StudyField id="doubts" label="Dúvidas" hint="O que perguntar ou pesquisar" value={doubts} onChange={field(setDoubts)} />
              <StudyField id="professor-remarks" label="Observações do professor" hint="“Isso cai na prova”…" value={professorRemarks} onChange={field(setProfessorRemarks)} />
              <StudyField id="references" label="Referências bibliográficas" hint="Livros, capítulos, artigos" value={referencesText} onChange={field(setReferencesText)} />
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card" aria-labelledby="attachments-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="attachments-title" className="font-display text-lg font-semibold">Anexos</h2>
              <label className={cn("focus-ring inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-xs font-semibold hover:border-primary", uploading && "pointer-events-none opacity-60")}>
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
                {uploading ? "Enviando…" : "Anexar"}
                <input
                  type="file"
                  multiple
                  accept={FILE_INPUT_ACCEPT}
                  className="sr-only"
                  onChange={(event) => {
                    void attachFromPanel(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mb-3 mt-1 text-xs text-muted-foreground">PDFs, slides, fotos e documentos — até 50 MB, armazenamento privado.</p>
            {materials.length === 0 ? (
              <p className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {materials.map((material) => {
                  const isImage = material.mime_type?.startsWith("image/");
                  return (
                    <li key={material.id} className="flex items-center gap-3 rounded-lg bg-surface-container-low p-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-fixed text-on-primary-fixed">
                        {isImage ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        {material.storage_path ? (
                          <a href={fileUrl(material.storage_path)} target="_blank" rel="noopener" className="block truncate text-sm font-medium hover:underline">{material.title}</a>
                        ) : (
                          <span className="block truncate text-sm font-medium">{material.title}</span>
                        )}
                        <p className="text-xs text-muted-foreground">{MATERIAL_CATEGORY_LABELS[material.category]} · {formatBytes(material.size_bytes)}</p>
                      </div>
                      {material.storage_path ? (
                        <a href={fileUrl(material.storage_path, { download: true })} className="focus-ring grid size-8 place-items-center rounded-md hover:bg-surface-container-high" aria-label={`Baixar ${material.title}`} title="Baixar">
                          <Download className="size-4" />
                        </a>
                      ) : null}
                      <button type="button" onClick={() => void removeMaterial(material)} className="focus-ring grid size-8 place-items-center rounded-md text-destructive hover:bg-error-container/60" aria-label={`Excluir ${material.title}`} title="Excluir">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
