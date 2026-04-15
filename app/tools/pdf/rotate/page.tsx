"use client";

import { useState, useCallback } from "react";
import { RotateCw, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PDFDocument, degrees } from "pdf-lib";

export default function RotatePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<"90" | "180" | "270">("90");

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
  }, []);

  const rotatePDF = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a PDF file");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Rotating PDF...");

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      pages.forEach((page, index) => {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees(currentRotation + parseInt(rotation)));
        setProgress(((index + 1) / pages.length) * 90);
      });

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage(`Rotated ${pages.length} pages by ${rotation}°!`);
    } catch {
      setStatus("error");
      setMessage("Failed to rotate PDF. Please ensure the file is a valid PDF.");
    }
  };

  return (
    <ToolPage
      title="Rotate PDF"
      description="Rotate PDF pages by 90, 180, or 270 degrees"
      icon={RotateCw}
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
          <div className="rounded-lg border border-border p-4">
            <Label className="text-sm font-medium">Rotation angle (clockwise)</Label>
            <RadioGroup
              value={rotation}
              onValueChange={(v) => setRotation(v as typeof rotation)}
              className="mt-3 flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="90" id="r90" />
                <Label htmlFor="r90" className="font-normal">90°</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="180" id="r180" />
                <Label htmlFor="r180" className="font-normal">180°</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="270" id="r270" />
                <Label htmlFor="r270" className="font-normal">270°</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={rotatePDF}
            disabled={files.length === 0 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Rotating..." : "Rotate PDF"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download="rotated.pdf">
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
