"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

/** Shared app top bar — identical height, spacing and belt width on every
 *  page so navigating never makes the content jump around horizontally. */
export function TopBar({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">{left}</div>
        <div className="flex shrink-0 items-center gap-3">
          {right ?? <ThemeToggle />}
        </div>
      </div>
    </header>
  );
}

/** The standard back navigation entry, shared by profile / jobs pages. */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}
