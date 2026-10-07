"use client";

import { useState } from "react";
import { rerunRecord } from "@/lib/api";
import { JobResultItem, FieldDiff } from "@/lib/types";
import {
  RotateCw,
  X,
  Loader2,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface RerunModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  ticketId: string;
  onSuccess: (item: JobResultItem) => void;
}

export function RerunModal({
  isOpen,
  onClose,
  recordId,
  ticketId,
  onSuccess,
}: RerunModalProps) {
  const [overwriteEdited, setOverwriteEdited] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [diff, setDiff] = useState<Record<string, FieldDiff> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applying, setApplying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFetchPreview = async (overwrite: boolean = overwriteEdited) => {
    setLoading(true);
    setPreviewError(null);
    try {
      const res = await rerunRecord(recordId, {
        overwrite_edited: overwrite,
        preview_only: true,
      });
      setDiff(res.diff);
    } catch (err: unknown) {
      setPreviewError(
        err instanceof Error ? err.message : "Failed to generate preview diff."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setPreviewError(null);
    try {
      const res = await rerunRecord(recordId, {
        overwrite_edited: overwriteEdited,
        preview_only: false,
      });
      onSuccess(res.item);
      onClose();
    } catch (err: unknown) {
      setPreviewError(
        err instanceof Error ? err.message : "Failed to apply re-run changes."
      );
    } finally {
      setApplying(false);
    }
  };

  const formatVal = (val: unknown) => {
    if (val === null || val === undefined) return <span className="text-slate-500 italic">null</span>;
    if (typeof val === "boolean") return val ? "true" : "false";
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Re-run Extraction ({ticketId})
              </h3>
              <p className="text-xs text-slate-400">
                Re-execute extraction pipeline and inspect field diffs before replacing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Settings Section */}
          <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/80">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overwriteEdited}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setOverwriteEdited(checked);
                  if (diff) {
                    handleFetchPreview(checked);
                  }
                }}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-medium text-slate-200">
                  Overwrite human-edited fields
                </span>
                <p className="text-slate-400 mt-0.5">
                  When unchecked, values previously edited by humans are strictly preserved.
                </p>
              </div>
            </label>
          </div>

          {/* Action to Generate Preview */}
          {!diff && !loading && (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg">
              <ShieldCheck className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs text-slate-300 font-medium">
                Preview changes before replacing
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Calculate the pipeline output to inspect field diffs side-by-side with your existing record.
              </p>
              <button
                type="button"
                onClick={() => handleFetchPreview()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Calculate Diff Preview</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Running extraction pipeline preview...</span>
            </div>
          )}

          {previewError && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {/* Diff Table */}
          {diff && !loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-200">
                  Diff Comparison (Current vs New Extraction)
                </h4>
                <button
                  type="button"
                  onClick={() => handleFetchPreview()}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-calculate</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Current Value</th>
                      <th className="py-2 px-3">New Model Value</th>
                      <th className="py-2 px-3">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono text-[11px]">
                    {Object.entries(diff).map(([fname, fdiff]) => {
                      const isSame =
                        JSON.stringify(fdiff.old_value) ===
                        JSON.stringify(fdiff.new_value);
                      return (
                        <tr
                          key={fname}
                          className={
                            !isSame
                              ? fdiff.will_replace
                                ? "bg-emerald-950/10"
                                : "bg-amber-950/10"
                              : ""
                          }
                        >
                          <td className="py-2 px-3 font-sans font-medium text-slate-300">
                            {fname}
                          </td>
                          <td className="py-2 px-3 text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span>{formatVal(fdiff.old_value)}</span>
                              {fdiff.is_edited && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-sans border border-amber-500/30">
                                  Human
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-300">
                            <span
                              className={
                                !isSame ? "text-indigo-300 font-semibold" : ""
                              }
                            >
                              {formatVal(fdiff.new_value)}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {fdiff.is_edited && !fdiff.will_replace ? (
                              <span className="text-[10px] text-amber-400 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                                Kept Human Value
                              </span>
                            ) : !isSame ? (
                              <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1 w-fit">
                                <ArrowRight className="w-2.5 h-2.5" />
                                Replaces
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">
                                Unchanged
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!diff || applying}
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20"
          >
            {applying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Replace</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
