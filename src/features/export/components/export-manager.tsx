"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Upload,
} from "lucide-react";

import { FormLabel, inputClass } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExportPayload = Record<string, unknown> & {
  exportedAt?: string;
};

type SummaryLength = "short" | "standard" | "detailed";

type PdfSummary = {
  fileName: string;
  pageCount: number;
  wordCount: number;
  generatedAt: string;
  summaryText: string;
  keyPoints: string[];
};

const stopWords = new Set([
  "a", "about", "after", "again", "against", "all", "also", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being", "between",
  "both", "but", "by", "can", "could", "did", "do", "does", "doing", "down", "during",
  "each", "few", "for", "from", "further", "had", "has", "have", "having", "he", "her",
  "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into",
  "is", "it", "its", "itself", "just", "may", "me", "more", "most", "must", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
  "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then",
  "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
  "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who",
  "whom", "why", "will", "with", "would", "you", "your", "yours", "yourself", "yourselves",
]);

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

async function loadExportData(): Promise<ExportPayload> {
  const response = await fetch("/api/export-data", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = (await response.json()) as ExportPayload & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "The export could not be prepared.");
  }
  return payload;
}

function csvEscape(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function toUnifiedCsv(payload: ExportPayload) {
  const rows: string[][] = [["section", "record_number", "data"]];
  Object.entries(payload).forEach(([section, value]) => {
    if (Array.isArray(value)) {
      value.forEach((record, index) => {
        rows.push([section, String(index + 1), JSON.stringify(record)]);
      });
    } else {
      rows.push([section, "1", JSON.stringify(value)]);
    }
  });
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function normalizePdfText(text: string) {
  return text
    .replace(/([A-Za-z])-\s+([A-Za-z])/g, "$1$2")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitSentences(text: string) {
  const matches = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];
  return matches
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 700);
}

function sentenceWords(sentence: string) {
  return (sentence.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? [])
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function createExtractiveSummary(text: string, length: SummaryLength) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    throw new Error("No readable sentences were found in this PDF.");
  }

  const frequencies = new Map<string, number>();
  sentences.forEach((sentence) => {
    const unique = new Set(sentenceWords(sentence));
    unique.forEach((word) => frequencies.set(word, (frequencies.get(word) ?? 0) + 1));
  });

  const maxFrequency = Math.max(1, ...frequencies.values());
  const target = length === "short" ? 8 : length === "detailed" ? 30 : 16;
  const scored = sentences.map((sentence, index) => {
    const words = sentenceWords(sentence);
    const wordScore = words.reduce(
      (sum, word) => sum + (frequencies.get(word) ?? 0) / maxFrequency,
      0,
    );
    const lengthPenalty = words.length > 55 ? 0.82 : words.length < 6 ? 0.65 : 1;
    const positionBonus = index < Math.max(3, sentences.length * 0.08) ? 1.12 : 1;
    return {
      index,
      sentence,
      score: (wordScore / Math.max(1, Math.sqrt(words.length))) * lengthPenalty * positionBonus,
    };
  });

  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(target, sentences.length))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  const overviewCount = length === "short" ? 2 : 3;
  return {
    summaryText: selected.slice(0, overviewCount).join(" "),
    keyPoints: selected.slice(overviewCount),
  };
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  if (document.numPages > 120) {
    throw new Error("This PDF has more than 120 pages. Please upload a smaller PDF.");
  }

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  const text = normalizePdfText(pageTexts.join("\n"));
  return { text, pageCount: document.numPages };
}

async function downloadSummaryPdf(summary: PdfSummary) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 56;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    y = 56;
  };

  const writeWrapped = (
    text: string,
    options: { size?: number; bold?: boolean; gapAfter?: number; indent?: number } = {},
  ) => {
    const size = options.size ?? 11;
    const indent = options.indent ?? 0;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    const lineHeight = size * 1.45;
    ensureSpace(lines.length * lineHeight + (options.gapAfter ?? 8));
    doc.text(lines, margin + indent, y);
    y += lines.length * lineHeight + (options.gapAfter ?? 8);
  };

  writeWrapped("StudyFlow PDF Summary", { size: 20, bold: true, gapAfter: 16 });
  writeWrapped(`Source: ${summary.fileName}`, { size: 10, gapAfter: 4 });
  writeWrapped(
    `Pages: ${summary.pageCount}   Words: ${summary.wordCount.toLocaleString()}   Generated: ${new Date(summary.generatedAt).toLocaleString()}`,
    { size: 10, gapAfter: 18 },
  );
  writeWrapped("Overview", { size: 14, bold: true, gapAfter: 8 });
  writeWrapped(summary.summaryText, { size: 11, gapAfter: 18 });
  writeWrapped("Key Points", { size: 14, bold: true, gapAfter: 10 });
  summary.keyPoints.forEach((point, index) => {
    writeWrapped(`${index + 1}. ${point}`, { size: 11, gapAfter: 8, indent: 4 });
  });

  const safeBaseName = summary.fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
  doc.save(`${safeBaseName}-summary.pdf`);
}

