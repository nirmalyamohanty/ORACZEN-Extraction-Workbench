"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal, AlertTriangle } from "lucide-react";

interface RawOutputPanelProps {
  rawOutputs: string[];
  validationErrors: string[];
}

export function RawOutputPanel({
  rawOutputs,
  validationErrors,
}: RawOutputPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!rawOutputs?.length && !validationErrors?.length) {
    return null;
  }

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span>What the model returned and why it failed</span>
          <span className="text-[11px] font-normal text-slate-500">
            ({rawOutputs.length} attempt{rawOutputs.length !== 1 ? "s" : ""})
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-950/70 text-xs font-mono">
          {rawOutputs.map((raw, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold font-sans">
                <span>Attempt {idx + 1} Raw Output:</span>
                {validationErrors[idx] && (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Failed validation
                  </span>
                )}
              </div>
              <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 overflow-x-auto text-slate-300 leading-relaxed max-h-48 whitespace-pre-wrap break-all">
                {raw}
              </pre>
              {validationErrors[idx] && (
                <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-sans">
                  <span className="font-semibold text-rose-400">Validation error: </span>
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
