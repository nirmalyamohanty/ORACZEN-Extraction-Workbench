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
    <div className="border border-[#262a36] rounded-md bg-[#161922] overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-left font-medium text-[#f3f4f6] hover:bg-[#1e222f] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" />
          )}
          <span>Raw model output ({count} attempt{count !== 1 ? "s" : ""})</span>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[#262a36] space-y-3 bg-[#161922]">
          {rawOutputs.map((raw, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#94a3b8]">
                Attempt {idx + 1}
              </div>
              <pre className="p-2.5 bg-[#0d0f14] rounded-md border border-[#262a36] font-mono text-xs text-[#f3f4f6] overflow-x-auto max-h-60 whitespace-pre-wrap break-all leading-relaxed">
                {raw}
              </pre>
              {validationErrors[idx] && (
                <div className="text-xs text-[#f87171]">
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
