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
import {
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Ban,
  CheckCircle,
  RotateCw,
  HelpCircle,
} from "lucide-react";
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
    reconnecting,
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

    // Snapshot of the current item for rollback on 422 / error
    const snapshotItem: JobResultItem = JSON.parse(JSON.stringify(selectedItem));

    // 1. Optimistic update: reflect change in UI state immediately
    mutateResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => {
          if (it.record_id !== selectedItem.record_id) return it;
          const nextRecord = it.record ? { ...it.record, [field]: value } : null;
          const nextDraft = it.draft
            ? { ...it.draft, [field]: value }
            : !it.record
            ? { [field]: value }
            : null;
          const nextEdited = Array.from(new Set([...it.edited_fields, field]));
          const nextMeta = {
            ...it.field_meta,
            [field]: {
              confidence: 1.0,
              grounded: true,
              evidence: it.field_meta[field]?.evidence || null,
              source: "human" as const,
              note: "edited by reviewer",
            },
          };
          return {
            ...it,
            record: nextRecord as ExtractedRecord | null,
            draft: nextDraft,
            edited_fields: nextEdited,
            field_meta: nextMeta,
          };
        }),
      };
    });

    // Clear any previous error on this field
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    try {
      // 2. Execute PATCH request against backend
      const updatedItem = await patchRecord(selectedItem.record_id, {
        [field]: value,
      } as unknown as Partial<ExtractedRecord>);

      // 3. Keep change and sync with authoritative server response
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
      // 4. Rollback immediately to snapshot state on 422 or network failure
      mutateResults((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((it) =>
            it.record_id === snapshotItem.record_id ? snapshotItem : it
          ),
        };
      });

      // Show server validation error under that specific field
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
      <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading job {jobId}...</p>
      </div>
    );
  }

  // 404 or Error state
  if (error && !job) {
    return (
      <div className="flex-1 max-w-2xl mx-auto p-8 my-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Job Not Found</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Tickets</span>
          </Link>
        </div>
      </div>
    );
  }

  const exportUrl = getExportCsvUrl(jobId);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Job Review
              </h1>
              <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {jobId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side verification and inline corrections of model extractions
            </p>
          </div>
        </div>

        {/* Action buttons: Shortcuts, Export CSV, Cancel */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            title="Keyboard shortcuts (?)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Shortcuts (?)</span>
          </button>

          {job && (job.status === "queued" || job.status === "running") && (
            <button
              onClick={handleCancelJob}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/60 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Job</span>
            </button>
          )}

          <a
            href={exportUrl}
            download
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Live Progress Bar */}
      {job && (
        <ProgressBar
          progress={job.progress}
          status={job.status}
          reconnecting={reconnecting}
        />
      )}

      {/* Main Two-Column Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
              {/* Header of review pane with Flags & Toast */}
              <div className="space-y-3">
                {saveSuccessMsg && (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-lg animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Flags list at top */}
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
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
                  <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm">
                        Extracted Fields
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Edit values inline. Press Enter or blur to save.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSaving && (
                        <span className="flex items-center gap-1 text-[11px] text-indigo-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsRerunOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 transition-colors shadow-sm cursor-pointer"
                        title="Re-run extraction pipeline for this record"
                      >
                        <RotateCw className="w-3 h-3" />
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

              {/* Collapsible Raw Model Outputs for needs_review or transparency */}
              <RawOutputPanel
                rawOutputs={selectedItem.raw_outputs || []}
                validationErrors={selectedItem.validation_errors || []}
              />
            </>
          ) : (
            <div className="p-16 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-sm">
              Select a ticket from the left column to view raw content and review fields.
            </div>
          )}
        </div>
      </div>

      {/* Re-run Modal (O3) */}
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
            setTimeout(() => setSaveSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal (O4) */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
