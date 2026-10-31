import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "./workspace";

export const metadata: Metadata = {
  title: "Job workspace — CVPolish",
  description: "Match, rewrite, and export a CV for this job.",
};

// Next 16: `params` must be read inside <Suspense> so the route can be
// prerendered with a placeholder (see docs/blocking-prerender-runtime).
async function JobShell({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workspace jobId={id} />;
}

export default function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <JobShell params={params} />
    </Suspense>
  );
}
