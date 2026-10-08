import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="en" className="h-full bg-[#f7f7f5] text-[#1c1c1a]">
      <body className="min-h-full flex flex-col font-sans antialiased">
        <header className="sticky top-0 z-40 border-b border-[#e2e2dd] bg-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-semibold text-[#1c1c1a] text-sm">
                Oraczen
              </span>
              <span className="text-sm text-[#6b6b66]">
                Extraction Workbench
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6b6b66]">
            <span className="w-2 h-2 rounded-full bg-[#166534]"></span>
            <span>API connected</span>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
