import { Flag } from "@/lib/types";
import { AlertCircle, AlertOctagon, Info, AlertTriangle } from "lucide-react";

interface FlagListProps {
  flags: Flag[];
}

export function FlagList({ flags }: FlagListProps) {
  if (!flags || flags.length === 0) return null;

  const getFlagStyle = (code: string) => {
    switch (code) {
      case "invalid_model_output":
      case "currency_mismatch":
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />,
          container: "bg-rose-950/30 border-rose-800/60 text-rose-200",
          tag: "bg-rose-900/40 text-rose-300 border-rose-700/50",
        };
      case "multi_issue":
      case "ungrounded":
      case "skipped_model":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          container: "bg-amber-950/30 border-amber-800/60 text-amber-200",
          tag: "bg-amber-900/40 text-amber-300 border-amber-700/50",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-indigo-400 shrink-0" />,
          container: "bg-indigo-950/30 border-indigo-800/60 text-indigo-200",
          tag: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
        };
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Reviewer Flags ({flags.length})
      </h4>
      <div className="space-y-1.5">
        {flags.map((flag, idx) => {
          const style = getFlagStyle(flag.code);
          return (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${style.container}`}
            >
              {style.icon}
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] font-semibold px-1.5 py-0.2 rounded border ${style.tag}`}
                  >
                    {flag.code}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    field: {flag.field}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed">
                  {flag.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
