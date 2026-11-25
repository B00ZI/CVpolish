"use client";

import { Check, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiProgressEvent } from "@/lib/types";
import { providerLabel } from "@/lib/use-ai-progress";

export function AiProgressList({
  events,
  className,
}: {
  events: AiProgressEvent[];
  className?: string;
}) {
  if (events.length === 0) return null;
  return (
    <div className={cn("space-y-1", className)} aria-live="polite">
      {events.slice(-4).map((e, i) => (
        <p
          key={`${e.provider}-${i}`}
          className="flex items-start gap-1.5 text-xs text-muted-foreground"
        >
          {e.status === "trying" ? (
            <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />
          ) : e.status === "ok" ? (
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
          ) : (
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
          )}
          <span>
            {e.status === "trying" ? "Trying " : e.status === "ok" ? "Used " : ""}
            <span className="font-medium text-foreground">
              {providerLabel(e.provider)}
            </span>
            {e.status === "failed" && e.reason ? ` — ${e.reason}` : ""}
          </span>
        </p>
      ))}
    </div>
  );
}
