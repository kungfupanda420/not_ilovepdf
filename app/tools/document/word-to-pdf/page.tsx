"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FileCode, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";

export default function WordToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const [wvInstance, setWvInstance] = useState<any>(null);

  // Initialize PDFTron WebViewer headlessly on mount
  useEffect(() => {
    import("@pdftron/webviewer").then((WebViewer) => {
      if (viewerRef.current) {
        WebViewer.default(
          {
            path: "/webviewer/lib",
          },
          viewerRef.current
        ).then((instance) => {
          setWvInstance(instance);
        });
      }
    });
  }, []);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
  }, []);

const convertToPDF = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a Word document");
      return;
    }

    if (!wvInstance) {
      setStatus("error");
      setMessage("PDFTron engine is still loading. Please wait a moment.");
      return;
    }

    setStatus("processing");
    setProgress(20);
    setMessage("Processing DOCX via PDFTron...");

    try {
      const { Core } = wvInstance;

      // Use the dedicated headless Office-to-PDF method (it waits for rendering to finish)
      const pdfBuffer = await Core.officeToPDFBuffer(files[0], { extension: "docx" });
      setProgress(90);

      // Create download URL
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage("Document converted with formatting preserved!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to convert document");
    }
  };
  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "document";

  return (
    <ToolPage
      title="Word to PDF"
      description="Convert Word documents to PDF format natively in the browser"
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
            Note: This tool uses the Apryse (PDFTron) WebAssembly engine to perfectly preserve your DOCX layout entirely within your browser.
          </p>
        </div>

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={convertToPDF}
            disabled={files.length === 0 || status === "processing" || !wvInstance}
            className="flex-1"
          >
            {status === "processing" ? "Converting..." : "Convert to PDF"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download={`${baseName}.pdf`}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          )}
        </div>

        {/* Hidden div required to mount the headless PDFTron WebWorker */}
        <div 
          ref={viewerRef} 
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", visibility: "hidden" }} 
        />
      </div>
    </ToolPage>
  );
}