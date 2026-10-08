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
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#e2e2dd] px-6 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#1c1c1a]">
            {selectedCount} of {totalTickets} selected
          </span>
        </div>

        <button
          type="button"
          disabled={selectedCount === 0 || isLoading}
          onClick={onStartExtraction}
          className="inline-flex items-center justify-center font-semibold text-sm px-4 py-2 rounded-md bg-[#1f4fd8] text-white hover:bg-[#173eb0] disabled:bg-[#f3f4f6] disabled:text-[#9ca3af] disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-current mr-2" />
              <span>Creating job...</span>
            </>
          ) : (
            <span>Start extraction</span>
          )}
        </button>
      </div>
    </aside>
  );
}
