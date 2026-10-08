"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { ItemStatus } from "@/lib/types";

// collapsible debug drawer showing the raw strings the AI model returned
// super useful when debugging prompt format bugs or pydantic parsing errors
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

  const shouldRender =
    attempts > 1 || status === "failed" || status === "needs_review";

  if (!shouldRender || !rawOutputs?.length) {
    return null;
  }

  const count = rawOutputs.length;

  return (
    <div className="border border-[#eae6de] rounded-lg bg-white overflow-hidden text-xs shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* clickable accordion header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-medium text-[#1c1917] hover:bg-[#fbf9f5] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#57534e]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#57534e]" />
          )}
          <Terminal className="w-3.5 h-3.5 text-[#8c857b]" />
          <span>Raw Model Output ({count} attempt{count !== 1 ? "s" : ""})</span>
        </div>
        <span className="text-[11px] font-mono text-[#8c857b]">
          {isOpen ? "collapse" : "inspect JSON"}
        </span>
      </button>

      {/* drawer content */}
      {isOpen && (
        <div className="p-3.5 border-t border-[#eae6de] space-y-3 bg-[#fbf9f5]">
          {rawOutputs.map((raw, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#57534e]">
                <span>Attempt {idx + 1}</span>
                {validationErrors[idx] && (
                  <span className="text-[#991b1b] font-mono text-[10px] bg-[#fee2e2] px-1.5 py-0.2 rounded border border-[#fecaca]">
                    Validation Failed
                  </span>
                )}
              </div>
              <pre className="p-3 bg-white rounded-md border border-[#eae6de] font-mono text-[11px] text-[#1c1917] overflow-x-auto max-h-60 whitespace-pre-wrap break-all leading-relaxed shadow-xs">
                {raw}
              </pre>
              {validationErrors[idx] && (
                <div className="text-xs text-[#991b1b] bg-[#fee2e2] p-2 rounded border border-[#fecaca]">
                  <span className="font-semibold">Validation Error: </span>
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
