import { Flag } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

interface FlagListProps {
  flags: Flag[];
}

const FLAG_CODE_LABELS: Record<string, string> = {
  ungrounded: "Not found in ticket",
  not_stated: "Not stated",
  currency_mismatch: "Currency",
  multi_issue: "Multiple issues",
  skipped_model: "Skipped (no content)",
  invalid_model_output: "Model output invalid",
  derived_value: "Calculated value",
  approximate_amount: "Approximate amount",
  relative_date_resolved: "Date inferred",
  sender_domain_mismatch: "Company mismatch",
  default_category: "Category guessed",
  vague_deadline: "Vague deadline",
};

export function FlagList({ flags }: FlagListProps) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="bg-[#78350f]/20 border border-[#92400e]/50 rounded-md p-3.5 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fbbf24]">
        <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24]" />
        <span>Needs your attention ({flags.length})</span>
      </div>

      <div className="space-y-2">
        {flags.map((flag, idx) => {
          const label = FLAG_CODE_LABELS[flag.code] || flag.code;
          return (
            <div
              key={idx}
              className="text-xs text-[#fde68a] bg-[#161922]/80 rounded p-2 border border-[#92400e]/40 space-y-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#fbbf24]">
                  {label}
                </span>
                <span className="text-[11px] text-[#94a3b8]">
                  · {flag.field}
                </span>
              </div>
              <p className="text-xs text-[#fde68a]/90 leading-normal">
                {flag.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
