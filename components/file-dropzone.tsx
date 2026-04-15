"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  maxSize?: number;
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
}

export function FileDropzone({
  accept,
  multiple = false,
  maxSize = 200 * 1024 * 1024, // 200MB default
  onFilesSelected,
  selectedFiles,
  onRemoveFile,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles: File[] = [];
      const acceptedTypes = accept.split(",").map((t) => t.trim());

      Array.from(files).forEach((file) => {
        if (file.size > maxSize) {
          setError(`File "${file.name}" exceeds the maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
          return;
        }

        const isValidType = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith("/*")) {
            return file.type.startsWith(type.replace("/*", ""));
          }
          return file.type === type;
        });

        if (!isValidType) {
          setError(`File "${file.name}" is not a supported format`);
          return;
        }

        validFiles.push(file);
      });

      return validFiles;
    },
    [accept, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const validFiles = validateFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        onFilesSelected(multiple ? validFiles : [validFiles[0]]);
      }
    },
    [validateFiles, onFilesSelected, multiple]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      if (e.target.files) {
        const validFiles = validateFiles(e.target.files);
        if (validFiles.length > 0) {
          onFilesSelected(multiple ? validFiles : [validFiles[0]]);
        }
      }
      e.target.value = "";
    },
    [validateFiles, onFilesSelected, multiple]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-secondary/50",
          selectedFiles.length > 0 && "border-solid border-border bg-secondary/30"
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Upload className={cn("h-10 w-10 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
        <p className="text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Click to upload</span> or drag and drop
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {accept.replace(/\./g, "").toUpperCase()} files up to {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onRemoveFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
