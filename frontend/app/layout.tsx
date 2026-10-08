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
    // inline styles guarantee light mode background matches our warm Claude-style paper canvas (#fbf9f5)
    <html lang="en" data-color-scheme="light" style={{ colorScheme: "light", backgroundColor: "#fbf9f5", color: "#1c1917" }}>
      <body style={{ backgroundColor: "#fbf9f5", color: "#1c1917" }} className="min-h-full flex flex-col font-sans antialiased">

        {/* sticky navigation bar with subtle blur and clean border */}
        <header className="sticky top-0 z-40 border-b border-[#eae6de] bg-[#fbf9f5]/90 backdrop-blur-md px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">

            {/* logo is clickable and takes user back to dashboard */}
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-85 transition-opacity"
              title="Oraczen — home"
            >
              <OraczenLogo />
            </Link>

            <span className="text-[#d6d0c4] select-none text-xs">/</span>
            <span className="text-xs font-medium text-[#57534e] tracking-tight">
              Extraction Workbench
            </span>
          </div>

          {/* status indicator with clean green badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-[#eae6de] text-[11px] font-medium text-[#57534e]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#15803d]"></span>
              </span>
              <span>API connected</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
