import { JobProgress, JobStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface ProgressBarProps {
  progress?: JobProgress;
  status: JobStatus;
  reconnecting?: boolean;
}

export function ProgressBar({
  progress,
  status,
  reconnecting,
}: ProgressBarProps) {
  if (!progress) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-sm font-semibold text-white">
            {progress.finished} of {progress.total} processed ({progress.percent}%)
          </span>
          {reconnecting && (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
              Reconnecting...
            </span>
          )}
        </div>

        {/* Breakdown counts */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {progress.running > 0 && (
            <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 font-medium">
              {progress.running} running
            </span>
          )}
          {progress.queued > 0 && (
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-medium">
              {progress.queued} queued
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
            {progress.done} done
          </span>
          {progress.needs_review > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
              {progress.needs_review} needs review
            </span>
          )}
          {progress.failed > 0 && (
            <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium">
              {progress.failed} failed
            </span>
          )}
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>
    </div>
  );
}
