"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Presentation, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";

export default function PPTToPDFPage() {
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
            licenseKey: "demo:1779038188801:63064b510300000000e7e4f66a679118bc0230a37c0559c50060173b21"
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

  const handleConvert = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a PowerPoint file");
      return;
    }

    if (!wvInstance) {
      setStatus("error");
      setMessage("PDFTron engine is still loading. Please wait a moment.");
      return;
    }

    setStatus("processing");
    setProgress(20);
    setMessage("Processing Presentation via WebAssembly...");

    try {
      const { Core } = wvInstance;

      // Extract file extension to hint the engine (supports pptx and ppt)
      const ext = files[0].name.split('.').pop()?.toLowerCase() || 'pptx';

      // Use the dedicated headless Office-to-PDF method for perfect layout
      const pdfBuffer = await Core.officeToPDFBuffer(files[0], { extension: ext });
      setProgress(90);

      // Create download URL
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage("Presentation converted with perfect formatting!");
    } catch (err) {
      console.error("Conversion error:", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to convert presentation");
    }
  };

  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "presentation";

  return (
    <ToolPage
      title="PowerPoint to PDF"
      description="Convert PowerPoint presentations to PDF natively in the browser"
      icon={Presentation}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">
            Note: This tool uses the Apryse WebAssembly engine to perfectly preserve your PowerPoint layouts, master slides, and vector graphics entirely within your browser.
          </p>
        </div>

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleConvert}
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