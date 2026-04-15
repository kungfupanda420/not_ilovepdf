"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface ToolPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function ToolPage({ title, description, icon: Icon, children }: ToolPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all tools
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Icon className="h-7 w-7 text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-3">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Your files are processed locally and never uploaded to any server
        </span>
      </div>

      {children}
    </div>
  );
}
