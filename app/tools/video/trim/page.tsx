"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Clock, Download, Loader2, Play, Pause } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFFmpeg } from "@/hooks/use-ffmpeg";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

export default function VideoTrimPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("00:00:00");
  const [endTime, setEndTime] = useState("00:00:00");
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { loaded, loading, progress, load, trimMedia } = useFFmpeg();

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setStatus("idle");
    setDownloadUrl(null);
    
    if (newFiles.length > 0) {
      const url = URL.createObjectURL(newFiles[0]);
      setVideoUrl(url);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setDownloadUrl(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setStartTime("00:00:00");
    setEndTime("00:00:00");
    setDuration(0);
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        const dur = video.duration;
        setDuration(dur);
        setEndTime(formatTime(dur));
      };
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, [videoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const setCurrentAsStart = () => {
    if (videoRef.current) {
      setStartTime(formatTime(videoRef.current.currentTime));
    }
  };

  const setCurrentAsEnd = () => {
    if (videoRef.current) {
      setEndTime(formatTime(videoRef.current.currentTime));
    }
  };

  const handleTrim = async () => {
    if (files.length === 0) {
      setStatus("error");
      setMessage("Please select a video file");
      return;
    }

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (end <= start) {
      setStatus("error");
      setMessage("End time must be greater than start time");
      return;
    }

    setStatus("processing");
    setMessage(loaded ? "Trimming video..." : "Loading FFmpeg...");

    try {
      if (!loaded) {
        await load();
        setMessage("Trimming video...");
      }

      const blob = await trimMedia(files[0], startTime, endTime, true);
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setStatus("complete");
      setMessage("Video trimmed successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to trim video");
    }
  };

  const baseName = files[0]?.name.replace(/\.[^/.]+$/, "") || "video";
  const extension = files[0]?.name.split(".").pop() || "mp4";

  return (
    <ToolPage
      title="Trim Video"
      description="Cut and trim video to specific duration"
      icon={Clock}
    >
      <div className="space-y-6">
        <FileDropzone
          accept="video/mp4,video/webm,video/x-msvideo,video/quicktime,.mp4,.webm,.avi,.mov,.mkv"
          multiple={false}
          onFilesSelected={handleFilesSelected}
          selectedFiles={files}
          onRemoveFile={handleRemoveFile}
        />

        {videoUrl && (
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-64 object-contain"
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Duration: <span className="font-medium text-foreground">{formatTime(duration)}</span>
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time (HH:MM:SS)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="startTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="00:00:00"
                    />
                    <Button variant="outline" size="sm" onClick={setCurrentAsStart}>
                      Set
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (HH:MM:SS)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="00:00:00"
                    />
                    <Button variant="outline" size="sm" onClick={setCurrentAsEnd}>
                      Set
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: Play the video and click &quot;Set&quot; to use the current position
              </p>
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
            onClick={handleTrim}
            disabled={files.length === 0 || status === "processing" || loading}
            className="flex-1"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {status === "processing" || loading ? "Trimming..." : "Trim Video"}
          </Button>

          {downloadUrl && (
            <Button asChild variant="secondary">
              <a href={downloadUrl} download={`${baseName}-trimmed.${extension}`}>
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
