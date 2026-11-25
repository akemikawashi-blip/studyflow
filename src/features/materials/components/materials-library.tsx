"use client";

import Link from "next/link";
import { Download, ExternalLink, Eye, File as FileIcon, FileText, Image as ImageIcon, Link2, Loader2, Pencil, Presentation, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { inputClass } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createLinkMaterialAction, deleteMaterialAction, updateMaterialAction } from "@/features/materials/actions/material-actions";
import { FILE_INPUT_ACCEPT, MATERIAL_CATEGORY_LABELS, fileUrl, formatBytes } from "@/features/materials/lib/files";
import { uploadMaterial, type Material } from "@/features/materials/lib/upload";
import { parseTags } from "@/features/notes/schemas/note";
import { formatKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { MaterialCategory } from "@/types/database.generated";

export type LibraryCourse = { id: string; course_name: string; color: string };
export type LibraryLesson = { id: string; title: string; lesson_date: string; course_id: string | null };
export type LibraryExam = { id: string; title: string; exam_date: string; course_id: string | null };

type Kind = "pdf" | "image" | "slides" | "document" | "link";
const KIND_LABELS: Record<Kind, string> = { pdf: "PDF", image: "Imagem", slides: "Apresentação", document: "Documento", link: "Link" };

function kindOf(material: Material): Kind {
  if (!material.storage_path) return "link";
  const mime = material.mime_type ?? "";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "slides";
  return "document";
}

function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  const Icon = { pdf: FileText, image: ImageIcon, slides: Presentation, document: FileIcon, link: Link2 }[kind];
  return <Icon className={className} aria-hidden="true" />;
}

const categories = Object.entries(MATERIAL_CATEGORY_LABELS) as [MaterialCategory, string][];

type Links = { courseId: string; lessonId: string; examId: string };

