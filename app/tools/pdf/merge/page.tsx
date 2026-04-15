"use client";

import { useState, useCallback } from "react";
import { FilePlus, GripVertical, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { PDFDocument } from "pdf-lib";

export default function MergePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setDownloadUrl(null);
  }, []);

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, removed);
      return newFiles;
    });
  }, []);

  const mergePDFs = async () => {
    if (files.length < 2) {
      setStatus("error");
      setMessage("Please select at least 2 PDF files to merge");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Merging PDFs...");

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        setProgress(((i + 1) / files.length) * 90);
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage("PDFs merged successfully!");
    } catch {
      setStatus("error");
      setMessage("Failed to merge PDFs. Please ensure all files are valid PDFs.");
    }
  };

  return (
    <ToolPage
      title="Merge PDFs"
      description="Combine multiple PDF files into a single document"
      icon={FilePlus}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".pdf,application/pdf"
          multiple
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 1 && (
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Drag files to reorder (first file will be at the beginning)
            </p>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3"
                >
                  <button
                    className="cursor-grab text-muted-foreground hover:text-foreground"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startY = e.clientY;
                      const startIndex = index;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const diff = moveEvent.clientY - startY;
                        const newIndex = Math.max(
                          0,
                          Math.min(files.length - 1, startIndex + Math.round(diff / 50))
                        );
                        if (newIndex !== startIndex) {
                          moveFile(startIndex, newIndex);
                        }
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener("mousemove", handleMouseMove);
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  >
                    <GripVertical className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <div className="flex gap-1">
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveFile(index, index - 1)}
                      >
                        Up
                      </Button>
                    )}
                    {index < files.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveFile(index, index + 1)}
                      >
                        Down
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={mergePDFs}
            disabled={files.length < 2 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Merging..." : "Merge PDFs"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download="merged.pdf">
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
