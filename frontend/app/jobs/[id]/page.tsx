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
import { ArrowLeft, Loader2 } from "lucide-react";
import { RerunModal } from "@/components/RerunModal";
import { ShortcutsModal } from "@/components/ShortcutsModal";

export default function JobReviewPage() {
  const routeParams = useParams();
  const jobId = (routeParams?.id as string) || "";
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

  const sortedReviewItems = useMemo(() => {
    return sortItemsForReview(results?.items || []);
  }, [results?.items]);

  // Clear field errors on every selection change (click, j/k, etc.)
  useEffect(() => {
    setFieldErrors({});
  }, [selectedTicketId]);

  // Set default selected ticket as first available or first needs_review
  useEffect(() => {
    if (!results || results.items.length === 0) return;
    if (!selectedTicketId) {
      // Prioritize selecting first needs_review item
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

  // Global Keyboard shortcuts: j/k to navigate records, e to edit first field, ? for cheatsheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutsOpen || isRerunOpen) {
        if (e.key === "Escape") {
          setIsShortcutsOpen(false);
          setIsRerunOpen(false);
        }
        return;
      }

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

    // Clear any previous error on this field
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    try {
      const updatedItem = await patchRecord(selectedItem.record_id, {
        [field]: value,
      } as unknown as Partial<ExtractedRecord>);

      // Sync state with authoritative server response
      mutateResults((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.record_id === updatedItem.record_id ? updatedItem : it
          ),
        };
      });

      setSaveSuccessMsg(`Saved ${field}`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
      return true;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors((prev) => ({
          ...prev,
          ...err.errors,
        }));
      } else if (err instanceof ApiError) {
        setFieldErrors((prev) => ({
          ...prev,
          [field]: err.message,
        }));
      } else {
        setFieldErrors((prev) => ({
          ...prev,
          [field]: "Failed to save field",
        }));
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelJob = async () => {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    try {
      await cancelJob(jobId);
      refresh();
    } catch (err) {
      alert("Failed to cancel job.");
    }
  };

  // Loading state
  if (loading && !job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-[#94a3b8] gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
        <p className="text-sm">Loading job {jobId}...</p>
      </div>
    );
  }

  // 404 or Error state
  if (error && !job) {
    return (
      <div className="flex-1 max-w-xl mx-auto p-8 my-auto text-center space-y-4">
        <h2 className="text-xl font-semibold text-[#f3f4f6]">Could not load job</h2>
        <p className="text-sm text-[#94a3b8]">Could not load job</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-[#f3f4f6] bg-[#161922] border border-[#262a36] hover:bg-[#1e222f] transition-colors"
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-md bg-[#161922] border border-[#262a36] text-[#94a3b8] hover:text-[#f3f4f6] hover:bg-[#1e222f] transition-colors"
            title="Return to Tickets"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#f3f4f6]">
              Review
            </h1>
            <span className="font-mono text-xs text-[#94a3b8]">
              {jobId}
            </span>
          </div>
        </div>

        {/* Action buttons: Shortcuts, Cancel, Export CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#f3f4f6] bg-[#161922] hover:bg-[#1e222f] border border-[#262a36] transition-colors cursor-pointer"
            title="Keyboard shortcuts (?)"
          >
            Shortcuts (?)
          </button>

          {job && (job.status === "queued" || job.status === "running") && (
            <button
              onClick={handleCancelJob}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#f87171] bg-[#161922] hover:bg-[#7f1d1d]/30 border border-[#b91c1c]/50 transition-colors cursor-pointer"
            >
              Cancel job
            </button>
          )}

          <a
            href={exportUrl}
            download
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#f3f4f6] bg-[#161922] hover:bg-[#1e222f] border border-[#262a36] transition-colors cursor-pointer"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Live Progress Bar */}
      {job && (
        <ProgressBar
          progress={job.progress}
          status={job.status}
        />
      )}

      {/* Main Two-Column Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left column: Items List (4 cols) */}
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

        {/* Right column: Review Pane (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {selectedItem ? (
            <>
              {/* Toast & Flags */}
              <div className="space-y-2">
                {saveSuccessMsg && (
                  <div className="text-xs text-[#94a3b8] py-1">
                    {saveSuccessMsg}
                  </div>
                )}

                {/* Flags list */}
                {selectedItem.flags && selectedItem.flags.length > 0 && (
                  <FlagList flags={selectedItem.flags} />
                )}
              </div>

              {/* Side-by-side Ticket vs Extracted Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Raw Ticket Panel */}
                <div>
                  <TicketPane
                    ticketId={selectedItem.ticket_id}
                    ticket={selectedItem.ticket}
                  />
                </div>

                {/* Extracted Fields Editor */}
                <div className="bg-[#161922] border border-[#262a36] rounded-md p-4 space-y-4">
                  <div className="border-b border-[#262a36] pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#f3f4f6] text-sm">
                        Extracted Fields
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving && (
                        <span className="text-xs text-[#94a3b8]">
                          Saving...
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsRerunOpen(true)}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#f3f4f6] bg-[#161922] hover:bg-[#1e222f] border border-[#262a36] transition-colors cursor-pointer"
                        title="Re-run extraction pipeline for this record"
                      >
                        Re-run
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

              {/* Collapsible Raw Model Outputs */}
              <RawOutputPanel
                rawOutputs={selectedItem.raw_outputs || []}
                validationErrors={selectedItem.validation_errors || []}
                status={selectedItem.status}
                attempts={selectedItem.attempts}
              />
            </>
          ) : (
            <div className="p-12 border border-[#262a36] rounded-md bg-[#161922] text-center text-[#94a3b8] text-sm">
              Select a ticket from the left column to view raw content and review fields.
            </div>
          )}
        </div>
      </div>

      {/* Re-run Modal */}
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

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
