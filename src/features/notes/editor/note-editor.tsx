"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  MessageSquareText,
  Minus,
  Paperclip,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Stethoscope,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FILE_INPUT_ACCEPT } from "@/features/materials/lib/files";
import { Callout, type CalloutVariant } from "@/features/notes/editor/callout";
import { cn } from "@/lib/utils";

export type EditorChange = { html: string; text: string };

export type NoteEditorProps = {
  initialHtml: string;
  onChange: (change: EditorChange) => void;
  onUploadImage: (file: File) => Promise<{ src: string; alt: string }>;
  onAttachFile: (file: File) => Promise<{ href: string; name: string }>;
  onError: (message: string) => void;
};

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "focus-ring grid size-9 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-foreground disabled:opacity-40",
        active && "bg-primary-fixed text-on-primary-fixed",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-outline-variant" aria-hidden="true" />;
}

function TextButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "focus-ring h-8 shrink-0 rounded-md px-2.5 text-xs font-medium hover:bg-surface-container-high",
        danger ? "text-destructive" : "text-on-surface-variant",
      )}
    >
      {label}
    </button>
  );
}

function imageFiles(list: FileList | null | undefined) {
  return Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
}

function Toolbar({ editor, busy, onPickImage, onPickFile }: { editor: Editor; busy: boolean; onPickImage: () => void; onPickFile: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      paragraph: current.isActive("paragraph"),
      h1: current.isActive("heading", { level: 1 }),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      highlight: current.isActive("highlight"),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      task: current.isActive("taskList"),
      quote: current.isActive("blockquote"),
      observation: current.isActive("callout", { variant: "observation" }),
      concept: current.isActive("callout", { variant: "concept" }),
      clinical: current.isActive("callout", { variant: "clinical" }),
      link: current.isActive("link"),
      table: current.isActive("table"),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const callout = (variant: CalloutVariant) => chain().toggleCallout(variant).run();

  const setLink = () => {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const value = window.prompt("Endereço do link (deixe vazio para remover):", previous);
    if (value === null) return;
    const href = value.trim();
    if (!href) {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    const normalized = /^(https?:\/\/|\/|mailto:)/i.test(href) ? href : `https://${href}`;
    chain().extendMarkRange("link").setLink({ href: normalized }).run();
  };

  return (
    <div className="sticky top-[72px] z-20 border-b border-outline-variant/70 bg-card/95 backdrop-blur lg:top-0">
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5" role="toolbar" aria-label="Formatação">
        <ToolbarButton label="Desfazer" disabled={!state.canUndo} onClick={() => chain().undo().run()}><Undo2 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Refazer" disabled={!state.canRedo} onClick={() => chain().redo().run()}><Redo2 className="size-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton label="Texto normal" active={state.paragraph} onClick={() => chain().setParagraph().run()}><Pilcrow className="size-4" /></ToolbarButton>
        <ToolbarButton label="Título" active={state.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()}><Heading1 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Subtítulo" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></ToolbarButton>
        <ToolbarButton label="Seção" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton label="Negrito" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold className="size-4" /></ToolbarButton>
        <ToolbarButton label="Itálico" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic className="size-4" /></ToolbarButton>
        <ToolbarButton label="Sublinhado" active={state.underline} onClick={() => chain().toggleUnderline().run()}><Underline className="size-4" /></ToolbarButton>
        <ToolbarButton label="Tachado" active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="size-4" /></ToolbarButton>
        <ToolbarButton label="Destacar" active={state.highlight} onClick={() => chain().toggleHighlight().run()}><Highlighter className="size-4" /></ToolbarButton>
        <ToolbarButton label="Link" active={state.link} onClick={setLink}><Link2 className="size-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton label="Lista com marcadores" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List className="size-4" /></ToolbarButton>
        <ToolbarButton label="Lista numerada" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolbarButton>
        <ToolbarButton label="Checklist" active={state.task} onClick={() => chain().toggleTaskList().run()}><ListChecks className="size-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton label="Bloco de observação" active={state.observation} onClick={() => callout("observation")}><MessageSquareText className="size-4" /></ToolbarButton>
        <ToolbarButton label="Bloco de conceito importante" active={state.concept} onClick={() => callout("concept")}><Lightbulb className="size-4" /></ToolbarButton>
        <ToolbarButton label="Bloco de correlação clínica" active={state.clinical} onClick={() => callout("clinical")}><Stethoscope className="size-4" /></ToolbarButton>
        <ToolbarButton label="Citação" active={state.quote} onClick={() => chain().toggleBlockquote().run()}><Quote className="size-4" /></ToolbarButton>
        <ToolbarButton label="Linha divisória" onClick={() => chain().setHorizontalRule().run()}><Minus className="size-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton label="Inserir tabela" active={state.table} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="size-4" /></ToolbarButton>
        <ToolbarButton label="Inserir imagem" disabled={busy} onClick={onPickImage}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}</ToolbarButton>
        <ToolbarButton label="Anexar arquivo (PDF, slides…)" disabled={busy} onClick={onPickFile}><Paperclip className="size-4" /></ToolbarButton>
        <ToolbarButton label="Limpar formatação" onClick={() => chain().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="size-4" /></ToolbarButton>
      </div>
      {state.table ? (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-outline-variant/60 px-2 py-1" aria-label="Ferramentas de tabela">
          <span className="eyebrow mr-1 shrink-0">Tabela</span>
          <TextButton label="+ Linha" onClick={() => chain().addRowAfter().run()} />
          <TextButton label="+ Coluna" onClick={() => chain().addColumnAfter().run()} />
          <TextButton label="− Linha" onClick={() => chain().deleteRow().run()} />
          <TextButton label="− Coluna" onClick={() => chain().deleteColumn().run()} />
          <TextButton label="Cabeçalho" onClick={() => chain().toggleHeaderRow().run()} />
          <TextButton label="Excluir tabela" danger onClick={() => chain().deleteTable().run()} />
        </div>
      ) : null}
    </div>
  );
}

export function NoteEditor({ initialHtml, onChange, onUploadImage, onAttachFile, onError }: NoteEditorProps) {
  const [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const callbacks = useRef({ onChange, onUploadImage, onAttachFile, onError });

  useEffect(() => {
    callbacks.current = { onChange, onUploadImage, onAttachFile, onError };
  }, [onAttachFile, onChange, onError, onUploadImage]);

  const editorRef = useRef<Editor | null>(null);

  const insertImages = async (files: File[]) => {
    const editor = editorRef.current;
    if (!editor || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of files) {
        const image = await callbacks.current.onUploadImage(file);
        editor.chain().focus().setImage(image).createParagraphNear().run();
      }
    } catch (error) {
      callbacks.current.onError(error instanceof Error ? error.message : "Não foi possível inserir a imagem.");
    } finally {
      setBusy(false);
    }
  };

  const attachFiles = async (files: File[]) => {
    const editor = editorRef.current;
    if (!editor || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of files) {
        const link = await callbacks.current.onAttachFile(file);
        editor
          .chain()
          .focus()
          .insertContent([
            { type: "text", text: `Anexo: ${link.name}`, marks: [{ type: "link", attrs: { href: link.href } }] },
            { type: "text", text: " " },
          ])
          .run();
      }
    } catch (error) {
      callbacks.current.onError(error instanceof Error ? error.message : "Não foi possível anexar o arquivo.");
    } finally {
      setBusy(false);
    }
  };

  const insertImagesRef = useRef(insertImages);
  useEffect(() => {
    insertImagesRef.current = insertImages;
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Highlight,
      Image.configure({ allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Callout,
      Placeholder.configure({ placeholder: "Comece a escrever a aula… Use a barra acima para títulos, listas, tabelas e blocos de destaque." }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: "atlas-prose min-h-[55svh] px-5 py-6 outline-none sm:px-10 sm:py-8",
        "aria-label": "Texto da anotação",
        spellcheck: "true",
        lang: "pt-BR",
      },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        void insertImagesRef.current(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = imageFiles((event as DragEvent).dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        void insertImagesRef.current(files);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      callbacks.current.onChange({ html: current.getHTML(), text: current.getText({ blockSeparator: "\n" }) });
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[55svh] animate-pulse rounded-b-xl bg-surface-container-low" aria-label="Carregando editor" />;
  }

  return (
    <div>
      <Toolbar editor={editor} busy={busy} onPickImage={() => imageInput.current?.click()} onPickFile={() => fileInput.current?.click()} />
      <EditorContent editor={editor} />
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void insertImages(imageFiles(event.target.files));
          event.target.value = "";
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          void attachFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
