'use client';

import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Download, Wand2, RotateCw } from "lucide-react";

export default function EditImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropWidth, setCropWidth] = useState(100);
  const [cropHeight, setCropHeight] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  useEffect(() => {
    if (preview && canvasRef.current) {
      applyEdits();
    }
  }, [preview, rotation, cropX, cropY, cropWidth, cropHeight, brightness, contrast, saturation]);

  const applyEdits = async () => {
    if (!preview || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Set canvas size based on crop dimensions
      canvas.width = (cropWidth / 100) * img.width;
      canvas.height = (cropHeight / 100) * img.height;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      const cropXPx = (cropX / 100) * img.width;
      const cropYPx = (cropY / 100) * img.height;
      const cropWPx = (cropWidth / 100) * img.width;
      const cropHPx = (cropHeight / 100) * img.height;

      ctx.drawImage(img, cropXPx, cropYPx, cropWPx, cropHPx, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Apply filters
      ctx.globalAlpha = 1;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Brightness
        data[i] = Math.min(255, (data[i] * brightness) / 100);
        data[i + 1] = Math.min(255, (data[i + 1] * brightness) / 100);
        data[i + 2] = Math.min(255, (data[i + 2] * brightness) / 100);

        // Contrast
        data[i] = Math.min(255, ((data[i] - 128) * (contrast / 100)) + 128);
        data[i + 1] = Math.min(255, ((data[i + 1] - 128) * (contrast / 100)) + 128);
        data[i + 2] = Math.min(255, ((data[i + 2] - 128) * (contrast / 100)) + 128);
      }

      ctx.putImageData(imageData, 0, 0);
    };

    img.src = preview;
  };

  const downloadImage = async () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file?.name || "edited-image.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const resetEdits = () => {
    setRotation(0);
    setCropX(0);
    setCropY(0);
    setCropWidth(100);
    setCropHeight(100);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  return (
    <ToolPage
      title="Edit Image"
      description="Crop, rotate, and adjust your images"
      icon={Wand2}
    >
      <div className="max-w-4xl">
        {!file ? (
          <FileDropzone
            onFileSelect={setFile}
            accept="image/*"
            label="Drop image file here"
          />
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-border overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-auto max-h-96 mx-auto"
              />
            </div>

            <div className="space-y-6 bg-secondary/30 p-6 rounded-lg">
              {/* Rotation */}
              <div>
                <label className="text-sm font-medium">Rotation: {rotation}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              {/* Crop */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Crop Width: {cropWidth}%</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={cropWidth}
                    onChange={(e) => setCropWidth(parseInt(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Crop Height: {cropHeight}%</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={cropHeight}
                    onChange={(e) => setCropHeight(parseInt(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>
              </div>

              {/* Brightness */}
              <div>
                <label className="text-sm font-medium">Brightness: {brightness}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <label className="text-sm font-medium">Contrast: {contrast}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              {/* Saturation */}
              <div>
                <label className="text-sm font-medium">Saturation: {saturation}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={resetEdits} variant="outline" className="flex-1">
                <RotateCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={downloadImage} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <Button
              onClick={() => {
                setFile(null);
                setPreview(null);
                resetEdits();
              }}
              variant="outline"
              className="w-full"
            >
              Edit Another Image
            </Button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
