import { JobProgress, JobStatus } from "@/lib/types";

// progress overview card showing percentage and status counters
interface ProgressBarProps {
  progress?: JobProgress;
  status: JobStatus;
}

export function ProgressBar({
  progress,
  status,
}: ProgressBarProps) {
  if (!progress) return null;

  // status pill label
  const statusLabel =
    status === "running"
      ? "Running"
      : status === "done"
      ? "Done"
      : status === "cancelled"
      ? "Cancelled"
      : "Queued";

  return (
    <div className="bg-white border border-[#eae6de] rounded-lg p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#1c1917]">
            Batch Progress
          </span>
          <span className="font-mono text-[11px] text-[#57534e]">
            ({progress.finished} of {progress.total} processed)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-xs text-[#1c1917]">
            {Math.round(progress.percent)}%
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f5f2eb] text-[#57534e] border border-[#eae6de] uppercase tracking-wider">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* slim 6px progress track */}
      <div className="w-full h-1.5 bg-[#eae6de] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#15803d] rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>

      {/* breakdown chips row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
        {progress.done > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] font-mono">
            <span>Done:</span>
            <span className="font-semibold">{progress.done}</span>
          </span>
        )}
        {progress.needs_review > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-mono">
            <span>Review:</span>
            <span className="font-semibold">{progress.needs_review}</span>
          </span>
        )}
        {progress.running > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe] font-mono">
            <span>Running:</span>
            <span className="font-semibold">{progress.running}</span>
          </span>
        )}
        {progress.failed > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] font-mono">
            <span>Failed:</span>
            <span className="font-semibold">{progress.failed}</span>
          </span>
        )}
        {progress.queued > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f2eb] text-[#57534e] border border-[#eae6de] font-mono">
            <span>Queued:</span>
            <span className="font-semibold">{progress.queued}</span>
          </span>
        )}
      </div>
    </div>
  );
}
