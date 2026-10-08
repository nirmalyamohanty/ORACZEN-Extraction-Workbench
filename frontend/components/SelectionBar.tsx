"use client";

import { Loader2, ArrowRight } from "lucide-react";

// floating action dock centered at the bottom of the screen
// only renders when items are selected or job is submitting to avoid screen clutter
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
  if (selectedCount === 0 && !isLoading) {
    return null;
  }

  return (
    <aside
      aria-label="Selection actions"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md border border-[#dfdbd0] shadow-xl rounded-full px-5 py-2.5 flex items-center gap-5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-2 text-xs text-[#57534e]">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#15803d] text-white font-mono font-semibold text-[11px]">
          {selectedCount}
        </span>
        <span>
          ticket{selectedCount === 1 ? "" : "s"} selected
        </span>
      </div>

      <div className="h-4 w-px bg-[#eae6de]" />

      <button
        type="button"
        disabled={selectedCount === 0 || isLoading}
        onClick={onStartExtraction}
        className="inline-flex items-center gap-1.5 font-medium text-xs px-4 py-1.5 rounded-full bg-[#15803d] text-white hover:bg-[#166534] active:scale-98 disabled:bg-[#e2ddd4] disabled:text-[#8c857b] disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
            <span>Processing batch...</span>
          </>
        ) : (
          <>
            <span>Start extraction</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </aside>
  );
}
