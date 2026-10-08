import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { OraczenLogo } from "@/components/OraczenLogo";

export const metadata: Metadata = {
  title: "Extraction Workbench | Oraczen",
  description: "Human review tool for LLM-extracted customer support ticket records.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#0f1117] text-[#f3f4f6]">
      <body className="min-h-full flex flex-col font-sans antialiased bg-[#0f1117] text-[#f3f4f6]">
        <header className="sticky top-0 z-40 border-b border-[#262a36] bg-[#161922] px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <OraczenLogo />
              <span className="text-xs text-[#262a36]">|</span>
              <span className="text-xs font-medium text-[#94a3b8]">
                Extraction Workbench
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full bg-[#34d399]"></span>
            <span>API connected</span>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
