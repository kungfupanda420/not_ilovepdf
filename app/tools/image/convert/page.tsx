"use client";

import { useState, useCallback } from "react";
import { Image as ImageIcon, Download } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatOptions = [
  { value: "image/jpeg", label: "JPEG", extension: "jpg" },
  { value: "image/png", label: "PNG", extension: "png" },
  { value: "image/webp", label: "WebP", extension: "webp" },
];

export default function ImageConvertPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrls, setDownloadUrls] = useState<{ url: string; name: string }[]>([]);
  const [outputFormat, setOutputFormat] = useState("image/webp");

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setStatus("idle");
    setDownloadUrls([]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setDownloadUrls([]);
  }, []);

  const convertImages = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select at least one image");
      return;
    }

    setStatus("processing");
    setProgress(0);
    setMessage("Converting images...");
    setDownloadUrls([]);

    try {
      const selectedFormat = formatOptions.find((f) => f.value === outputFormat);
      const results: { url: string; name: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
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

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to convert image"));
            },
            outputFormat,
            0.92
          );
        });

        const url = URL.createObjectURL(blob);
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        results.push({
          url,
          name: `${baseName}.${selectedFormat?.extension || "webp"}`,
        });

        URL.revokeObjectURL(img.src);
        setProgress(((i + 1) / files.length) * 100);
      }

      setDownloadUrls(results);
      setStatus("complete");
      setMessage(`Converted ${files.length} image(s) to ${selectedFormat?.label}!`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to convert images");
    }
  };

  return (
    <ToolPage
      title="Convert Images"
      description="Convert between JPEG, PNG, WebP, and AVIF formats"
      icon={ImageIcon}
    >
      <div className="space-y-6">
        <FileDropzone
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          multiple
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {files.length > 0 && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
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
          onClick={convertImages}
          disabled={files.length === 0 || status === "processing"}
          className="w-full"
        >
          {status === "processing" ? "Converting..." : "Convert Images"}
        </Button>

        {downloadUrls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Download converted images:</p>
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
