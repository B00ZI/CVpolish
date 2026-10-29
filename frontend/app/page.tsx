import type { Metadata } from "next";
import { Home } from "./home";

export const metadata: Metadata = {
  title: "CVPolish",
  description: "Your tailored CVs — reopen, edit, or print one in seconds.",
};

export default function HomePage() {
  return <Home />;
}
