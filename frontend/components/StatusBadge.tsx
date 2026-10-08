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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]">
          <CheckCircle2 className="w-3 h-3 text-[#166534]" />
          <span>Resolved</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
        <AlertTriangle className="w-3 h-3 text-[#b45309]" />
        <span>Needs review</span>
      </span>
    );
  }

  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
        <span>Done</span>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]">
        <XCircle className="w-3 h-3 text-[#b91c1c]" />
        <span>Failed</span>
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
        <Loader2 className="w-3 h-3 animate-spin text-[#0284c7]" />
        <span>Running</span>
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
        <Ban className="w-3 h-3" />
        <span>Cancelled</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
      <Clock className="w-3 h-3" />
      <span>Queued</span>
    </span>
  );
}
