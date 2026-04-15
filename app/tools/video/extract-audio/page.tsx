"use client";

import { useState, useCallback } from "react";
import { AudioLines, Download, Loader2 } from "lucide-react";
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
  { value: "m4a", label: "M4A" },
];

export default function ExtractAudioPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp3");

  const { loaded, loading, progress, load, extractAudio } = useFFmpeg();

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
  }, []);

  const handleExtract = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a video file");
      return;
    }

    setStatus("processing");
    setMessage(loaded ? "Extracting audio..." : "Loading FFmpeg...");

    try {
      if (!loaded) {
        await load();
        setMessage("Extracting audio...");
      }

      const blob = await extractAudio(files[0], outputFormat);
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setStatus("complete");
      setMessage("Audio extracted successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to extract audio");
    }
  };

  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "audio";

  return (
    <ToolPage
      title="Extract Audio"
      description="Extract audio track from video files"
      icon={AudioLines}
    >
      <div className="space-y-6">
        <FileDropzone
          accept="video/mp4,video/webm,video/x-msvideo,video/quicktime,.mp4,.webm,.avi,.mov,.mkv"
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
            onClick={handleExtract}
            disabled={files.length === 0 || status === "processing" || loading}
            className="flex-1"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {status === "processing" || loading ? "Extracting..." : "Extract Audio"}
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
