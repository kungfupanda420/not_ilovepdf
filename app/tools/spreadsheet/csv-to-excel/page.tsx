"use client";

import { useState, useCallback } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

export default function CSVToExcelPage() {
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

  const convertToExcel = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select at least one CSV file");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Converting to Excel...");

    try {
      const workbook = XLSX.utils.book_new();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        setProgress((i / files.length) * 50);

        // Parse CSV
        const worksheet = XLSX.read(text, { type: "string" }).Sheets.Sheet1;
        
        // Use filename (without extension) as sheet name
        const sheetName = file.name.replace(/\.[^/.]+$/, "").slice(0, 31); // Excel max 31 chars
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        setProgress(50 + (i / files.length) * 40);
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage(`Converted ${files.length} CSV file(s) to Excel!`);
    } catch {
      setStatus("error");
      setMessage("Failed to convert files. Please ensure they are valid CSV files.");
    }
  };

  return (
    <ToolPage
      title="CSV to Excel"
      description="Convert CSV files to Excel spreadsheets"
      icon={FileSpreadsheet}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".csv,text/csv"
          multiple
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 1 && (
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-sm text-muted-foreground">
              Multiple CSV files will be combined into one Excel workbook, with each file as a separate sheet.
            </p>
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={convertToExcel}
            disabled={files.length === 0 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Converting..." : "Convert to Excel"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download="converted.xlsx">
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
