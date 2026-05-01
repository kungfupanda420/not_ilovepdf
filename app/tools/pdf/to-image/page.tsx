'use client';

import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/progress-indicator";
import { useState } from "react";
import { Download, ImagePlus, CheckCircle2, CheckSquare, Square } from "lucide-react";

export default function PDFToImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  
  // Preview & Selection State
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  
  // Conversion State
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(0.95);
  const [scale, setScale] = useState(2);

  const handleFileSelect = async (files: File[]) => {
  const selectedFile = files[0];
  if (!selectedFile) return;

  setFile(selectedFile);
  setLoadingPreviews(true);
  setPreviews([]);
  setSelectedPages([]);

  try {
    const pdfjsModule = await import(
      /* webpackIgnore: true */
      "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"
    ) as any;

    // UMD bundle lands on .default when dynamically imported in Next.js
    const pdfjsLib = (window as any).pdfjsLib || pdfjsModule.default || pdfjsModule;

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
    }).promise;

    setPdfDoc(pdf);

    const totalPages = pdf.numPages;
    const newPreviews: string[] = [];
    const initialSelected: number[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.3 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport }).promise;

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      newPreviews.push(canvas.toDataURL("image/jpeg", 0.6));
      initialSelected.push(i);

      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }

    setPreviews(newPreviews);
    setSelectedPages(initialSelected);
  } catch (error) {
    console.error("Preview error:", error);
  } finally {
    setLoadingPreviews(false);
  }
};

  
  const toggleSelection = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const downloadSingleImage = (blob: Blob, pageNum: number) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-${pageNum}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadZip = async (blobs: { blob: Blob; pageNum: number }[]) => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    blobs.forEach(({ blob, pageNum }) => {
      zip.file(`page-${pageNum}.${format}`, blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(".pdf", "")}-selected-pages.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConvert = async () => {
    if (!pdfDoc || selectedPages.length === 0) return;

    setConverting(true);
    setProgress(0);

    try {
      const convertedImages: { blob: Blob; pageNum: number }[] = [];
      const total = selectedPages.length;

      for (let i = 0; i < total; i++) {
        const pageNum = selectedPages[i];
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false })!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        await new Promise((resolve) => setTimeout(resolve, 50)); // Prevent browser hang

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b!),
            `image/${format}`,
            format === "png" ? undefined : quality
          );
        });

        convertedImages.push({ blob, pageNum });
        setProgress(Math.round(((i + 1) / total) * 100));
        
        canvas.width = 0;
        canvas.height = 0;
      }

      if (convertedImages.length === 1) {
        downloadSingleImage(convertedImages[0].blob, convertedImages[0].pageNum);
      } else {
        await downloadZip(convertedImages);
      }
    } catch (error) {
      console.error("Conversion error:", error);
    } finally {
      setConverting(false);
      setProgress(0);
    }
  };

  return (
    <ToolPage
      title="PDF to Image"
      description="Select specific pages to convert and download"
      icon={ImagePlus}
    >
      <div className="w-full">
        {!file ? (
          <div className="max-w-2xl mx-auto">
            <FileDropzone
              onFilesSelected={handleFileSelect}
              accept=".pdf,application/pdf"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Controls */}
            <div className="lg:col-span-4 space-y-6 sticky top-8">
              <div className="space-y-4 rounded-lg border border-border p-4 bg-card">
                <h3 className="font-semibold text-lg border-b pb-2">Settings</h3>
                
                <div>
                  <label className="text-sm font-medium">Image Format</label>
                  <div className="mt-2 flex gap-2">
                    {(["png", "jpeg", "webp"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`flex-1 py-2 rounded border text-sm transition-colors ${
                          format === fmt
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
                  <label className="text-sm font-medium flex justify-between">
                    <span>Scale Factor</span>
                    <span className="text-muted-foreground">{scale}x</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.5"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="mt-2 w-full cursor-pointer"
                  />
                </div>

                {(format === "jpeg" || format === "webp") && (
                  <div>
                    <label className="text-sm font-medium flex justify-between">
                      <span>Quality</span>
                      <span className="text-muted-foreground">{Math.round(quality * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="mt-2 w-full cursor-pointer"
                    />
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span>Selected Pages:</span>
                    <span className="font-semibold">{selectedPages.length} / {previews.length}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={() => setSelectedPages(previews.map((_, i) => i + 1))}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={() => setSelectedPages([])}
                    >
                      Clear All
                    </Button>
                  </div>

                  <Button
                    onClick={handleConvert}
                    disabled={converting || selectedPages.length === 0 || loadingPreviews}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {converting ? "Converting..." : `Download Selected`}
                  </Button>

                  {converting && <ProgressIndicator progress={progress} />}
                </div>

                <Button
                  onClick={() => {
                    setFile(null);
                    setPdfDoc(null);
                    setPreviews([]);
                  }}
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  Cancel & Choose New File
                </Button>
              </div>
            </div>

            {/* Right Column: Scrollable Previews */}
            <div className="lg:col-span-8">
              {loadingPreviews ? (
                <div className="h-[60vh] flex flex-col items-center justify-center border rounded-lg bg-muted/10 border-dashed">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Scanning pages...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto pr-2 max-h-[85vh] p-2">
                  {previews.map((previewData, index) => {
                    const pageNum = index + 1;
                    const isSelected = selectedPages.includes(pageNum);
                    
                    return (
                      <div 
                        key={pageNum}
                        onClick={() => toggleSelection(pageNum)}
                        className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          isSelected ? "border-primary shadow-md" : "border-transparent hover:border-border shadow-sm"
                        }`}
                      >
                        <div className="aspect-[1/1.4] bg-muted/20 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={previewData} 
                            alt={`Page ${pageNum}`}
                            className={`w-full h-full object-contain transition-opacity ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}
                          />
                        </div>
                        
                        <div className={`absolute top-2 left-2 p-1 rounded-md transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground group-hover:text-foreground"}`}>
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </div>
                        
                        <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur-sm p-2 text-center text-xs font-medium border-t">
                          Page {pageNum}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}