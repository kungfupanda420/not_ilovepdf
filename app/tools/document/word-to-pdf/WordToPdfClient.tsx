'use client';

import { useState, useCallback, useEffect } from "react";
import { FileCode, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";

export default function WordToPdfClient() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Cleanup download URL when component unmounts or new conversion starts
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    // Clean up old download URL
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  }, [downloadUrl]);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  }, [downloadUrl]);

  const convertToPDF = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a Word document");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Converting to PDF...");

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      setProgress(20);

      const mammothModule = await import("mammoth");
      const mammoth = mammothModule.default ?? mammothModule;
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      setProgress(50);

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      pdf.setFontSize(11);

      const lines = pdf.splitTextToSize(text, maxWidth);
      let y = margin;
      const maxY = pageHeight - margin;

      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > maxY) {
          pdf.addPage();
          y = margin;
        }

        pdf.text(lines[i], margin, y);
        y += lineHeight;
        setProgress(50 + (i / lines.length) * 40);
      }

      setProgress(95);

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage("Document converted to PDF!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to convert document");
      console.error("Conversion error:", err);
    }
  };

  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "document";

  return (
    <ToolPage
      title="Word to PDF"
      description="Convert Word documents to PDF format"
      icon={FileCode}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">
            Note: This tool extracts text content from Word documents. Complex formatting, images,
            and tables may not be perfectly preserved. For documents with complex layouts,
            consider using desktop software for best results.
          </p>
        </div>

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={convertToPDF}
            disabled={files.length === 0 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Converting..." : "Convert to PDF"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download={`${baseName}.pdf`}>
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