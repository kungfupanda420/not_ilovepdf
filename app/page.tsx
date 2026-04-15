"use client";

import { Header } from "@/components/header";
import { ToolCard } from "@/components/tool-card";
import { Shield, Zap, Globe } from "lucide-react";
import {
  FileText,
  FilePlus,
  Scissors,
  RotateCw,
  Lock,
  Type,
  FileSpreadsheet,
  Image as ImageIcon,
  Minimize2,
  Crop,
  Video,
  Music,
  AudioLines,
  Clock,
  Table,
  FileJson,
  FileCode,
} from "lucide-react";

const pdfTools = [
  {
    title: "Merge PDFs",
    description: "Combine multiple PDF files into a single document",
    icon: FilePlus,
    href: "/tools/pdf/merge",
    category: "PDF",
  },
  {
    title: "Split PDF",
    description: "Extract pages or split a PDF into multiple files",
    icon: Scissors,
    href: "/tools/pdf/split",
    category: "PDF",
  },
  {
    title: "Rotate PDF",
    description: "Rotate PDF pages by 90, 180, or 270 degrees",
    icon: RotateCw,
    href: "/tools/pdf/rotate",
    category: "PDF",
  },
  {
    title: "Protect PDF",
    description: "Add password protection to your PDF files",
    icon: Lock,
    href: "/tools/pdf/protect",
    category: "PDF",
  },
  {
    title: "PDF to Text",
    description: "Extract text content from PDF documents",
    icon: Type,
    href: "/tools/pdf/to-text",
    category: "PDF",
  },
  {
    title: "PDF to Word",
    description: "Convert PDF documents to editable Word files",
    icon: FileText,
    href: "/tools/pdf/to-word",
    category: "PDF",
  },
];

const imageTools = [
  {
    title: "Convert Images",
    description: "Convert between JPEG, PNG, WebP, AVIF formats",
    icon: ImageIcon,
    href: "/tools/image/convert",
    category: "Image",
  },
  {
    title: "Compress Images",
    description: "Reduce image file size while maintaining quality",
    icon: Minimize2,
    href: "/tools/image/compress",
    category: "Image",
  },
  {
    title: "Resize Images",
    description: "Change image dimensions and scale",
    icon: Crop,
    href: "/tools/image/resize",
    category: "Image",
  },
];

const videoTools = [
  {
    title: "Convert Video",
    description: "Convert between MP4, WebM, MOV, AVI formats",
    icon: Video,
    href: "/tools/video/convert",
    category: "Video",
  },
  {
    title: "Convert Audio",
    description: "Convert between MP3, WAV, OGG, M4A formats",
    icon: Music,
    href: "/tools/audio/convert",
    category: "Audio",
  },
  {
    title: "Extract Audio",
    description: "Extract audio track from video files",
    icon: AudioLines,
    href: "/tools/video/extract-audio",
    category: "Video",
  },
  {
    title: "Trim Video",
    description: "Cut and trim video to specific duration",
    icon: Clock,
    href: "/tools/video/trim",
    category: "Video",
  },
];

const documentTools = [
  {
    title: "Excel to CSV",
    description: "Convert Excel spreadsheets to CSV format",
    icon: Table,
    href: "/tools/spreadsheet/excel-to-csv",
    category: "Spreadsheet",
  },
  {
    title: "CSV to Excel",
    description: "Convert CSV files to Excel spreadsheets",
    icon: FileSpreadsheet,
    href: "/tools/spreadsheet/csv-to-excel",
    category: "Spreadsheet",
  },
  {
    title: "JSON to CSV",
    description: "Convert JSON data to CSV format",
    icon: FileJson,
    href: "/tools/data/json-to-csv",
    category: "Data",
  },
  {
    title: "Word to PDF",
    description: "Convert Word documents to PDF format",
    icon: FileCode,
    href: "/tools/document/word-to-pdf",
    category: "Document",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  100% Private - Files never leave your device
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-balance">
                Convert files privately in your browser
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-pretty">
                Free, fast, and completely private file conversion. All processing happens locally 
                using WebAssembly technology. Your files are never uploaded to any server.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-lg bg-secondary/50">
                <Shield className="h-8 w-8 mb-3 text-foreground" />
                <h3 className="font-semibold">100% Private</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Files stay on your device
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg bg-secondary/50">
                <Zap className="h-8 w-8 mb-3 text-foreground" />
                <h3 className="font-semibold">Fast Processing</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  WebAssembly powered speed
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg bg-secondary/50">
                <Globe className="h-8 w-8 mb-3 text-foreground" />
                <h3 className="font-semibold">Works Offline</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  No internet required
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PDF Tools */}
        <section id="pdf-tools" className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">PDF Tools</h2>
              <p className="mt-2 text-muted-foreground">
                Merge, split, rotate, and convert PDF files
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pdfTools.map((tool) => (
                <ToolCard key={tool.href} {...tool} />
              ))}
            </div>
          </div>
        </section>

        {/* Image Tools */}
        <section id="image-tools" className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">Image Tools</h2>
              <p className="mt-2 text-muted-foreground">
                Convert, compress, and resize images
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {imageTools.map((tool) => (
                <ToolCard key={tool.href} {...tool} />
              ))}
            </div>
          </div>
        </section>

        {/* Video & Audio Tools */}
        <section id="video-tools" className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">Video & Audio Tools</h2>
              <p className="mt-2 text-muted-foreground">
                Convert, extract, and trim media files
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videoTools.map((tool) => (
                <ToolCard key={tool.href} {...tool} />
              ))}
            </div>
          </div>
        </section>

        {/* Document & Spreadsheet Tools */}
        <section id="document-tools" className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">Document & Spreadsheet Tools</h2>
              <p className="mt-2 text-muted-foreground">
                Convert documents and spreadsheets between formats
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documentTools.map((tool) => (
                <ToolCard key={tool.href} {...tool} />
              ))}
            </div>
          </div>
        </section>

        {/* Limitations Notice */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl rounded-lg border border-border bg-secondary/30 p-6">
              <h3 className="font-semibold">A note on client-side conversion</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                While client-side conversion is private and convenient, it may not perfectly preserve 
                complex layouts compared to server-based tools. Performance also depends on your 
                device&apos;s CPU and memory. Large files (200MB+) may be slow on some devices.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Shield className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium">FileConvert</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Free, private file conversion. No uploads, no tracking.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
