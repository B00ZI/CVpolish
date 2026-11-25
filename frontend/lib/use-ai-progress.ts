"use client";

import { useEffect, useState } from "react";
import { getAiProgress } from "./jobs-store";
import type { AiProgressEvent } from "./types";

export function useAiProgress(requestId: string | null): AiProgressEvent[] {
  const [events, setEvents] = useState<AiProgressEvent[]>([]);

  useEffect(() => {
    if (!requestId) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await getAiProgress(requestId);
        if (alive) setEvents(r.events);
      } catch {
        setEvents([]);
      }
    };
    void tick();
    const timer = window.setInterval(tick, 600);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [requestId]);

  return events;
}

export function providerLabel(id: string): string {
  const names: Record<string, string> = {
    "gemini-lite": "Gemini flash-lite",
    "gemini-flash": "Gemini flash",
    "groq-120b": "Groq 120B",
    "groq-20b": "Groq 20B",
    "groq-qwen": "Groq Qwen",
    "gemini-flash2": "Gemini flash 2",
  };
  return names[id] ?? id;
}
