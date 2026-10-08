"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ItemStatus } from "@/lib/types";

interface RawOutputPanelProps {
  rawOutputs: string[];
  validationErrors: string[];
  status?: ItemStatus;
  attempts?: number;
}

export function RawOutputPanel({
  rawOutputs,
  validationErrors,
  status,
  attempts = 1,
}: RawOutputPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Render ONLY if attempts > 1, failed, or needs_review
  const shouldRender =
    attempts > 1 || status === "failed" || status === "needs_review";

  if (!shouldRender || !rawOutputs?.length) {
    return null;
  }

  const count = rawOutputs.length;

  return (
    <div className="border border-[#e2e2dd] rounded-md bg-white overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left font-medium text-[#1c1c1a] hover:bg-[#f7f7f5] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#6b6b66]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#6b6b66]" />
          )}
          <span>Raw model output ({count} attempt{count !== 1 ? "s" : ""})</span>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[#e2e2dd] space-y-3 bg-[#ffffff]">
          {rawOutputs.map((raw, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#6b6b66]">
                Attempt {idx + 1}
              </div>
              <pre className="p-2.5 bg-[#f7f7f5] rounded-md border border-[#e2e2dd] font-mono text-xs text-[#1c1c1a] overflow-x-auto max-h-60 whitespace-pre-wrap break-all leading-relaxed">
                {raw}
              </pre>
              {validationErrors[idx] && (
                <div className="text-xs text-[#b91c1c]">
                  <span className="font-semibold">Validation error: </span>
                  {validationErrors[idx]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
