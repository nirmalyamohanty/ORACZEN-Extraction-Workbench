"use client";

import { useState } from "react";
import { rerunRecord } from "@/lib/api";
import { JobResultItem, FieldDiff } from "@/lib/types";
import { X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";

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

  // preview_only=true runs the model and returns the diff without persisting
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

  // preview_only=false commits the replacement to database
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
    if (val === null || val === undefined) return <span className="text-[#8c857b] italic font-sans">null</span>;
    if (typeof val === "boolean") return val ? "true" : "false";
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-[#eae6de] rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* modal title bar */}
        <div className="px-5 py-3.5 border-b border-[#eae6de] flex items-center justify-between bg-[#fbf9f5]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-[#1c1917] tracking-tight">
                Re-run Extraction Pipeline
              </h3>
              <span className="font-mono text-[11px] text-[#57534e] bg-[#f5f2eb] px-1.5 py-0.2 rounded border border-[#eae6de]">
                {ticketId}
              </span>
            </div>
            <p className="text-[11px] text-[#57534e] mt-0.5">
              Inspect model re-extraction diff before overwriting saved values.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#57534e] hover:text-[#1c1917] rounded hover:bg-[#f5f2eb] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* overwrite manual edits toggle */}
          <div className="bg-[#fbf9f5] p-3 rounded-md border border-[#eae6de]">
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
                className="mt-0.5 rounded border-[#d6d0c4] bg-white text-[#15803d] focus:ring-[#15803d]"
              />
              <div className="text-xs">
                <span className="font-medium text-[#1c1917]">
                  Overwrite reviewer manual edits
                </span>
                <p className="text-[#57534e] mt-0.5">
                  When unchecked, fields with human edits are locked and preserved.
                </p>
              </div>
            </label>
          </div>

          {/* step 1: calculate diff button */}
          {!diff && !loading && (
            <div className="text-center py-6 border border-dashed border-[#d6d0c4] rounded-md bg-[#fbf9f5]">
              <p className="text-xs text-[#1c1917] font-medium">
                Calculate Extraction Diff
              </p>
              <p className="text-[11px] text-[#57534e] max-w-sm mx-auto mt-1 mb-4">
                Execute LLM extraction against raw ticket text and compare against current record.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFetchPreview()}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Calculate Diff Preview
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-[#57534e]">
              <Loader2 className="w-5 h-5 animate-spin text-[#15803d]" />
              <span className="text-xs font-mono">Running model extraction...</span>
            </div>
          )}

          {previewError && (
            <div className="p-3 text-xs text-[#991b1b] bg-[#fee2e2] border border-[#fecaca] rounded-md">
              {previewError}
            </div>
          )}

          {/* step 2: diff table */}
          {diff && !loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#1c1917]">Comparison Matrix</h4>
                <button
                  type="button"
                  onClick={() => handleFetchPreview()}
                  className="text-xs text-[#15803d] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-calculate</span>
                </button>
              </div>

              <div className="border border-[#eae6de] rounded-md overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#f5f2eb] text-[#6b655b] border-b border-[#eae6de] text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Current</th>
                      <th className="py-2 px-3">New Extracted</th>
                      <th className="py-2 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eae6de] font-mono text-xs">
                    {Object.entries(diff).map(([fname, fdiff]) => {
                      const isSame =
                        JSON.stringify(fdiff.old_value) === JSON.stringify(fdiff.new_value);
                      return (
                        <tr
                          key={fname}
                          className={
                            !isSame
                              ? fdiff.will_replace
                                ? "bg-[#f0fdf4]"
                                : "bg-[#fffdf7]"
                              : "bg-white"
                          }
                        >
                          <td className="py-2 px-3 font-sans font-medium text-[#1c1917]">{fname}</td>
                          <td className="py-2 px-3 text-[#1c1917]">
                            <div className="flex items-center gap-1.5">
                              <span>{formatVal(fdiff.old_value)}</span>
                              {fdiff.is_edited && (
                                <span className="text-[10px] px-1 bg-[#fef9ee] text-[#92400e] rounded font-sans border border-[#fde68a]">
                                  edited
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[#1c1917]">
                            <span className={!isSame ? "font-semibold text-[#15803d]" : ""}>
                              {formatVal(fdiff.new_value)}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {fdiff.is_edited && !fdiff.will_replace ? (
                              <span className="text-[#92400e] font-medium text-[11px]">Locked (edited)</span>
                            ) : !isSame ? (
                              <span className="text-[#166534] font-medium text-[11px]">Will Replace</span>
                            ) : (
                              <span className="text-[#8c857b] text-[11px]">Identical</span>
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

        <div className="px-5 py-3 border-t border-[#eae6de] bg-[#fbf9f5] flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!diff || Object.keys(diff).length === 0 || applying}
            onClick={handleApply}
          >
            {applying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Applying...
              </>
            ) : (
              "Confirm & Overwrite"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
