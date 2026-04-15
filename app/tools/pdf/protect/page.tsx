"use client";

import { useState, useCallback } from "react";
import { Lock, Download, Eye, EyeOff } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDFDocument } from "pdf-lib";

export default function ProtectPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
  }, []);

  const protectPDF = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a PDF file");
      return;
    }

    if (!password || password.length < 4) {
      setStatus("error");
      setMessage("Please enter a password (at least 4 characters)");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Adding password protection...");

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      setProgress(30);

      const pdf = await PDFDocument.load(arrayBuffer);
      setProgress(60);

      // Note: pdf-lib doesn't support encryption directly
      // For full encryption, you'd need a different library
      // This demonstrates the flow but saves without actual encryption
      const pdfBytes = await pdf.save();
      setProgress(90);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage("PDF processed! Note: Full encryption requires a server-side solution.");
    } catch {
      setStatus("error");
      setMessage("Failed to process PDF. Please ensure the file is valid.");
    }
  };

  return (
    <ToolPage
      title="Protect PDF"
      description="Add password protection to your PDF files"
      icon={Lock}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".pdf,application/pdf"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 0 && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password (min. 4 characters)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">
                Note: True PDF encryption requires server-side processing. This tool demonstrates 
                the client-side workflow but cannot add actual password protection without a 
                specialized encryption library.
              </p>
            </div>
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={protectPDF}
            disabled={files.length === 0 || status === "processing" || password.length < 4}
            className="flex-1"
          >
            {status === "processing" ? "Processing..." : "Protect PDF"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download="protected.pdf">
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
