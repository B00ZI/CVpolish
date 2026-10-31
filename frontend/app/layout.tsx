import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CVPolish",
  description:
    "Polish your CV for any job — your master profile in, tailored CV out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // theme script may add .dark before hydration — expected mismatch
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Apply saved theme before paint (no flash). Plain inline script at
            the top of <body> keeps server/client trees identical.
            Keep in sync with components/theme-toggle.tsx */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("cvpolish.theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()',
          }}
        />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
