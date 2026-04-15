"use client";

import { useState, useCallback } from "react";
import { Table, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";

export default function ExcelToCSVPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<{ url: string; name: string }[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrls([]);
    setSheets([]);
    setSelectedSheet("");

    if (newFiles.length > 0) {
      try {
        const arrayBuffer = await newFiles[0].arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        setSheets(workbook.SheetNames);
        if (workbook.SheetNames.length > 0) {
          setSelectedSheet(workbook.SheetNames[0]);
        }
      } catch {
        // Ignore errors during preview
      }
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrls([]);
    setSheets([]);
    setSelectedSheet("");
  }, []);

  const convertToCSV = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select an Excel file");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Converting to CSV...");

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      setProgress(30);

      const workbook = XLSX.read(arrayBuffer);
      setProgress(60);

      const results: { url: string; name: string }[] = [];
      const baseName = files[0].name.replace(/\.[^/.]+$/, "");

      if (selectedSheet && selectedSheet !== "all") {
        // Convert single sheet
        const worksheet = workbook.Sheets[selectedSheet];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        results.push({
          url: URL.createObjectURL(blob),
          name: `${baseName}-${selectedSheet}.csv`,
        });
      } else {
        // Convert all sheets
        workbook.SheetNames.forEach((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          results.push({
            url: URL.createObjectURL(blob),
            name: `${baseName}-${sheetName}.csv`,
          });
          setProgress(60 + (index / workbook.SheetNames.length) * 30);
        });
      }

      setDownloadUrls(results);
      setProgress(100);
      setStatus("complete");
      setMessage(`Converted ${results.length} sheet(s) to CSV!`);
    } catch {
      setStatus("error");
      setMessage("Failed to convert file. Please ensure it is a valid Excel file.");
    }
  };

  return (
    <ToolPage
      title="Excel to CSV"
      description="Convert Excel spreadsheets to CSV format"
      icon={Table}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {sheets.length > 0 && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="space-y-2">
              <Label>Sheet to convert</Label>
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sheets</SelectItem>
                  {sheets.map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <Button
          onClick={convertToCSV}
          disabled={files.length === 0 || status === "processing"}
          className="w-full"
        >
          {status === "processing" ? "Converting..." : "Convert to CSV"}
        </Button>

        {downloadUrls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Download CSV files:</p>
            <div className="grid gap-2">
              {downloadUrls.map((item, index) => (
                <Button key={index} asChild variant="secondary" className="justify-start">
                  <a href={item.url} download={item.name}>
                    <Download className="h-4 w-4 mr-2" />
                    {item.name}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
