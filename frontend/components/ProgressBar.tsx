import { JobProgress, JobStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

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
    <div className="bg-white border border-[#e2e2dd] rounded-md p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#1c1c1a]">
          {progress.finished} of {progress.total} processed
        </span>
        <span className="text-xs font-semibold text-[#6b6b66]">
          {statusLabel}
        </span>
      </div>

      {/* Flat 8px bar: grey track, solid blue fill */}
      <div className="w-full h-2 bg-[#e5e7eb] rounded-md overflow-hidden">
        <div
          className="h-full bg-[#1f4fd8] rounded-md"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>

      {/* Counts line in exact form: Queued 100 · Running 4 · Done 40 · Needs review 4 · Failed 2 */}
      {countParts.length > 0 && (
        <div className="text-xs text-[#6b6b66]">
          {countParts.join(" · ")}
        </div>
      )}
    </div>
  );
}
