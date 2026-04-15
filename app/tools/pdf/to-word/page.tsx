"use client";

import { useState, useCallback } from "react";
import { FileText, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import * as pdfjsLib from "pdfjs-dist";
import { Document, Packer, Paragraph, TextRun } from "docx";

// Set worker source to the local public copy
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function PDFToWordPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
  }, []);

  const convertToWord = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a PDF file");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Converting to Word...");

    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const paragraphs: Paragraph[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group text items by approximate y-position to maintain some structure
        const lines: { y: number; text: string }[] = [];
        let currentLine = { y: 0, text: "" };

        textContent.items.forEach((item) => {
          if ("str" in item && "transform" in item) {
            const y = Math.round(item.transform[5]);
            if (Math.abs(y - currentLine.y) > 5 && currentLine.text) {
              lines.push({ ...currentLine });
              currentLine = { y, text: item.str };
            } else {
              currentLine.y = y;
              currentLine.text += (currentLine.text ? " " : "") + item.str;
            }
          }
        });

        if (currentLine.text) {
          lines.push(currentLine);
        }

        // Add page header
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Page ${i}`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 400, after: 200 },
          })
        );

        // Add text lines
        lines.forEach((line) => {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.text,
                  size: 22,
                }),
              ],
              spacing: { after: 100 },
            })
          );
        });

        setProgress((i / numPages) * 80);
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      setProgress(90);
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);
      setStatus("complete");
      setMessage(`Converted ${numPages} pages to Word!`);
    } catch {
      setStatus("error");
      setMessage("Failed to convert PDF. Please ensure the file is a valid PDF.");
    }
  };

  return (
    <ToolPage
      title="PDF to Word"
      description="Convert PDF documents to editable Word files"
      icon={FileText}
    >
      <div className="space-y-6">
        <FileDropzone
          accept=".pdf,application/pdf"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs text-muted-foreground">
            Note: This tool extracts text content from PDFs. Complex formatting, images, and 
            tables may not be perfectly preserved. For best results, use PDFs with 
            simple text content.
          </p>
        </div>

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <div className="flex gap-3">
          <Button
            onClick={convertToWord}
            disabled={files.length === 0 || status === "processing"}
            className="flex-1"
          >
            {status === "processing" ? "Converting..." : "Convert to Word"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download="converted.docx">
                <Download className="h-4 w-4 mr-2" />
                Download .docx
              </a>
            </Button>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
