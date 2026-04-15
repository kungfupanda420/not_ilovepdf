"use client";

import { useState, useCallback } from "react";
import { Minimize2, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function ImageCompressPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<{ url: string; name: string; originalSize: number; newSize: number }[]>([]);
  const [quality, setQuality] = useState([80]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setStatus("idle");
    setDownloadUrls([]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setDownloadUrls([]);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const compressImages = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select at least one image");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Compressing images...");
    setDownloadUrls([]);

    try {
      const results: { url: string; name: string; originalSize: number; newSize: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalSize = file.size;
        
        // Create an image element
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
          img.src = URL.createObjectURL(file);
        });

        // Create canvas and draw image
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(img, 0, 0);

        // Determine output format (use WebP for best compression, or keep original format for PNG)
        const isPng = file.type === "image/png";
        const outputFormat = isPng ? "image/png" : "image/jpeg";
        const qualityValue = quality[0] / 100;

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to compress image"));
            },
            outputFormat,
            qualityValue
          );
        });

        const url = URL.createObjectURL(blob);
        const extension = isPng ? "png" : "jpg";
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        
        results.push({
          url,
          name: `${baseName}-compressed.${extension}`,
          originalSize,
          newSize: blob.size,
        });

        URL.revokeObjectURL(img.src);
        setProgress(((i + 1) / files.length) * 100);
      }

      setDownloadUrls(results);
      setStatus("complete");
      
      const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
      const totalNew = results.reduce((sum, r) => sum + r.newSize, 0);
      const savings = Math.round((1 - totalNew / totalOriginal) * 100);
      
      setMessage(`Compressed ${files.length} image(s)! Saved ${savings}%`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to compress images");
    }
  };

  return (
    <ToolPage
      title="Compress Images"
      description="Reduce image file size while maintaining quality"
      icon={Minimize2}
    >
      <div className="space-y-6">
        <FileDropzone
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 0 && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Quality</Label>
                <span className="text-sm text-muted-foreground">{quality[0]}%</span>
              </div>
              <Slider
                value={quality}
                onValueChange={setQuality}
                min={10}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Lower quality = smaller file size. 70-85% is usually a good balance.
              </p>
            </div>
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <Button
          onClick={compressImages}
          disabled={files.length === 0 || status === "processing"}
          className="w-full"
        >
          {status === "processing" ? "Compressing..." : "Compress Images"}
        </Button>

        {downloadUrls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Download compressed images:</p>
            <div className="grid gap-2">
              {downloadUrls.map((item, index) => (
                <Button key={index} asChild variant="secondary" className="justify-between h-auto py-3">
                  <a href={item.url} download={item.name}>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">{item.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(item.originalSize)} → {formatSize(item.newSize)}
                      <span className="ml-1 text-green-600">
                        (-{Math.round((1 - item.newSize / item.originalSize) * 100)}%)
                      </span>
                    </span>
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
