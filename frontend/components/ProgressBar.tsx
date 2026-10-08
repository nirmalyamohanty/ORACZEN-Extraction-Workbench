import { JobProgress, JobStatus } from "@/lib/types";

interface ProgressBarProps {
  progress?: JobProgress;
  status: JobStatus;
}

export function ProgressBar({
  progress,
  status,
}: ProgressBarProps) {
  if (!progress) return null;

  // Format counts: "Queued 100 · Running 4 · Done 40 · Needs review 4 · Failed 2", omitting 0s
  const countParts: string[] = [];
  if (progress.queued > 0) countParts.push(`Queued ${progress.queued}`);
  if (progress.running > 0) countParts.push(`Running ${progress.running}`);
  if (progress.done > 0) countParts.push(`Done ${progress.done}`);
  if (progress.needs_review > 0) countParts.push(`Needs review ${progress.needs_review}`);
  if (progress.failed > 0) countParts.push(`Failed ${progress.failed}`);
  if (progress.cancelled > 0) countParts.push(`Cancelled ${progress.cancelled}`);

  const statusLabel =
    status === "running"
      ? "Running"
      : status === "done"
      ? "Done"
      : status === "cancelled"
      ? "Cancelled"
      : "Queued";

  return (
    <div className="bg-[#161922] border border-[#262a36] rounded-md p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#f3f4f6]">
          {progress.finished} of {progress.total} processed
        </span>
        <span className="text-xs font-semibold text-[#94a3b8]">
          {statusLabel}
        </span>
      </div>

      {/* Flat 8px bar: dark grey track, solid blue fill */}
      <div className="w-full h-2 bg-[#262a36] rounded-md overflow-hidden">
        <div
          className="h-full bg-[#3b82f6] rounded-md transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>

      {/* Counts line in exact form: Queued 100 · Running 4 · Done 40 · Needs review 4 · Failed 2 */}
      {countParts.length > 0 && (
        <div className="text-xs text-[#94a3b8]">
          {countParts.join(" · ")}
        </div>
      )}
    </div>
  );
}
