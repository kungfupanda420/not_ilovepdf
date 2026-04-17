'use client';

import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/progress-indicator";
import { useState } from "react";
import Tesseract from "tesseract.js";
import { Copy, Download, Type } from "lucide-react";

export default function TextExtractorClient() {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    setProgress(0);
    setExtractedText("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = "";

      if (file.type === "application/pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
          setProgress(Math.round((pageNum / totalPages) * 100));
        }
      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        reader.onload = async () => {
          const result = await Tesseract.recognize(reader.result as string, "eng", {
            logger: (m) => {
              if (m.status === "recognizing text") {
                setProgress(Math.round(m.progress * 100));
              }
            },
          });

          const extracted = result.data.text;
          setExtractedText(extracted);
          setProgress(100);
          setExtracting(false);
        };

        reader.readAsDataURL(file);
        return;
      }

      setExtractedText(text);
      setProgress(100);
    } catch (error) {
      console.error("Extraction error:", error);
      setExtractedText("Error extracting text. Please try another file.");
    } finally {
      if (!file.type.startsWith("image/")) {
        setExtracting(false);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name.replace(/\.[^.]+$/, ".txt") || "extracted-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPage
      title="Text Extractor"
      description="Extract text from PDF files and images"
      icon={Type}
    >
      <div className="max-w-3xl">
        {!extractedText ? (
          <>
            <FileDropzone
              onFilesSelected={(files) => setFile(files[0] ?? null)}
              selectedFiles={file ? [file] : []}
              onRemoveFile={() => setFile(null)}
              accept=".pdf,image/*"
              label="Drop PDF or image file here"
            />

            {file && (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm">
                    File: <strong>{file.name}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.type === "application/pdf"
                      ? "PDF text extraction"
                      : "Image OCR (Optical Character Recognition)"}
                  </p>
                </div>

                <Button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="w-full"
                >
                  {extracting ? "Extracting..." : "Extract Text"}
                </Button>

                {extracting && (
                  <ProgressIndicator progress={progress} status="processing" />
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                ✓ Successfully extracted text
              </p>
            </div>

            <div className="rounded-lg border border-border p-4 bg-secondary/20">
              <textarea
                value={extractedText}
                readOnly
                className="w-full h-64 p-3 bg-background border border-border rounded resize-none font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button onClick={downloadText} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <Button
              onClick={() => {
                setFile(null);
                setExtractedText("");
                setProgress(0);
              }}
              variant="outline"
              className="w-full"
            >
              Extract From Another File
            </Button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