export function ExportManager() {
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);
  const [exportError, setExportError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("standard");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summary, setSummary] = useState<PdfSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const combinedSummary = useMemo(() => {
    if (!summary) return "";
    return [
      summary.summaryText,
      "",
      ...summary.keyPoints.map((point, index) => `${index + 1}. ${point}`),
    ].join("\n");
  }, [summary]);

  const exportJson = async () => {
    setExporting("json");
    setExportError("");
    try {
      const payload = await loadExportData();
      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `studyflow-data-${dateStamp()}.json`,
      );
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const exportCsv = async () => {
    setExporting("csv");
    setExportError("");
    try {
      const payload = await loadExportData();
      const csv = `\uFEFF${toUnifiedCsv(payload)}`;
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `studyflow-data-${dateStamp()}.csv`,
      );
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const summarizePdf = async () => {
    if (!file) {
      setSummaryError("Choose a PDF first.");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSummaryError("Only PDF files are supported.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setSummaryError("The PDF must be 20 MB or smaller.");
      return;
    }

    setSummarizing(true);
    setSummaryError("");
    setSummary(null);
    try {
      const { text, pageCount } = await extractPdfText(file);
      if (text.length < 120) {
        throw new Error(
          "Very little selectable text was found. This may be a scanned PDF and needs OCR before it can be summarized.",
        );
      }
      const { summaryText, keyPoints } = createExtractiveSummary(text, summaryLength);
      setSummary({
        fileName: file.name,
        pageCount,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        generatedAt: new Date().toISOString(),
        summaryText,
        keyPoints,
      });
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : "The PDF could not be summarized.",
      );
    } finally {
      setSummarizing(false);
    }
  };

  const copySummary = async () => {
    if (!combinedSummary) return;
    await navigator.clipboard.writeText(combinedSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Export your StudyFlow data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Download a private copy of your profile, courses, tasks, schedules,
            GPA records, notes, study sessions and other saved StudyFlow data.
          </p>
          {exportError ? (
            <p className="mt-4 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
              {exportError}
            </p>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
            <Button onClick={exportJson} disabled={exporting !== null}>
              {exporting === "json" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileJson className="size-4" />
              )}
              Download all data as JSON
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={exporting !== null}
            >
              {exporting === "csv" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              Download all data as CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" /> PDF summarizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div>
                <FormLabel htmlFor="pdf-upload">Choose a PDF</FormLabel>
                <input
                  ref={fileInputRef}
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  className={`${inputClass} file:mr-3 file:rounded-full file:border-0 file:bg-primary-fixed file:px-3 file:py-2 file:text-xs file:font-semibold file:text-on-primary-fixed`}
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    setFile(selected);
                    setSummary(null);
                    setSummaryError("");
                  }}
                />
              </div>

              <div className="mt-4">
                <FormLabel htmlFor="summary-length">Summary length</FormLabel>
                <select
                  id="summary-length"
                  className={inputClass}
                  value={summaryLength}
                  onChange={(event) =>
                    setSummaryLength(event.target.value as SummaryLength)
                  }
                >
                  <option value="short">Short</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              {file ? (
                <div className="mt-4 rounded-2xl bg-surface-container-low p-4 text-sm">
                  <p className="truncate font-semibold">{file.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : null}

              {summaryError ? (
                <p className="mt-4 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {summaryError}
                </p>
              ) : null}

              <Button
                className="mt-5 w-full sm:w-auto"
                onClick={summarizePdf}
                disabled={summarizing}
              >
                {summarizing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {summarizing ? "Reading and summarizing…" : "Summarize PDF"}
              </Button>

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Processing happens in your browser. Text-based PDFs up to 20 MB
                and 120 pages are supported. Scanned image-only PDFs require OCR.
              </p>
            </div>

            <div className="min-w-0 rounded-card border border-outline-variant/55 bg-surface-container-low p-5 sm:p-6">
              {summary ? (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Summarized PDF</h3>
                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {summary.fileName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{summary.pageCount} pages</Badge>
                      <Badge>{summary.wordCount.toLocaleString()} words</Badge>
                    </div>
                  </div>

                  <div className="mt-5 max-h-[32rem] overflow-y-auto rounded-2xl bg-card p-5">
                    <h4 className="font-semibold">Overview</h4>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {summary.summaryText}
                    </p>
                    {summary.keyPoints.length > 0 ? (
                      <>
                        <h4 className="mt-5 font-semibold">Key points</h4>
                        <ol className="mt-2 space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
                          {summary.keyPoints.map((point, index) => (
                            <li key={`${index}-${point.slice(0, 30)}`} className="list-decimal">
                              {point}
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button onClick={() => downloadSummaryPdf(summary)}>
                      <Download className="size-4" /> Download summarized PDF
                    </Button>
                    <Button variant="outline" onClick={copySummary}>
                      {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                      {copied ? "Copied" : "Copy summary"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        setSummary(null);
                        setSummaryError("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Summarize another PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-72 place-items-center text-center">
                  <div>
                    <FileText className="mx-auto size-10 text-muted-foreground" />
                    <h3 className="mt-3 font-semibold">Your summary will appear here</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                      Upload a text-based PDF and press Summarize PDF. You can then
                      review the result and download it as a new PDF.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
