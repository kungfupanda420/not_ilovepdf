"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Crop, Download, Image as ImageIcon } from "lucide-react";
import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { ProgressIndicator } from "@/components/progress-indicator";
import { Button } from "@/components/ui/button";

type InteractionType = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null;

export default function ImageResizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [downloadUrls, setDownloadUrls] = useState<{ url: string; name: string }[]>([]);

  // Crop Box State (stored as percentages 0-100 for responsive scaling)
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [interacting, setInteracting] = useState<InteractionType>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startCrop = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const selected = newFiles[0];
    setFile(selected);
    setStatus("idle");
    setDownloadUrls([]);
    setCrop({ x: 10, y: 10, width: 80, height: 80 });

    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      imageObjRef.current = img;
    };
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setPreviewUrl("");
    setDownloadUrls([]);
    imageObjRef.current = null;
  }, []);

  // Global pointer events for smooth dragging even if the mouse leaves the box
  useEffect(() => {
    if (!interacting) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      
      // Prevent scrolling while dragging on mobile
      e.preventDefault(); 

      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate how far the mouse has moved as a percentage of the container
      const deltaX = ((e.clientX - startPos.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - startPos.current.y) / rect.height) * 100;

      let { x, y, width, height } = startCrop.current;

      if (interacting === "move") {
        x = Math.max(0, Math.min(100 - width, x + deltaX));
        y = Math.max(0, Math.min(100 - height, y + deltaY));
      } else {
        // Handle resizing based on which edge/corner is being dragged
        if (interacting.includes("e")) {
          width = Math.min(100 - x, width + deltaX);
        }
        if (interacting.includes("s")) {
          height = Math.min(100 - y, height + deltaY);
        }
        if (interacting.includes("w")) {
          const maxDelta = width;
          const actualDelta = Math.max(-x, Math.min(maxDelta - 5, deltaX));
          x += actualDelta;
          width -= actualDelta;
        }
        if (interacting.includes("n")) {
          const maxDelta = height;
          const actualDelta = Math.max(-y, Math.min(maxDelta - 5, deltaY));
          y += actualDelta;
          height -= actualDelta;
        }
      }

      // Ensure a minimum size of 5% so the box doesn't collapse on itself
      setCrop({ 
        x, 
        y, 
        width: Math.max(5, width), 
        height: Math.max(5, height) 
      });
    };

    const handlePointerUp = () => setInteracting(null);

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [interacting]);

  const handlePointerDown = (e: React.PointerEvent, action: InteractionType) => {
    e.stopPropagation();
    setInteracting(action);
    startPos.current = { x: e.clientX, y: e.clientY };
    startCrop.current = { ...crop };
  };

  const executeCrop = async () => {
    if (!file || !imageObjRef.current) return;

    setStatus("processing");
    setDownloadUrls([]);

    try {
      const img = imageObjRef.current;
      const canvas = document.createElement("canvas");
      
      // Calculate exact pixel dimensions based on the percentage crop box
      const sx = (crop.x / 100) * img.naturalWidth;
      const sy = (crop.y / 100) * img.naturalHeight;
      const sw = (crop.width / 100) * img.naturalWidth;
      const sh = (crop.height / 100) * img.naturalHeight;

      canvas.width = sw;
      canvas.height = sh;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const outputFormat = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error("Failed to crop")),
          outputFormat,
          0.95
        );
      });

      const url = URL.createObjectURL(blob);
      const extension = file.type === "image/png" ? "png" : "jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      setDownloadUrls([{ url, name: `${baseName}-cropped.${extension}` }]);
      setStatus("complete");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  // Helper component for the drag handles
  const Handle = ({ position, cursor, action }: { position: string, cursor: string, action: InteractionType }) => (
    <div
      onPointerDown={(e) => handlePointerDown(e, action)}
      className={`absolute w-4 h-4 bg-primary border-2 border-white rounded-full shadow-sm z-20 ${position}`}
      style={{ cursor }}
    />
  );

  return (
    <ToolPage
      title="Image Resize & Crop"
      description="Drag the edges to visually crop and resize your image"
      icon={Crop}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {!previewUrl ? (
          <FileDropzone
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple={false}
            onFilesSelected={handleFilesSelected}
            selectedFiles={file ? [file] : []}
            onRemoveFile={handleRemoveFile}
          />
        ) : (
          <div className="space-y-6">
            
            {/* The Interactive Workspace */}
            <div className="bg-muted/30 p-4 md:p-8 rounded-xl border border-border flex justify-center items-center select-none overflow-hidden touch-none">
              <div 
                ref={containerRef}
                className="relative max-w-full max-h-[60vh] inline-block shadow-md rounded-md overflow-hidden"
              >
                {/* Base Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Workspace"
                  className="block max-w-full max-h-[60vh] object-contain pointer-events-none"
                  draggable={false}
                />

                {/* Cropping Box Overlay */}
                <div
                  className="absolute border-2 border-white/80 z-10 touch-none outline outline-[9999px] outline-black/60"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                    cursor: interacting ? "grabbing" : "grab",
                  }}
                  onPointerDown={(e) => handlePointerDown(e, "move")}
                >
                  {/* Grid Lines for visual aid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div className="" />
                  </div>

                  {/* 4 Corner Handles */}
                  <Handle position="-top-2 -left-2" cursor="nwse-resize" action="nw" />
                  <Handle position="-top-2 -right-2" cursor="nesw-resize" action="ne" />
                  <Handle position="-bottom-2 -left-2" cursor="nesw-resize" action="sw" />
                  <Handle position="-bottom-2 -right-2" cursor="nwse-resize" action="se" />

                  {/* 4 Edge Handles */}
                  <Handle position="-top-2 left-1/2 -translate-x-1/2" cursor="ns-resize" action="n" />
                  <Handle position="-bottom-2 left-1/2 -translate-x-1/2" cursor="ns-resize" action="s" />
                  <Handle position="top-1/2 -left-2 -translate-y-1/2" cursor="ew-resize" action="w" />
                  <Handle position="top-1/2 -right-2 -translate-y-1/2" cursor="ew-resize" action="e" />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex-1 w-full text-center md:text-left text-sm text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                <ImageIcon className="w-4 h-4" />
                <span>Drag the box or edges to frame your perfect crop.</span>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <Button variant="outline" onClick={handleRemoveFile} className="flex-1 md:flex-none">
                  Cancel
                </Button>
                <Button 
                  onClick={executeCrop} 
                  disabled={status === "processing"}
                  className="flex-1 md:flex-none"
                >
                  <Crop className="w-4 h-4 mr-2" />
                  {status === "processing" ? "Processing..." : "Crop & Save"}
                </Button>
              </div>
            </div>

            {status !== "idle" && status !== "complete" && (
              <ProgressIndicator progress={50} status={status} />
            )}

            {downloadUrls.length > 0 && (
              <div className="pt-2 animate-in fade-in slide-in-from-bottom-2">
                {downloadUrls.map((item, index) => (
                  <Button key={index} asChild variant="default" className="w-full text-lg py-6 shadow-md">
                    <a href={item.url} download={item.name}>
                      <Download className="h-5 w-5 mr-2" />
                      Download Final Image
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  );
}