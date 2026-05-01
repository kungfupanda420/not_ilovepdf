"use client";

import Link from "next/link";
import { Shield, Menu, X, Github } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">FileConvert</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="#pdf-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            PDF Tools
          </Link>
          <Link href="#image-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Images
          </Link>
          <Link href="#video-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Video & Audio
          </Link>
          <Link href="#document-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Documents
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="https://github.com/your-username/your-repo" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
          </Button>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
            
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">100% Private</span>
          </div>
          
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="icon" asChild>
            <Link href="https://github.com/kungfupanda420/not_ilovepdf" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col p-4 gap-2">
            <Link href="#pdf-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
              PDF Tools
            </Link>
            <Link href="#image-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
              Images
            </Link>
            <Link href="#video-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
              Video & Audio
            </Link>
            <Link href="#document-tools" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
              Documents
            </Link>
            <Link href="https://github.com/kungfupanda420/not_ilovepdf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
              <Github className="h-4 w-4" />
              GitHub Repository
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}