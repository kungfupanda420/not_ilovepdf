"use client";

import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    if (loaded || loading) return ffmpegRef.current;

    setLoading(true);
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      // Load ffmpeg core
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      setLoaded(true);
      return ffmpeg;
    } catch (error) {
      console.error("Failed to load FFmpeg:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  const convertVideo = useCallback(
    async (
      inputFile: File,
      outputFormat: string,
      options?: { bitrate?: string }
    ): Promise<Blob> => {
      const ffmpeg = await load();
      if (!ffmpeg) throw new Error("FFmpeg not loaded");

      const inputName = "input" + inputFile.name.substring(inputFile.name.lastIndexOf("."));
      const outputName = `output.${outputFormat}`;

      await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

      const args = ["-i", inputName];
      
      if (options?.bitrate) {
        args.push("-b:v", options.bitrate);
      }
      
      // Add format-specific options
      if (outputFormat === "webm") {
        args.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
      } else if (outputFormat === "mp4") {
        args.push("-c:v", "libx264", "-c:a", "aac");
      }
      
      args.push(outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const mimeTypes: Record<string, string> = {
        mp4: "video/mp4",
        webm: "video/webm",
        avi: "video/x-msvideo",
        mov: "video/quicktime",
        mkv: "video/x-matroska",
      };

      return new Blob([data], { type: mimeTypes[outputFormat] || "video/mp4" });
    },
    [load]
  );

  const convertAudio = useCallback(
    async (
      inputFile: File,
      outputFormat: string,
      options?: { bitrate?: string }
    ): Promise<Blob> => {
      const ffmpeg = await load();
      if (!ffmpeg) throw new Error("FFmpeg not loaded");

      const inputName = "input" + inputFile.name.substring(inputFile.name.lastIndexOf("."));
      const outputName = `output.${outputFormat}`;

      await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

      const args = ["-i", inputName];
      
      if (options?.bitrate) {
        args.push("-b:a", options.bitrate);
      }
      
      args.push(outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        aac: "audio/aac",
      };

      return new Blob([data], { type: mimeTypes[outputFormat] || "audio/mpeg" });
    },
    [load]
  );

  const extractAudio = useCallback(
    async (inputFile: File, outputFormat: string = "mp3"): Promise<Blob> => {
      const ffmpeg = await load();
      if (!ffmpeg) throw new Error("FFmpeg not loaded");

      const inputName = "input" + inputFile.name.substring(inputFile.name.lastIndexOf("."));
      const outputName = `output.${outputFormat}`;

      await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

      await ffmpeg.exec(["-i", inputName, "-vn", "-acodec", outputFormat === "mp3" ? "libmp3lame" : "copy", outputName]);

      const data = await ffmpeg.readFile(outputName);
      const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
      };

      return new Blob([data], { type: mimeTypes[outputFormat] || "audio/mpeg" });
    },
    [load]
  );

  const trimMedia = useCallback(
    async (
      inputFile: File,
      startTime: string,
      endTime: string,
      isVideo: boolean
    ): Promise<Blob> => {
      const ffmpeg = await load();
      if (!ffmpeg) throw new Error("FFmpeg not loaded");

      const extension = inputFile.name.substring(inputFile.name.lastIndexOf(".") + 1);
      const inputName = `input.${extension}`;
      const outputName = `output.${extension}`;

      await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", startTime,
        "-to", endTime,
        "-c", "copy",
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      return new Blob([data], { type: inputFile.type });
    },
    [load]
  );

  return {
    loaded,
    loading,
    progress,
    load,
    convertVideo,
    convertAudio,
    extractAudio,
    trimMedia,
  };
}
