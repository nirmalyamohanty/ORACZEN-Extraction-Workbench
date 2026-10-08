import { Flag } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

// displays the warning flags generated during extraction validation
// e.g., if a field value wasn't found in the text or currency didn't match
interface FlagListProps {
  flags: Flag[];
}

const FLAG_CODE_LABELS: Record<string, string> = {
  ungrounded: "Not found in ticket",
  not_stated: "Not stated",
  currency_mismatch: "Currency mismatch",
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
    <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-3 space-y-2.5">
      {/* alert header */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#92400e]">
        <AlertTriangle className="w-3.5 h-3.5 text-[#d97706]" />
        <span>Validation Discrepancies ({flags.length})</span>
      </div>

      {/* flags list */}
      <div className="space-y-1.5">
        {flags.map((flag, idx) => {
          const label = FLAG_CODE_LABELS[flag.code] || flag.code;
          return (
            <div
              key={idx}
              className="text-xs text-[#78350f] bg-white rounded-md p-2 border border-[#fef08a] space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#92400e] text-[11px]">
                  {label}
                </span>
                <span className="font-mono text-[11px] text-[#8c857b]">
                  · field: <span className="text-[#57534e] font-semibold">{flag.field}</span>
                </span>
              </div>
              <p className="text-xs text-[#78350f] leading-relaxed">
                {flag.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
