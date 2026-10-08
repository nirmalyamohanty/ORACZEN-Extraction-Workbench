"use client";

import { Loader2 } from "lucide-react";

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
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#161922] border-t border-[#262a36] px-6 py-3 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#f3f4f6]">
            {selectedCount} of {totalTickets} selected
          </span>
        </div>

        <button
          type="button"
          disabled={selectedCount === 0 || isLoading}
          onClick={onStartExtraction}
          className="inline-flex items-center justify-center font-semibold text-sm px-4 py-2 rounded-md bg-[#3b82f6] text-white hover:bg-[#2563eb] disabled:bg-[#1e222f] disabled:text-[#64748b] disabled:cursor-not-allowed transition-colors cursor-pointer"
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
