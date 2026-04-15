"use client";

import { useState, useCallback, useEffect } from "react";
import { Crop, Download, Link, Unlink } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImageResizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<{ url: string; name: string }[]>([]);
  
  const [resizeMode, setResizeMode] = useState<"dimensions" | "percentage">("dimensions");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [percentage, setPercentage] = useState("50");
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrls([]);

    if (newFiles.length > 0) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(newFiles[0]);
      await new Promise<void>((resolve) => {
        img.onload = () => {
          setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setWidth(String(img.naturalWidth));
          setHeight(String(img.naturalHeight));
          URL.revokeObjectURL(img.src);
          resolve();
        };
      });
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrls([]);
    setOriginalDimensions(null);
    setWidth("");
    setHeight("");
  }, []);

  useEffect(() => {
    if (maintainAspectRatio && originalDimensions && width) {
      const newWidth = parseInt(width, 10);
      if (!isNaN(newWidth)) {
        const ratio = originalDimensions.height / originalDimensions.width;
        setHeight(String(Math.round(newWidth * ratio)));
      }
    }
  }, [width, maintainAspectRatio, originalDimensions]);

  const resizeImages = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select an image");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Resizing image...");
    setDownloadUrls([]);

    try {
      const file = files[0];
      
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
        img.src = URL.createObjectURL(file);
      });

      let newWidth: number;
      let newHeight: number;

      if (resizeMode === "percentage") {
        const scale = parseInt(percentage, 10) / 100;
        newWidth = Math.round(img.naturalWidth * scale);
        newHeight = Math.round(img.naturalHeight * scale);
      } else {
        newWidth = parseInt(width, 10) || img.naturalWidth;
        newHeight = parseInt(height, 10) || img.naturalHeight;
      }

      setProgress(30);

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      setProgress(70);

      const outputFormat = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to resize image"));
          },
          outputFormat,
          0.92
        );
      });

      const url = URL.createObjectURL(blob);
      const extension = file.type === "image/png" ? "png" : "jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      setDownloadUrls([{
        url,
        name: `${baseName}-${newWidth}x${newHeight}.${extension}`,
      }]);

      URL.revokeObjectURL(img.src);
      setProgress(100);
      setStatus("complete");
      setMessage(`Resized to ${newWidth}x${newHeight}!`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to resize image");
    }
  };

  return (
    <ToolPage
      title="Resize Images"
      description="Change image dimensions and scale"
      icon={Crop}
    >
      <div className="space-y-6">
        <FileDropzone
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 0 && originalDimensions && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Original size: <span className="font-medium text-foreground">{originalDimensions.width} x {originalDimensions.height}</span>
            </p>

            <div className="space-y-2">
              <Label>Resize method</Label>
              <Select value={resizeMode} onValueChange={(v) => setResizeMode(v as typeof resizeMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dimensions">By dimensions</SelectItem>
                  <SelectItem value="percentage">By percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resizeMode === "percentage" ? (
              <div className="space-y-2">
                <Label htmlFor="percentage">Scale percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="percentage"
                    type="number"
                    min="1"
                    max="500"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  New size: {Math.round(originalDimensions.width * (parseInt(percentage) || 100) / 100)} x {Math.round(originalDimensions.height * (parseInt(percentage) || 100) / 100)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      min="1"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mb-0.5"
                    onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                    title={maintainAspectRatio ? "Unlink dimensions" : "Link dimensions"}
                  >
                    {maintainAspectRatio ? (
                      <Link className="h-4 w-4" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="height">Height (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      min="1"
                      value={height}
                      onChange={(e) => {
                        if (!maintainAspectRatio) setHeight(e.target.value);
                      }}
                      disabled={maintainAspectRatio}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {maintainAspectRatio ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                </p>
              </div>
            )}
          </div>
        )}

        {status !== "idle" && (
          <ProgressIndicator progress={progress} status={status} message={message} />
        )}

        <Button
          onClick={resizeImages}
          disabled={files.length === 0 || status === "processing"}
          className="w-full"
        >
          {status === "processing" ? "Resizing..." : "Resize Image"}
        </Button>

        {downloadUrls.length > 0 && (
          <div className="space-y-2">
            {downloadUrls.map((item, index) => (
              <Button key={index} asChild variant="secondary" className="w-full justify-start">
                <a href={item.url} download={item.name}>
                  <Download className="h-4 w-4 mr-2" />
                  {item.name}
                </a>
              </Button>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  );
}
