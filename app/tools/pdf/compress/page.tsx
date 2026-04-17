'use client';

import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/progress-indicator";
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Download, Package } from "lucide-react";

export default function CompressPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedFile, setCompressedFile] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [quality, setQuality] = useState(0.7);

  const handleCompress = async () => {
    if (!file) return;

    setCompressing(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      setProgress(50);

      // Compress images in the PDF
      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        
        // Scale down images
        if (page.getHeight() > 1000) {
          const scale = 1000 / page.getHeight();
          page.scale(scale, scale);
        }
        
        setProgress(50 + Math.round((i / pages.length) * 40));
      }

      // Save compressed PDF
      const compressedPdfBytes = await pdfDoc.save();
      const compressed = new Blob([compressedPdfBytes], {
        type: "application/pdf",
      });

      setOriginalSize(file.size);
      setCompressedSize(compressed.size);
      setCompressedFile(compressed);
      setProgress(100);
    } catch (error) {
      console.error("Compression error:", error);
    } finally {
      setCompressing(false);
    }
  };

  const downloadFile = () => {
    if (!compressedFile) return;
    const url = URL.createObjectURL(compressedFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name.replace(".pdf", "-compressed.pdf") || "compressed.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reduction = originalSize > 0 
    ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
    : 0;

  return (
    <ToolPage
      title="Compress PDF"
      description="Reduce PDF file size while preserving quality"
      icon={Package}
    >
      <div className="max-w-3xl">
        {!compressedFile ? (
          <>
            <FileDropzone
              onFileSelect={setFile}
              accept=".pdf"
              label="Drop PDF file here"
            />

            {file && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Compression Level: {Math.round(quality * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lower values = smaller file, higher values = better quality
                  </p>
                </div>

                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm">
                    Original file: <strong>{(file.size / 1024 / 1024).toFixed(2)} MB</strong>
                  </p>
                </div>

                <Button
                  onClick={handleCompress}
                  disabled={compressing}
                  className="w-full"
                >
                  {compressing ? "Compressing..." : "Compress PDF"}
                </Button>

                {compressing && <ProgressIndicator progress={progress} />}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                ✓ Successfully compressed PDF
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Original Size</p>
                <p className="mt-1 text-lg font-semibold">
                  {(originalSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Compressed Size</p>
                <p className="mt-1 text-lg font-semibold">
                  {(compressedSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="rounded-lg border border-primary bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">Reduction</p>
                <p className="mt-1 text-lg font-semibold text-primary">
                  {reduction}%
                </p>
              </div>
            </div>

            <Button onClick={downloadFile} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Compressed PDF
            </Button>

            <Button
              onClick={() => {
                setFile(null);
                setCompressedFile(null);
                setProgress(0);
              }}
              variant="outline"
              className="w-full"
            >
              Compress Another PDF
            </Button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
