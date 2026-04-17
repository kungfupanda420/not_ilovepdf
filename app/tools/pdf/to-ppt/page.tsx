'use client';

import { ToolPage } from "@/components/tool-page";
import { FileDropzone } from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/progress-indicator";
import { useState } from "react";
import { Download, Presentation } from "lucide-react";

export default function PDFToPPTPage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pptFile, setPptFile] = useState<Blob | null>(null);

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setProgress(0);

    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      const prs = new PptxGenJS();
      prs.defineLayout({ name: 'LAYOUT1', width: 13.333, height: 7.5 });

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        await page.render(renderContext).promise;

        const imgData = canvas.toDataURL("image/png");
        const slide = prs.addSlide();
        slide.addImage({
          data: imgData,
          x: 0,
          y: 0,
          w: "100%",
          h: "100%",
        });

        setProgress(Math.round((pageNum / totalPages) * 100));
      }

      const blob = await prs.toBlob();
      setPptFile(blob);
    } catch (error) {
      console.error("Conversion error:", error);
    } finally {
      setConverting(false);
    }
  };

  const downloadFile = () => {
    if (!pptFile) return;
    const url = URL.createObjectURL(pptFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name.replace(".pdf", ".pptx") || "presentation.pptx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPage
      title="PDF to PowerPoint"
      description="Convert PDF documents to PowerPoint presentations"
      icon={Presentation}
    >
      <div className="max-w-3xl">
        {!pptFile ? (
          <>
            <FileDropzone
              onFileSelect={setFile}
              accept=".pdf"
              label="Drop PDF file here"
            />

            {file && (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-sm">
                    <strong>Note:</strong> Each PDF page will be converted to a
                    slide image in PowerPoint. This preserves the visual layout.
                  </p>
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={converting}
                  className="w-full"
                >
                  {converting ? "Converting..." : "Convert to PowerPoint"}
                </Button>

                {converting && <ProgressIndicator progress={progress} />}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                ✓ Successfully converted PDF to PowerPoint presentation
              </p>
            </div>

            <Button onClick={downloadFile} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download PowerPoint
            </Button>

            <Button
              onClick={() => {
                setFile(null);
                setPptFile(null);
                setProgress(0);
              }}
              variant="outline"
              className="w-full"
            >
              Convert Another PDF
            </Button>
          </div>
        )}
      </div>
    </ToolPage>
  );
}
