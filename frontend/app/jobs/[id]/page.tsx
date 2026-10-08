"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useJobPolling } from "@/lib/useJobPolling";
import { patchRecord, cancelJob, getExportCsvUrl, ApiError } from "@/lib/api";
import { JobResultItem, ExtractedRecord } from "@/lib/types";
import { ProgressBar } from "@/components/ProgressBar";
import { ItemList, sortItemsForReview } from "@/components/ItemList";
import { TicketPane } from "@/components/TicketPane";
import { FieldEditor } from "@/components/FieldEditor";
import { FlagList } from "@/components/FlagList";
import { RawOutputPanel } from "@/components/RawOutputPanel";
import { ArrowLeft, Loader2, Download, RefreshCw, Command, Check } from "lucide-react";
import { RerunModal } from "@/components/RerunModal";
import { ShortcutsModal } from "@/components/ShortcutsModal";

export default function JobReviewPage() {
  const routeParams = useParams();
  const jobId = (routeParams?.id as string) || "";

  // useJobPolling handles the polling loop and gives us job status + results
  const {
    job,
    results,
    loading,
    error,
    mutateResults,
    refresh,
  } = useJobPolling(jobId);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isRerunOpen, setIsRerunOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // sort once whenever results change - keeps the order stable while navigating
  const sortedReviewItems = useMemo(() => {
    return sortItemsForReview(results?.items || []);
  }, [results?.items]);

  // clear errors whenever the user switches to a different ticket
  useEffect(() => {
    setFieldErrors({});
  }, [selectedTicketId]);

  // auto-select the first needs_review ticket when results load - saves a click
  useEffect(() => {
    if (!results || results.items.length === 0) return;
    if (!selectedTicketId) {
      const reviewItem = results.items.find(
        (it) => it.status === "needs_review" && !it.resolved
      );
      if (reviewItem) {
        setSelectedTicketId(reviewItem.ticket_id);
      } else {
        setSelectedTicketId(results.items[0].ticket_id);
      }
    }
  }, [results, selectedTicketId]);

  // keyboard shortcuts - j/k for navigation (like vim), e to jump to first field, ? for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // if a modal is open, only handle Escape
      if (isShortcutsOpen || isRerunOpen) {
        if (e.key === "Escape") {
          setIsShortcutsOpen(false);
          setIsRerunOpen(false);
        }
        return;
      }

      // dont intercept when typing in a form field
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isInput) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (sortedReviewItems.length === 0) return;
        const currentIdx = sortedReviewItems.findIndex(
          (it) => it.ticket_id === selectedTicketId
        );
        if (currentIdx === -1) {
          setSelectedTicketId(sortedReviewItems[0].ticket_id);
        } else if (currentIdx < sortedReviewItems.length - 1) {
          setSelectedTicketId(sortedReviewItems[currentIdx + 1].ticket_id);
        }
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (sortedReviewItems.length === 0) return;
        const currentIdx = sortedReviewItems.findIndex(
          (it) => it.ticket_id === selectedTicketId
        );
        if (currentIdx > 0) {
          setSelectedTicketId(sortedReviewItems[currentIdx - 1].ticket_id);
        }
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        const firstField = document.getElementById("field-company");
        if (firstField) {
          firstField.focus();
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sortedReviewItems, selectedTicketId, isShortcutsOpen, isRerunOpen]);

  const selectedItem: JobResultItem | undefined = results?.items.find(
    (it) => it.ticket_id === selectedTicketId
  );

  const handlePatchField = async (
    field: string,
    value: unknown
  ): Promise<boolean> => {
    if (!selectedItem) return false;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    try {
      const updated = await patchRecord(selectedItem.record_id, {
        [field]: value,
      } as unknown as Partial<ExtractedRecord>);

      mutateResults((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.record_id === updated.record_id ? updated : it
          ),
        };
      });

      setSaveSuccessMsg("Field updated and marked resolved");
      setTimeout(() => setSaveSuccessMsg(null), 2200);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
      } else if (err instanceof ApiError) {
        setFieldErrors({ [field]: err.message });
      } else {
        setFieldErrors({ [field]: "Could not save field" });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelJob = async () => {
    if (!confirm("Are you sure you want to stop this batch? Remaining items will be cancelled.")) return;
    try {
      await cancelJob(jobId);
      refresh();
    } catch {
      alert("Failed to cancel job.");
    }
  };

  if (loading && !job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-[#57534e] gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#15803d]" />
        <p className="text-xs font-mono">Loading job {jobId}...</p>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="flex-1 max-w-md mx-auto p-8 my-auto text-center space-y-4">
        <h2 className="text-lg font-semibold text-[#1c1917]">Could not load job</h2>
        <p className="text-xs text-[#57534e]">{error || "The job may have been deleted or the ID is invalid."}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#1c1917] bg-white border border-[#eae6de] hover:bg-[#f5f2eb] transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Tickets</span>
          </Link>
        </div>
      </div>
    );
  }

  const exportUrl = getExportCsvUrl(jobId);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4">
      {/* top navigation & action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-md bg-white border border-[#eae6de] text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f2eb] transition-colors shadow-xs"
            title="Return to Tickets"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-[#1c1917]">
                Review Queue
              </h1>
              <span className="font-mono text-xs text-[#57534e] bg-[#f5f2eb] px-2 py-0.5 rounded border border-[#eae6de]">
                job: {jobId}
              </span>
            </div>
            <p className="text-xs text-[#57534e]">
              Verify model-extracted fields, address flags, or apply manual corrections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#57534e] bg-white hover:bg-[#f5f2eb] border border-[#eae6de] transition-colors cursor-pointer shadow-xs"
            title="Keyboard shortcuts (?)"
          >
            <Command className="w-3 h-3 text-[#8c857b]" />
            <span>Shortcuts</span>
            <kbd className="font-mono text-[10px] bg-[#f5f2eb] px-1 rounded border border-[#d6d0c4]">?</kbd>
          </button>

          {job && (job.status === "queued" || job.status === "running") && (
            <button
              onClick={handleCancelJob}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[#991b1b] bg-white hover:bg-[#fee2e2] border border-[#fecaca] transition-colors cursor-pointer shadow-xs"
            >
              Cancel job
            </button>
          )}

          <a
            href={exportUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#1c1917] bg-white hover:bg-[#f5f2eb] border border-[#eae6de] transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#57534e]" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {job && (
        <ProgressBar
          progress={job.progress}
          status={job.status}
        />
      )}

      {/* two column workbench split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* left column: queue list */}
        <div className="lg:col-span-4 h-[750px]">
          <ItemList
            items={results?.items || []}
            selectedTicketId={selectedTicketId}
            onSelectTicket={(tid) => {
              setSelectedTicketId(tid);
              setFieldErrors({});
            }}
          />
        </div>

        {/* right column: review workspace */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {selectedItem ? (
            <>
              <div className="space-y-2">
                {saveSuccessMsg && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-[#166534] bg-[#dcfce7] border border-[#bbf7d0] px-2.5 py-1 rounded-md">
                    <Check className="w-3.5 h-3.5 text-[#15803d]" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {selectedItem.flags && selectedItem.flags.length > 0 && (
                  <FlagList flags={selectedItem.flags} />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* raw customer ticket */}
                <div>
                  <TicketPane
                    ticketId={selectedItem.ticket_id}
                    ticket={selectedItem.ticket}
                  />
                </div>

                {/* structured extraction form */}
                <div className="bg-white border border-[#eae6de] rounded-lg p-4 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <div className="border-b border-[#eae6de] pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#1c1917] text-sm">
                        Extracted Fields
                      </h3>
                      <p className="text-[11px] text-[#57534e]">Click any field to edit. Enter or Blur saves.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving && (
                        <span className="text-[11px] font-mono text-[#57534e]">
                          Saving...
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsRerunOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#1c1917] bg-white hover:bg-[#f5f2eb] border border-[#eae6de] transition-colors cursor-pointer shadow-xs"
                        title="Re-run extraction pipeline for this record"
                      >
                        <RefreshCw className="w-3 h-3 text-[#57534e]" />
                        <span>Re-run</span>
                      </button>
                    </div>
                  </div>

                  <FieldEditor
                    recordId={selectedItem.record_id}
                    recordData={
                      selectedItem.record
                        ? selectedItem.record
                        : (selectedItem.draft || {})
                    }
                    fieldMeta={selectedItem.field_meta || {}}
                    editedFields={selectedItem.edited_fields || []}
                    originalValues={selectedItem.original_values || {}}
                    onPatchField={handlePatchField}
                    fieldErrors={fieldErrors}
                    isSaving={isSaving}
                  />
                </div>
              </div>

              {/* collapsible debug output */}
              <RawOutputPanel
                rawOutputs={selectedItem.raw_outputs || []}
                validationErrors={selectedItem.validation_errors || []}
                status={selectedItem.status}
                attempts={selectedItem.attempts}
              />
            </>
          ) : (
            <div className="p-12 border border-[#eae6de] rounded-lg bg-white text-center text-[#57534e] text-xs shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              Select a ticket from the review queue on the left to inspect raw message and review extracted fields.
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <RerunModal
          isOpen={isRerunOpen}
          onClose={() => setIsRerunOpen(false)}
          recordId={selectedItem.record_id}
          ticketId={selectedItem.ticket_id}
          onSuccess={(updatedItem) => {
            mutateResults((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                items: prev.items.map((it) =>
                  it.record_id === updatedItem.record_id ? updatedItem : it
                ),
              };
            });
            setSaveSuccessMsg("Re-run completed and applied");
            setTimeout(() => setSaveSuccessMsg(null), 2500);
          }}
        />
      )}

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
