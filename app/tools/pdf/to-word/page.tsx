"use client";

import { useState, useCallback } from "react";
import { FileText, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Document, Packer, Paragraph, TextRun } from "docx";

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
      const pdfjsLib = await import(
        /* webpackIgnore: true */ 
        "https://unpkg.com/pdfjs-dist@5.6.205/build/pdf.min.mjs"
      );
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs";

      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        cMapUrl: "https://unpkg.com/pdfjs-dist@5.6.205/cmaps/",
        cMapPacked: true,
      }).promise;
      
      const numPages = pdf.numPages;
      const paragraphs: Paragraph[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // 1. Extract all text items with their precise X, Y coordinates
        const items = textContent.items
          .filter((item): item is any => "str" in item && "transform" in item)
          .map((item) => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5], 
            width: item.width,
          }));

        // 2. Sort items: Top-to-Bottom (Descending Y), then Left-to-Right (Ascending X)
        items.sort((a, b) => {
          // If items are on the roughly same horizontal line (within 5 pixels)
          if (Math.abs(a.y - b.y) <= 5) {
            return a.x - b.x; // Sort left to right
          }
          return b.y - a.y; // Sort top to bottom
        });

        // 3. Reconstruct the lines based on the sorted data
        const lines: string[] = [];
        let currentY: number | null = null;
        let currentLineText = "";
        let lastX = 0;
        let lastWidth = 0;

        for (const item of items) {
          // If this item is on a new line (Y dropped by more than 5 pixels)
          if (currentY === null || Math.abs(currentY - item.y) > 5) {
            if (currentLineText) lines.push(currentLineText.trim());
            currentY = item.y;
            currentLineText = item.text;
          } else {
            // Same line. Check if there's a physical gap between the last word and this one.
            const gap = item.x - (lastX + lastWidth);
            
            // If there's a visual gap, and neither string has a natural space, inject one.
            if (gap > 3 && !currentLineText.endsWith(" ") && !item.text.startsWith(" ")) {
              currentLineText += " " + item.text;
            } else {
              currentLineText += item.text;
            }
          }
          lastX = item.x;
          lastWidth = item.width || 0;
        }
        
        // Push the final line of the page
        if (currentLineText) {
          lines.push(currentLineText.trim());
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

        // Add the reconstructed text lines as paragraphs
        lines.forEach((line) => {
          if (!line) return; // Skip completely empty lines
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 22,
                }),
              ],
              spacing: { after: 120 }, // slight spacing between lines
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
    } catch (err) {
      console.error(err);
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