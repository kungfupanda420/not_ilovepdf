'use client';

import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/progress-indicator";
import { useState } from "react";
import { Download, ImagePlus, CheckCircle2 } from "lucide-react";

export default function PDFToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(0.95);
  const [scale, setScale] = useState(2);

  const downloadSingleImage = (blob: Blob, index: number) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-${index + 1}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadZip = async (blobs: Blob[]) => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    blobs.forEach((blob, index) => {
      zip.file(`page-${index + 1}.${format}`, blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(".pdf", "")}-pages.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setProgress(0);
    setIsComplete(false);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const convertedImages: Blob[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b!),
            `image/${format}`,
            format === "jpeg" || format === "webp" ? quality : undefined
          );
        });

        convertedImages.push(blob);
        setProgress(Math.round((pageNum / totalPages) * 100));
      }

      // Automatically handle the download based on page count
      if (convertedImages.length === 1) {
        downloadSingleImage(convertedImages[0], 0);
      } else {
        await downloadZip(convertedImages);
      }

      setIsComplete(true);
    } catch (error) {
      console.error("Conversion error:", error);
    } finally {
      setConverting(false);
    }
  };

  return (
    <ToolPage
      title="PDF to Image"
      description="Convert PDF pages to PNG, JPEG, or WebP images"
      icon={ImagePlus}
    >
      <div className="max-w-3xl space-y-6">
        {!isComplete ? (
          <>
            <FileDropzone
              // Fix: Added proper onFilesSelected prop handling based on your previous components
              onFilesSelected={(files) => setFile(files[0])}
              accept=".pdf,application/pdf"
            />

            {file && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <div>
                  <label className="text-sm font-medium">Image Format</label>
                  <div className="mt-2 flex gap-2">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`px-4 py-2 rounded border text-sm ${format === fmt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-secondary"
                          }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Scale Factor: {scale}x
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.5"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>

                {(format === "jpeg" || format === "webp") && (
                  <div>
                    <label className="text-sm font-medium">
                      Quality: {Math.round(quality * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="mt-2 w-full"
                    />
                  </div>
                )}

                <Button
                  onClick={handleConvert}
                  disabled={converting}
                  className="w-full"
                >
                  {converting ? "Converting..." : "Convert & Download"}
                </Button>

                {converting && <ProgressIndicator progress={progress} />}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 rounded-lg border border-border p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium">Conversion Complete!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your file has been downloaded automatically.
            </p>
            <Button
              onClick={() => {
                setFile(null);
                setIsComplete(false);
                setProgress(0);
              }}
              variant="outline"
              className="w-full"
            >
              Convert Another PDF
            </Button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}