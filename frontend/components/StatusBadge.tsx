import { ItemStatus, JobStatus } from "@/lib/types";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, Ban } from "lucide-react";

interface StatusBadgeProps {
  status: ItemStatus | JobStatus;
  resolved?: boolean;
}

export function StatusBadge({ status, resolved }: StatusBadgeProps) {
  if (status === "needs_review") {
    if (resolved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Needs Review (Resolved)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border-2 border-amber-500/50 shadow-sm shadow-amber-500/10 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span>NEEDS REVIEW</span>
      </span>
    );
  }

  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>Done</span>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <XCircle className="w-3 h-3 text-rose-400" />
        <span>Failed</span>
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
        <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
        <span>Running</span>
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
        <Ban className="w-3 h-3" />
        <span>Cancelled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
      <Clock className="w-3 h-3" />
      <span>Queued</span>
    </span>
  );
}
