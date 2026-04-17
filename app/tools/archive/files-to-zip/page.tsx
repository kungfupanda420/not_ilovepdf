'use client';

import { ToolPage } from "@/components/tool-page";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Download, Trash2, ZipIcon } from "lucide-react";

export default function FilesToZipPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles([...files, ...droppedFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles([...files, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const createZip = async () => {
    if (files.length === 0) return;

    setCreating(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        zip.file(file.name, arrayBuffer);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "archive.zip";
      a.click();
      URL.revokeObjectURL(url);

      setFiles([]);
    } catch (error) {
      console.error("ZIP creation error:", error);
    } finally {
      setCreating(false);
    }
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <ToolPage
      title="Files to ZIP"
      description="Compress multiple files into a ZIP archive"
      icon={ZipIcon}
    >
      <div className="max-w-3xl">
        {files.length === 0 ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-lg border-2 border-dashed border-border p-12 text-center hover:border-foreground transition-colors cursor-pointer"
          >
            <ZipIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Drop files here</h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to select files
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button asChild>
                <span>Select Files</span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/30 p-4">
              <p className="text-sm">
                <strong>{files.length}</strong> file(s) ready to compress
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total size: <strong>{(totalSize / 1024 / 1024).toFixed(2)} MB</strong>
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    onClick={() => removeFile(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={createZip} disabled={creating} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "Create ZIP"}
              </Button>
              <Button
                onClick={() => setFiles([])}
                variant="outline"
                className="flex-1"
              >
                Clear
              </Button>
            </div>

            <label htmlFor="file-input-2">
              <Button variant="outline" asChild className="w-full">
                <span>Add More Files</span>
              </Button>
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input-2"
            />
          </div>
        )}
      </div>
    </ToolPage>
  );
}
