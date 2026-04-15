"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  category: string;
}

export function ToolCard({ title, description, icon: Icon, href, category }: ToolCardProps) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
              <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </span>
              <h3 className="mt-1 font-semibold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
