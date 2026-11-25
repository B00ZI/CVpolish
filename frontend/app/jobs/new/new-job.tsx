"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiRequestId, createJob } from "@/lib/jobs-store";
import { useAiProgress } from "@/lib/use-ai-progress";
import { AiProgressList } from "@/components/ai-progress";
import { ApiError, errMsg, isAbortError } from "@/lib/api";
import { TopBar, BackLink } from "@/components/top-bar";

/** Turn a failed generation into a specific, honest toast. The backend's
 *  503 detail says whether it was the AI; the status/timeout covers the
 *  cases where no useful detail exists. */
function generationError(e: unknown): { title: string; description: string } {
  if (isAbortError(e)) {
    return {
      title: "Generation timed out",
      description:
        "The AI didn't answer in time. Nothing was created — try again.",
    };
  }
  if (e instanceof ApiError) {
    if (e.status === 503) {
      const detail = e.message;
      const title = /timed out|timeout|deadline/i.test(detail)
        ? "Generation timed out"
        : /quota|rate limit/i.test(detail)
          ? "AI quota reached"
          : "AI is busy right now";
      return { title, description: detail };
    }
    if (e.status === 404) {
      return {
        title: "Add your profile first",
        description:
          "Every CV is generated from your profile, so it can't be empty.",
      };
    }
    if (e.status === 422) {
      return {
        title: "Check the job description",
        description: e.message,
      };
    }
    return { title: "Couldn't create the CV", description: e.message };
  }
  if (e instanceof TypeError) {
    return {
      title: "Can't reach the backend",
      description:
        "The API isn't responding. Check that the server is running, then try again.",
    };
  }
  return { title: "Couldn't create the CV", description: errMsg(e) };
}

export function NewJob() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const events = useAiProgress(requestId);

  const canAnalyze = description.trim().length > 0;

  async function analyze() {
    if (!canAnalyze || busy) return;
    setBusy(true);
    const id = aiRequestId();
    setRequestId(id);
    try {
      const job = await createJob(description.trim(), id);
      setRequestId(null);
      toast.success("AI tailored your CV", {
        description: "Summary and bullets rewritten for this job.",
      });
      router.push(`/jobs/${job.id}`);
    } catch (e) {
      setRequestId(null);
      const { title, description } = generationError(e);
      toast.error(title, { description });
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
              Free models can take a minute — each attempt shows below.
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
          <AiProgressList
            events={events}
            className="border-t border-border pt-4"
          />
        </div>
      </main>
    </div>
  );
}
