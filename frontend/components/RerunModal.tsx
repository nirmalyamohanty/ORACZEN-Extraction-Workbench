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
    if (val === null || val === undefined) return <span className="text-[#9ca3af] italic">null</span>;
    if (typeof val === "boolean") return val ? "true" : "false";
    return String(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white border border-[#e2e2dd] rounded-md max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e2e2dd] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1c1c1a]">
              Re-run extraction ({ticketId})
            </h3>
            <p className="text-xs text-[#6b6b66]">
              Compare model extraction output against existing record
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#6b6b66] hover:text-[#1c1c1a] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Settings Section */}
          <div className="bg-[#f7f7f5] p-3 rounded-md border border-[#e2e2dd]">
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
                className="mt-0.5 rounded border-[#e2e2dd] text-[#1f4fd8] focus:ring-[#1f4fd8]"
              />
              <div className="text-xs">
                <span className="font-medium text-[#1c1c1a]">
                  Overwrite human-edited fields
                </span>
                <p className="text-[#6b6b66] mt-0.5">
                  When unchecked, fields you manually edited are preserved.
                </p>
              </div>
            </label>
          </div>

          {/* Action to Generate Preview */}
          {!diff && !loading && (
            <div className="text-center py-6 border border-dashed border-[#e2e2dd] rounded-md">
              <p className="text-xs text-[#1c1c1a] font-medium">
                Calculate diff preview
              </p>
              <p className="text-[11px] text-[#6b6b66] max-w-sm mx-auto mt-1 mb-4">
                Run the extraction to inspect changed values before applying.
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
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-[#6b6b66]">
              <Loader2 className="w-5 h-5 animate-spin text-[#1f4fd8]" />
              <span className="text-xs">Running extraction preview...</span>
            </div>
          )}

          {previewError && (
            <div className="p-3 text-xs text-[#b91c1c] bg-[#fee2e2] border border-[#fecaca] rounded-md">
              {previewError}
            </div>
          )}

          {/* Diff Table */}
          {diff && !loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#1c1c1a]">
                  Diff comparison
                </h4>
                <button
                  type="button"
                  onClick={() => handleFetchPreview()}
                  className="text-xs text-[#1f4fd8] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-calculate</span>
                </button>
              </div>

              <div className="border border-[#e2e2dd] rounded-md overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#f7f7f5] text-[#6b6b66] border-b border-[#e2e2dd] font-medium">
                    <tr>
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-3">Current</th>
                      <th className="py-2 px-3">New</th>
                      <th className="py-2 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e2dd] font-mono text-xs">
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
                                ? "bg-[#f0fdf4]"
                                : "bg-[#fefce8]"
                              : "bg-white"
                          }
                        >
                          <td className="py-2 px-3 font-sans font-medium text-[#1c1c1a]">
                            {fname}
                          </td>
                          <td className="py-2 px-3 text-[#1c1c1a]">
                            <div className="flex items-center gap-1.5">
                              <span>{formatVal(fdiff.old_value)}</span>
                              {fdiff.is_edited && (
                                <span className="text-[10px] px-1 py-0.2 bg-[#f3f4f6] text-[#4b5563] rounded font-sans border border-[#e5e7eb]">
                                  edited
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[#1c1c1a]">
                            <span className={!isSame ? "font-semibold text-[#1f4fd8]" : ""}>
                              {formatVal(fdiff.new_value)}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {fdiff.is_edited && !fdiff.will_replace ? (
                              <span className="text-[#b45309] font-medium">
                                Keep (edited)
                              </span>
                            ) : !isSame ? (
                              <span className="text-[#166534] font-medium">
                                Replace
                              </span>
                            ) : (
                              <span className="text-[#9ca3af]">
                                No change
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
        <div className="px-5 py-3 border-t border-[#e2e2dd] bg-[#f7f7f5] flex items-center justify-end gap-2">
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
              "Confirm & Replace"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
