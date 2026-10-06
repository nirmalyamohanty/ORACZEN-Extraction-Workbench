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
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="min-h-full flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <span className="font-bold text-white text-base">O</span>
              </div>
              <div>
                <span className="font-semibold text-white tracking-tight text-base group-hover:text-indigo-400 transition-colors">
                  Oraczen
                </span>
                <span className="ml-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Extraction Workbench
                </span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              FastAPI backend connected
            </span>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
