"use client";

import { useState, useCallback } from "react";
import { Scissors, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export default function SplitPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<"all" | "range" | "extract">("all");
  const [pageRange, setPageRange] = useState("");
  const [totalPages, setTotalPages] = useState(0);

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);

    if (newFiles.length > 0) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        setTotalPages(pdf.getPageCount());
      } catch {
        setTotalPages(0);
      }
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
    setTotalPages(0);
  }, []);

  const parsePageRange = (range: string, maxPages: number): number[] => {
    const pages: Set<number> = new Set();
    const parts = range.split(",");

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map((n) => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
            pages.add(i);
          }
        }
      } else {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= maxPages) {
          pages.add(num);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const splitPDF = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a PDF file");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Splitting PDF...");

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pageCount = pdf.getPageCount();

      if (splitMode === "all") {
        // Split into individual pages
        const zip = new JSZip();
        
        for (let i = 0; i < pageCount; i++) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdf, [i]);
          newPdf.addPage(copiedPage);
          const pdfBytes = await newPdf.save();
          zip.file(`page-${i + 1}.pdf`, pdfBytes);
          setProgress(((i + 1) / pageCount) * 90);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        setDownloadUrl(url);
        setProgress(100);
        setStatus("complete");
        setMessage(`Split into ${pageCount} pages!`);
      } else if (splitMode === "range" || splitMode === "extract") {
        const pages = parsePageRange(pageRange, pageCount);
        
        if (pages.length === 0) {
          setStatus("error");
          setMessage("Please enter a valid page range");
          return;
        }

        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(
          pdf,
          pages.map((p) => p - 1)
        );
        copiedPages.forEach((page) => newPdf.addPage(page));
        
        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        
        setDownloadUrl(url);
        setProgress(100);
        setStatus("complete");
        setMessage(`Extracted ${pages.length} pages!`);
      }
    } catch {
      setStatus("error");
      setMessage("Failed to split PDF. Please ensure the file is a valid PDF.");
    }
  };

  return (
    <ToolPage
      title="Split PDF"
      description="Extract pages or split a PDF into multiple files"
      icon={Scissors}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".pdf,application/pdf"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 0 && totalPages > 0 && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Total pages: <span className="font-medium text-foreground">{totalPages}</span>
            </p>

            <RadioGroup value={splitMode} onValueChange={(v) => setSplitMode(v as typeof splitMode)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">Split all pages into separate PDFs (ZIP download)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="extract" id="extract" />
                <Label htmlFor="extract">Extract specific pages</Label>
              </div>
            </RadioGroup>

            {(splitMode === "range" || splitMode === "extract") && (
              <div className="space-y-2">
                <Label htmlFor="pageRange">Page range (e.g., 1-3, 5, 7-9)</Label>
                <Input
                  id="pageRange"
                  placeholder="1-3, 5, 7-9"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={splitPDF}
            disabled={files.length === 0 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Splitting..." : "Split PDF"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download={splitMode === "all" ? "split-pages.zip" : "extracted.pdf"}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
