"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface ProgressIndicatorProps {
  progress: number;
  status?: "idle" | "processing" | "complete" | "error";
  message?: string;
}

export function ProgressIndicator({ progress, status = "processing", message }: ProgressIndicatorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {status === "processing" && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {status === "complete" && (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          {status === "error" && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span className={cn(
            "font-medium",
            status === "complete" && "text-green-600",
            status === "error" && "text-destructive"
          )}>
            {message || (status === "processing" ? "Processing..." : status === "complete" ? "Done!" : status === "error" ? "Error" : "Ready")}
          </span>
        </div>
        {status === "processing" && (
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        )}
      </div>
      
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            status === "processing" && "bg-primary",
            status === "complete" && "bg-green-600",
            status === "error" && "bg-destructive"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
