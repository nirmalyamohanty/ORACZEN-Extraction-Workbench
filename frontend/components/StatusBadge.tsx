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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#064e3b]/35 text-[#34d399] border border-[#059669]/50">
          <CheckCircle2 className="w-3 h-3 text-[#34d399]" />
          <span>Resolved</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#78350f]/35 text-[#fbbf24] border border-[#92400e]/60">
        <AlertTriangle className="w-3 h-3 text-[#fbbf24]" />
        <span>Needs review</span>
      </span>
    );
  }

  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#34d399]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
        <span>Done</span>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#7f1d1d]/35 text-[#f87171] border border-[#b91c1c]/50">
        <XCircle className="w-3 h-3 text-[#f87171]" />
        <span>Failed</span>
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#075985]/35 text-[#38bdf8] border border-[#0284c7]/50">
        <Loader2 className="w-3 h-3 animate-spin text-[#38bdf8]" />
        <span>Running</span>
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#1e222f] text-[#94a3b8] border border-[#2e3344]">
        <Ban className="w-3 h-3" />
        <span>Cancelled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#1e222f] text-[#94a3b8] border border-[#2e3344]">
      <Clock className="w-3 h-3" />
      <span>Queued</span>
    </span>
  );
}
