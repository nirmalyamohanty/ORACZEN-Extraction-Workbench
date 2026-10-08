import { ItemStatus, JobStatus } from "@/lib/types";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Loader2, Ban } from "lucide-react";

// reusable badge component to show color-coded status chips
// handles both individual item statuses AND overall job statuses
interface StatusBadgeProps {
  status: ItemStatus | JobStatus;
  resolved?: boolean; // only applies if status is 'needs_review' and reviewer finished fixing fields
}

export function StatusBadge({ status, resolved }: StatusBadgeProps) {
  // needs_review: amber alert when pending, green check when reviewer completed edits
  if (status === "needs_review") {
    if (resolved) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]">
          <CheckCircle2 className="w-3 h-3 text-[#15803d]" />
          <span>Resolved</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
        <AlertTriangle className="w-3 h-3 text-[#d97706]" />
        <span>Review needed</span>
      </span>
    );
  }

  // done: clean status indicator with green dot
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#166534]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]" />
        <span>Done</span>
      </span>
    );
  }

  // failed: light red badge
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]">
        <XCircle className="w-3 h-3 text-[#dc2626]" />
        <span>Failed</span>
      </span>
    );
  }

  // running: light blue badge with animated spinner
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]">
        <Loader2 className="w-3 h-3 animate-spin text-[#2563eb]" />
        <span>Running</span>
      </span>
    );
  }

  // cancelled: muted gray badge
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#f5f2eb] text-[#57534e] border border-[#eae6de]">
        <Ban className="w-3 h-3" />
        <span>Cancelled</span>
      </span>
    );
  }

  // default / queued fallback
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#f5f2eb] text-[#57534e] border border-[#eae6de]">
      <Clock className="w-3 h-3" />
      <span>Queued</span>
    </span>
  );
}
