"use client";

import { useState, useCallback } from "react";
import { FileJson, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenObject(obj: any, prefix = ""): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

export default function JSONToCSVPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);

    if (newFiles.length > 0) {
      try {
        const text = await newFiles[0].text();
        const json = JSON.parse(text);
        const previewText = JSON.stringify(json, null, 2).slice(0, 500);
        setPreview(previewText + (previewText.length >= 500 ? "..." : ""));
      } catch {
        setPreview("Invalid JSON");
      }
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
    setPreview("");
  }, []);

  const convertToCSV = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a JSON file");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Converting to CSV...");

    try {
      const text = await files[0].text();
      setProgress(20);

      const json = JSON.parse(text);
      setProgress(40);

      // Handle both array of objects and single object
      let data: object[];
      if (Array.isArray(json)) {
        data = json.map((item) => (typeof item === "object" ? flattenObject(item) : { value: item }));
      } else if (typeof json === "object") {
        data = [flattenObject(json)];
      } else {
        throw new Error("JSON must be an object or array of objects");
      }

      setProgress(60);

      // Create worksheet from JSON data
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      setProgress(80);

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage(`Converted ${data.length} record(s) to CSV!`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to convert JSON. Please ensure it is valid.");
    }
  };

  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "data";

  return (
    <ToolPage
      title="JSON to CSV"
      description="Convert JSON data to CSV format"
      icon={FileJson}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".json,application/json"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {preview && (
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-sm font-medium">JSON Preview</p>
            <pre className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded overflow-x-auto max-h-32">
              {preview}
            </pre>
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={convertToCSV}
            disabled={files.length === 0 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Converting..." : "Convert to CSV"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download={`${baseName}.csv`}>
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
