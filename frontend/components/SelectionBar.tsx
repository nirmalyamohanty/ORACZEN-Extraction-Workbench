"use client";

import { Play, Loader2 } from "lucide-react";

interface SelectionBarProps {
  selectedCount: number;
  totalTickets: number;
  onStartExtraction: () => void;
  isLoading: boolean;
}

export function SelectionBar({
  selectedCount,
  totalTickets,
  onStartExtraction,
  isLoading,
}: SelectionBarProps) {
  return (
    <aside
      aria-label="Selection actions"
      className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-6 py-3.5 shadow-2xl transition-all duration-200"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium text-xs">
            {selectedCount} of {totalTickets} tickets selected
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Selected tickets will be queued for LLM extraction and review
          </span>
        </div>

        <button
          type="button"
          disabled={selectedCount === 0 || isLoading}
          onClick={onStartExtraction}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Creating job...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Start extraction ({selectedCount})</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