function LinkSelectors({ value, onChange, courses, lessons, exams, fixedCourseId, idPrefix }: {
  value: Links;
  onChange: (value: Links) => void;
  courses: LibraryCourse[];
  lessons: LibraryLesson[];
  exams: LibraryExam[];
  fixedCourseId?: string;
  idPrefix: string;
}) {
  const courseId = fixedCourseId ?? value.courseId;
  const lessonOptions = lessons.filter((lesson) => !courseId || lesson.course_id === courseId);
  const examOptions = exams.filter((exam) => !courseId || exam.course_id === courseId);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {fixedCourseId ? null : (
        <div>
          <label htmlFor={`${idPrefix}-course`} className="mb-1 block text-sm font-medium">Disciplina</label>
          <select id={`${idPrefix}-course`} value={value.courseId} onChange={(event) => onChange({ courseId: event.target.value, lessonId: "", examId: "" })} className={inputClass}>
            <option value="">Nenhuma</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor={`${idPrefix}-lesson`} className="mb-1 block text-sm font-medium">Aula</label>
        <select id={`${idPrefix}-lesson`} value={value.lessonId} onChange={(event) => onChange({ ...value, lessonId: event.target.value })} className={inputClass}>
          <option value="">Nenhuma</option>
          {lessonOptions.map((lesson) => <option key={lesson.id} value={lesson.id}>{formatKey(lesson.lesson_date, { day: "2-digit", month: "2-digit" })} — {lesson.title}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-exam`} className="mb-1 block text-sm font-medium">Avaliação</label>
        <select id={`${idPrefix}-exam`} value={value.examId} onChange={(event) => onChange({ ...value, examId: event.target.value })} className={inputClass}>
          <option value="">Nenhuma</option>
          {examOptions.map((exam) => <option key={exam.id} value={exam.id}>{formatKey(exam.exam_date, { day: "2-digit", month: "2-digit" })} — {exam.title}</option>)}
        </select>
      </div>
    </div>
  );
}

function UploadForm({ onUploaded, close, fixedCourseId, ...options }: { onUploaded: (material: Material) => void; close: () => void; fixedCourseId?: string; courses: LibraryCourse[]; lessons: LibraryLesson[]; exams: LibraryExam[] }) {
  const [category, setCategory] = useState<MaterialCategory | "auto">("auto");
  const [links, setLinks] = useState<Links>({ courseId: fixedCourseId ?? "", lessonId: "", examId: "" });
  const [progress, setProgress] = useState<{ name: string; status: "pending" | "done" | "error"; message?: string }[]>([]);
  const busy = progress.some((item) => item.status === "pending");

  const send = async (files: File[]) => {
    setProgress(files.map((file) => ({ name: file.name, status: "pending" })));
    for (const [index, file] of files.entries()) {
      try {
        const material = await uploadMaterial(file, {
          folder: "library",
          category: category === "auto" ? undefined : category,
          courseId: fixedCourseId ?? (links.courseId || null),
          lessonId: links.lessonId || null,
          examId: links.examId || null,
        });
        onUploaded(material);
        setProgress((current) => current.map((item, position) => (position === index ? { ...item, status: "done" } : item)));
      } catch (error) {
        setProgress((current) => current.map((item, position) => (position === index ? { ...item, status: "error", message: error instanceof Error ? error.message : "Falha no envio." } : item)));
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="upload-category" className="mb-1 block text-sm font-medium">Categoria</label>
        <select id="upload-category" value={category} onChange={(event) => setCategory(event.target.value as MaterialCategory | "auto")} className={inputClass}>
          <option value="auto">Automática pelo tipo de arquivo</option>
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <LinkSelectors idPrefix="upload" value={links} onChange={setLinks} fixedCourseId={fixedCourseId} {...options} />
      <label className={cn("focus-within:ring-2 focus-within:ring-ring flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-outline-variant p-8 text-center hover:border-primary", busy && "pointer-events-none opacity-60")}>
        <Upload className="size-6 text-gold" />
        <span className="text-sm font-semibold">Escolher arquivos</span>
        <span className="text-xs text-muted-foreground">PDF, imagens, slides e documentos — até 50 MB cada</span>
        <input type="file" multiple accept={FILE_INPUT_ACCEPT} className="sr-only" onChange={(event) => { void send(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      </label>
      {progress.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm" aria-live="polite">
          {progress.map((item, index) => (
            <li key={index} className={cn("flex items-start gap-2", item.status === "error" && "text-destructive")}>
              {item.status === "pending" ? <Loader2 className="mt-0.5 size-4 animate-spin" /> : <span className="w-4 text-center">{item.status === "done" ? "✓" : "!"}</span>}
              <span className="min-w-0 break-words">{item.message ?? item.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end"><Button variant="ghost" onClick={close} disabled={busy}>Concluir</Button></div>
    </div>
  );
}

function DetailsForm({ material, onSaved, close, fixedCourseId, ...options }: { material?: Material; onSaved: (material: Material) => void; close: () => void; fixedCourseId?: string; courses: LibraryCourse[]; lessons: LibraryLesson[]; exams: LibraryExam[] }) {
  const [title, setTitle] = useState(material?.title ?? "");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<MaterialCategory>(material?.category ?? "reference");
  const [description, setDescription] = useState(material?.description ?? "");
  const [tags, setTags] = useState(material?.tags.join(", ") ?? "");
  const [links, setLinks] = useState<Links>({ courseId: fixedCourseId ?? material?.course_id ?? "", lessonId: material?.lesson_id ?? "", examId: material?.exam_id ?? "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const payload = { title, category, description, tags: parseTags(tags), courseId: links.courseId || null, lessonId: links.lessonId || null, examId: links.examId || null };
    const result = material ? await updateMaterialAction(material.id, payload) : await createLinkMaterialAction({ ...payload, url });
    setPending(false);
    if (result.status === "error") return setError(result.message);
    onSaved(result.material);
    close();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error ? <p role="alert" className="rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</p> : null}
      {!material ? (
        <div>
          <label htmlFor="material-url" className="mb-1 block text-sm font-medium">Endereço (URL)</label>
          <input id="material-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" className={inputClass} autoFocus />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div>
          <label htmlFor="material-title" className="mb-1 block text-sm font-medium">Título</label>
          <input id="material-title" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="material-category" className="mb-1 block text-sm font-medium">Categoria</label>
          <select id="material-category" value={category} onChange={(event) => setCategory(event.target.value as MaterialCategory)} className={inputClass}>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <LinkSelectors idPrefix="details" value={links} onChange={setLinks} fixedCourseId={fixedCourseId} {...options} />
      <div>
        <label htmlFor="material-description" className="mb-1 block text-sm font-medium">Descrição / referência bibliográfica</label>
        <textarea id="material-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputClass} py-2 leading-6`} />
      </div>
      <div>
        <label htmlFor="material-tags" className="mb-1 block text-sm font-medium">Palavras-chave</label>
        <input id="material-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="separadas por vírgula" className={inputClass} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>Cancelar</Button>
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : material ? "Salvar" : "Adicionar"}</Button>
      </div>
    </form>
  );
}

function Preview({ material }: { material: Material }) {
  const kind = kindOf(material);
  const src = material.storage_path ? fileUrl(material.storage_path) : material.external_url ?? "";
  if (kind === "pdf") return <iframe src={src} title={material.title} className="h-[72svh] w-full rounded-lg border border-outline-variant bg-white" />;
  // eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URLs cannot go through next/image
  if (kind === "image") return <img src={src} alt={material.title} className="mx-auto max-h-[72svh] rounded-lg" />;
  return (
    <div className="rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-muted-foreground">
      <p>Este tipo de arquivo não pode ser exibido no navegador.</p>
      <a href={material.storage_path ? fileUrl(material.storage_path, { download: true }) : src} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1.5 font-semibold text-primary underline">
        {material.storage_path ? "Baixar arquivo" : "Abrir link"}
      </a>
    </div>
  );
}

export function MaterialsLibrary({
  initialMaterials,
  courses,
  lessons,
  exams,
  noteTitles,
  fixedCourseId,
}: {
  initialMaterials: Material[];
  courses: LibraryCourse[];
  lessons: LibraryLesson[];
  exams: LibraryExam[];
  noteTitles: Record<string, string>;
  fixedCourseId?: string;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [kind, setKind] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [notice, setNotice] = useState("");

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);
  const examById = useMemo(() => new Map(exams.map((exam) => [exam.id, exam])), [exams]);
  const shared = { courses, lessons, exams, fixedCourseId };

  const filtered = useMemo(() => {
    const terms = query.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/\s+/).filter(Boolean);
    return materials.filter((material) => {
      if (category && material.category !== category) return false;
      if (courseFilter && material.course_id !== courseFilter) return false;
      if (kind && kindOf(material) !== kind) return false;
      const created = material.created_at.slice(0, 10);
      if (from && created < from) return false;
      if (to && created > to) return false;
      if (terms.length === 0) return true;
      const haystack = [material.title, material.description, material.file_name, ...material.tags, courseById.get(material.course_id ?? "")?.course_name]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [category, courseById, courseFilter, from, kind, materials, query, to]);

  const upsert = (material: Material) =>
    setMaterials((current) => (current.some((item) => item.id === material.id) ? current.map((item) => (item.id === material.id ? material : item)) : [material, ...current]));

  const remove = async (material: Material) => {
    if (!window.confirm(`Excluir “${material.title}”?${material.storage_path ? " O arquivo será apagado do armazenamento." : ""} Esta ação não pode ser desfeita.`)) return;
    const result = await deleteMaterialAction(material.id);
    if (result.status === "ok") setMaterials((current) => current.filter((item) => item.id !== material.id));
    else setNotice(result.message);
  };

  const iconButton = "focus-ring grid size-8 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-high";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Dialog size="lg" eyebrow="Materiais" title="Enviar arquivos" trigger={(open) => <Button onClick={open}><Upload className="size-4" /> Enviar arquivos</Button>}>
          {(close) => <UploadForm onUploaded={upsert} close={close} {...shared} />}
        </Dialog>
        <Dialog size="lg" eyebrow="Materiais" title="Adicionar link ou referência" trigger={(open) => <Button variant="outline" onClick={open}><Link2 className="size-4" /> Link ou referência</Button>}>
          {(close) => <DetailsForm onSaved={upsert} close={close} {...shared} />}
        </Dialog>
      </div>

      <div className="mt-4 rounded-xl border border-outline-variant/70 bg-surface-container-low p-3">
        <label className="relative block">
          <span className="sr-only">Buscar materiais</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, descrição, arquivo ou palavra-chave" className={`${inputClass} pl-10`} />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {fixedCourseId ? null : (
            <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className={inputClass} aria-label="Disciplina">
              <option value="">Todas as disciplinas</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.course_name}</option>)}
            </select>
          )}
          <select value={kind} onChange={(event) => setKind(event.target.value)} className={inputClass} aria-label="Tipo de material">
            <option value="">Todos os tipos</option>
            {(Object.keys(KIND_LABELS) as Kind[]).map((value) => <option key={value} value={value}>{KIND_LABELS[value]}</option>)}
          </select>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass} aria-label="Adicionados a partir de" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={inputClass} aria-label="Adicionados até" />
        </div>
      </div>

      {notice ? <p role="alert" className="mt-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{notice}</p> : null}

      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} de {materials.length} {materials.length === 1 ? "material" : "materiais"}</p>

      {materials.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-outline p-10 text-center">
          <p className="font-display text-xl font-semibold">Nenhum material ainda</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Envie PDFs, slides, fotos do quadro e documentos, ou guarde links de artigos e referências.</p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((material) => {
            const materialKind = kindOf(material);
            const course = material.course_id ? courseById.get(material.course_id) : undefined;
            const lesson = material.lesson_id ? lessonById.get(material.lesson_id) : undefined;
            const exam = material.exam_id ? examById.get(material.exam_id) : undefined;
            const context: ReactNode[] = [];
            if (lesson) context.push(<span key="l">Aula: {lesson.title}</span>);
            if (exam) context.push(<span key="e">Avaliação: {exam.title}</span>);
            if (material.note_id && noteTitles[material.note_id]) context.push(<Link key="n" href={`/app/notes/${material.note_id}`} className="underline hover:text-primary">Anotação: {noteTitles[material.note_id]}</Link>);
            return (
              <li key={material.id} className="flex flex-col rounded-xl border border-outline-variant/70 bg-card p-4 shadow-card">
                <div className="flex items-start gap-3">
                  {materialKind === "image" && material.storage_path ? (
                    // eslint-disable-next-line @next/next/no-img-element -- private signed URL
                    <img src={fileUrl(material.storage_path)} alt="" className="size-12 shrink-0 rounded-lg border border-outline-variant object-cover" loading="lazy" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-container text-primary"><KindIcon kind={materialKind} className="size-5" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">{MATERIAL_CATEGORY_LABELS[material.category]}</p>
                    <p className="break-words font-semibold leading-snug">{material.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[formatKey(material.created_at.slice(0, 10), { day: "2-digit", month: "short", year: "numeric" }), formatBytes(material.size_bytes), materialKind === "link" ? new URL(material.external_url ?? "https://x").hostname : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                {course && !fixedCourseId ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-on-surface-variant"><span className="size-2 rounded-full" style={{ backgroundColor: course.color }} />{course.course_name}</p>
                ) : null}
                {context.length > 0 ? <p className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">{context}</p> : null}
                {material.description ? <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant">{material.description}</p> : null}
                {material.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">{material.tags.map((tag) => <span key={tag} className="rounded-md bg-surface-container px-2 py-0.5 text-[11px]">{tag}</span>)}</div>
                ) : null}
                <div className="mt-auto flex items-center gap-0.5 pt-3">
                  {materialKind === "link" ? (
                    <a href={material.external_url ?? "#"} target="_blank" rel="noopener noreferrer" className={iconButton} aria-label={`Abrir ${material.title}`} title="Abrir link"><ExternalLink className="size-4" /></a>
                  ) : (
                    <Dialog size="xl" eyebrow={MATERIAL_CATEGORY_LABELS[material.category]} title={material.title} trigger={(open) => <button type="button" onClick={open} className={iconButton} aria-label={`Visualizar ${material.title}`} title="Visualizar"><Eye className="size-4" /></button>}>
                      {() => <Preview material={material} />}
                    </Dialog>
                  )}
                  {material.storage_path ? (
                    <a href={fileUrl(material.storage_path, { download: true })} className={iconButton} aria-label={`Baixar ${material.title}`} title="Baixar"><Download className="size-4" /></a>
                  ) : null}
                  <Dialog size="lg" eyebrow="Materiais" title="Editar material" trigger={(open) => <button type="button" onClick={open} className={iconButton} aria-label={`Editar ${material.title}`} title="Editar"><Pencil className="size-4" /></button>}>
                    {(close) => <DetailsForm material={material} onSaved={upsert} close={close} {...shared} />}
                  </Dialog>
                  <button type="button" onClick={() => void remove(material)} className={`${iconButton} ml-auto text-destructive`} aria-label={`Excluir ${material.title}`} title="Excluir"><Trash2 className="size-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {materials.length > 0 && filtered.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-outline-variant p-6 text-center text-sm text-muted-foreground">Nenhum material com esses filtros.</p> : null}
    </div>
  );
}
