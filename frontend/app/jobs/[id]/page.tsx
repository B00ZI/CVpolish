import type { Metadata } from "next";
import { Workspace } from "./workspace";

export const metadata: Metadata = {
  title: "Job workspace — CVPolish",
  description: "Match, rewrite, and export a CV for this job.",
};

// This route reads `params` at request time; opting out of prerender
// validation avoids the "runtime data during prerendering" error
// (see docs/blocking-prerender-runtime).
export const instant = false;

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Workspace jobId={id} />;
}
