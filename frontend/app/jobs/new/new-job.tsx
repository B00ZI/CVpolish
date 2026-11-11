"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Job } from "@/lib/types";
import { loadProfile } from "@/lib/profile-store";
import { upsertJob } from "@/lib/jobs-store";
import { mockAnalyze, withDelay } from "@/mock";
import { TopBar, BackLink } from "@/components/top-bar";

export function NewJob() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const canAnalyze = description.trim().length > 0;

  async function analyze() {
    if (!canAnalyze || busy) return;
    setBusy(true);
    // Title = the first meaningful line of the JD (strip markdown headings).
    const firstLine =
      description
        .trim()
        .split("\n")
        .find((l) => l.trim()) ?? "";
    const title = firstLine.replace(/^#+\s*/, "").slice(0, 80);
    // The job owns its CV at creation time: the backend will generate it for
    // this JD (mock = a frozen copy of the profile); later profile edits never
    // touch it. cvFr starts null — French arrives via the translate button.
    const profile = loadProfile();
    const analysis = mockAnalyze({ title, description }, profile);
    const job: Job = {
      id: `job-${Date.now()}`,
      language: "en",
      title,
      company: "",
      description,
      createdAt: new Date().toISOString(),
      cv: profile,
      cvFr: null,
      analysis,
      aiUsed: false, // honest: mock froze the profile — real AI lands with the backend
    };
    await withDelay(null, 1400);
    upsertJob(job);
    toast.success("CV draft saved", {
      description: "Mock mode — AI tailoring arrives with the backend.",
    });
    router.push(`/jobs/${job.id}`);
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <TopBar left={<BackLink href="/">Your CVs</BackLink>} />

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <h1 className="text-2xl font-medium tracking-tight">
          Job description
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          One paste is enough — the title comes from the first line, and the
          CV is tailored from your profile.
        </p>

        <div className="mt-8 space-y-5 rounded-xl border border-border p-6">
          <Textarea
            rows={16}
            value={description}
            placeholder={`Paste the full job posting here — title, company, responsibilities, requirements, tech stack.\n\nExample:\nFrontend Developer (React / Next.js) — Remote\n\nAt Northbound Labs we build analytics tools for logistics teams. You'll own major product surfaces in React and TypeScript, style with Tailwind CSS, integrate REST/GraphQL APIs, and ship continuously through CI/CD on AWS.`}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">
              Saved to this browser — the backend comes later.
            </p>
            <Button onClick={analyze} disabled={!canAnalyze || busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-blue-600" />
              )}
              {busy ? "Generating CV…" : "Generate CV"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
