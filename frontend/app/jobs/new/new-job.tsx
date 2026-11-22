"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createJob } from "@/lib/jobs-store";
import { errMsg } from "@/lib/api";
import { TopBar, BackLink } from "@/components/top-bar";

export function NewJob() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const canAnalyze = description.trim().length > 0;

  async function analyze() {
    if (!canAnalyze || busy) return;
    setBusy(true);
    try {
      // One call: AI generates the tailored CV + keyword list; a 503 (AI
      // down) throws → caught below, nothing was created server-side.
      const job = await createJob(description.trim());
      toast.success("AI tailored your CV", {
        description: "Summary and bullets rewritten for this job.",
      });
      router.push(`/jobs/${job.id}`);
    } catch (e) {
      toast.error("Couldn't create the CV", { description: errMsg(e) });
      setBusy(false);
    }
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
          One paste is enough — the AI tailors your profile into a CV for
          this job and scans it for missing keywords.
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
              Takes a few seconds — AI writes it, then you edit or print.
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
