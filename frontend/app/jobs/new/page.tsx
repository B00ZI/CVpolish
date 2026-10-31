import type { Metadata } from "next";
import { NewJob } from "./new-job";

export const metadata: Metadata = {
  title: "New CV — CVPolish",
  description: "Paste a job description to build a tailored CV.",
};

export default function NewJobPage() {
  return <NewJob />;
}
