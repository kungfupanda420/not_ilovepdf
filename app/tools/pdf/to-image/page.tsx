'use client';

import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/progress-indicator";
import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Download, ImagePlus } from "lucide-react";

export default function PDFToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<Blob[]>([]);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(0.95);
  const [scale, setScale] = useState(2);

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setProgress(0);
    setImages([]);

    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        await page.render(renderContext).promise;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b!),
            `image/${format}`,
            format === "jpeg" ? quality : undefined
          );
        });

        convertedImages.push(blob);
        setProgress(Math.round((pageNum / totalPages) * 100));
      }

      setImages(convertedImages);
    } catch (error) {
      console.error("Conversion error:", error);
    } finally {
      setConverting(false);
    }
  };

  const downloadImage = (blob: Blob, index: number) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-${index + 1}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    images.forEach((blob, index) => {
      zip.file(`page-${index + 1}.${format}`, blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf-pages.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPage
      title="PDF to Image"
      description="Convert each PDF page to PNG, JPEG, or WebP images"
      icon={ImagePlus}
    >
      <div className="max-w-3xl">
        {!images.length ? (
          <>
            <FileDropzone
              onFileSelect={setFile}
              accept=".pdf"
              label="Drop PDF file here"
            />

            {file && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Image Format</label>
                  <div className="mt-2 flex gap-2">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`px-4 py-2 rounded border ${
                          format === fmt
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-foreground"
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
                    max="3"
                    step="0.5"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Higher values produce better quality but larger files
                  </p>
                </div>

                {format === "jpeg" && (
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
                  {converting ? "Converting..." : "Convert to Images"}
                </Button>

                {converting && <ProgressIndicator progress={progress} />}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-sm">
                Successfully converted <strong>{images.length}</strong> pages
              </p>
            </div>

            <div className="grid gap-4">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <span className="text-sm font-medium">
                    Page {index + 1} ({(img.size / 1024).toFixed(2)} KB)
                  </span>
                  <Button
                    onClick={() => downloadImage(img, index)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={downloadAll} className="w-full">
              Download All as ZIP
            </Button>

            <Button
              onClick={() => {
                setFile(null);
                setImages([]);
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
