"use client";

import { useState, useCallback } from "react";
import { Music, Download, Loader2 } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFFmpeg } from "@/hooks/use-ffmpeg";

const formatOptions = [
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "ogg", label: "OGG" },
  { value: "m4a", label: "M4A" },
];

export default function AudioConvertPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp3");

  const { loaded, loading, progress, load, convertAudio } = useFFmpeg();

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
  }, []);

  const handleConvert = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select an audio file");
      return;
    }

    setStatus("processing");
    setMessage(loaded ? "Converting audio..." : "Loading FFmpeg...");

    try {
      if (!loaded) {
        await load();
        setMessage("Converting audio...");
      }

      const blob = await convertAudio(files[0], outputFormat);
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setStatus("complete");
      setMessage("Audio converted successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to convert audio");
    }
  };

  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "audio";

  return (
    <ToolPage
      title="Convert Audio"
      description="Convert between MP3, WAV, OGG, M4A formats"
      icon={Music}
    >
      <div className="space-y-6">
        <FileDropzone
          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,.mp3,.wav,.ogg,.m4a,.aac"
          multiple={false}
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

        {(status !== "idle" || loading) && (
          <ProgressIndicator 
            progress={status === "processing" ? progress : status === "complete" ? 100 : 0} 
            status={loading ? "processing" : status} 
            message={message} 
          />
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleConvert}
            disabled={files.length === 0 || status === "processing" || loading}
            className="flex-1"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {status === "processing" || loading ? "Converting..." : "Convert Audio"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download={`${baseName}.${outputFormat}`}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>
    </ToolPage>
  );
}
