"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TicketSummary } from "@/lib/types";
import { listTickets, createJob, ApiError } from "@/lib/api";
import { TicketFilters } from "@/components/TicketFilters";
import { TicketTable } from "@/components/TicketTable";
import { SelectionBar } from "@/components/SelectionBar";
import { Loader2, RotateCw, AlertCircle } from "lucide-react";

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState<boolean>(false);

  // selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<boolean>(false);

  // debounce search input 250ms so fast keystrokes don't flood the backend
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      // our seed mock dataset contains 150 tickets, so limit 200 fetches all of them
      const res = await listTickets({
        q: debouncedQuery || undefined,
        channel: selectedChannel || undefined,
        limit: 200,
        offset: 0,
      });
      setTickets(res.items);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to fetch tickets: ${err.message}`);
      } else {
        setError("Network error connecting to backend API.");
      }
    } finally {
      setLoading(false);
    }
  };

  // re-fetch whenever the debounced search text or channel filter changes
  useEffect(() => {
    fetchTickets();
  }, [debouncedQuery, selectedChannel]);

  // attachment filter done in-memory since all 150 tickets are already in memory
  const displayedTickets = useMemo(() => {
    if (!hasAttachmentsOnly) return tickets;
    return tickets.filter((t) => t.attachments > 0);
  }, [tickets, hasAttachmentsOnly]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllVisible = (select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) {
        displayedTickets.forEach((t) => next.add(t.id));
      } else {
        displayedTickets.forEach((t) => next.delete(t.id));
      }
      return next;
    });
  };

  const selectAllMatching = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      displayedTickets.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleStartExtraction = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ticketIds = Array.from(selectedIds);
      const res = await createJob(ticketIds);
      // forward user directly to the live review workbench for this job
      router.push(`/jobs/${res.job_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(`Failed to start job: ${err.message}`);
      } else {
        setSubmitError("Unexpected error starting extraction job.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 pb-28 space-y-4">
      {/* workbench page title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-[#1c1917]">
              Customer Support Tickets
            </h1>
            <span className="font-mono text-[11px] font-medium text-[#57534e] bg-[#f5f2eb] px-2 py-0.5 rounded-full border border-[#eae6de]">
              {total} available
            </span>
          </div>
          <p className="text-xs text-[#57534e] mt-0.5">
            Select incoming tickets to extract structured data into the review queue.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#1c1917] bg-white border border-[#eae6de] hover:bg-[#f5f2eb] transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <RotateCw className="w-3 h-3 text-[#57534e]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* filter toolbar */}
      <TicketFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedChannel={selectedChannel}
        onChannelChange={setSelectedChannel}
        hasAttachmentsOnly={hasAttachmentsOnly}
        onAttachmentsOnlyChange={setHasAttachmentsOnly}
        onSelectAll={selectAllMatching}
        onClearSelection={clearSelection}
        selectedCount={selectedIds.size}
        totalFiltered={displayedTickets.length}
      />

      {error && (
        <div className="p-3 rounded-lg bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTickets}
            className="px-2.5 py-1 rounded bg-white border border-[#fecaca] text-xs font-semibold text-[#991b1b] hover:bg-[#fee2e2] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {submitError && (
        <div className="p-3 rounded-lg bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {loading && !error && (
        <div className="py-24 flex flex-col items-center justify-center text-[#57534e] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#15803d]" />
          <p className="text-xs font-mono">Loading tickets...</p>
        </div>
      )}

      {/* empty results card */}
      {!loading && !error && displayedTickets.length === 0 && (
        <div className="py-20 text-center border border-[#eae6de] rounded-lg bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-sm font-semibold text-[#1c1917]">No tickets found</p>
          <p className="text-xs text-[#57534e] mt-1 max-w-sm mx-auto">
            No tickets match your active search terms or channel filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedChannel("");
              setHasAttachmentsOnly(false);
            }}
            className="mt-3 px-3 py-1.5 rounded-md text-xs font-medium text-[#15803d] bg-white hover:bg-[#f5f2eb] border border-[#eae6de] transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {!loading && !error && displayedTickets.length > 0 && (
        <TicketTable
          tickets={displayedTickets}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAllVisible={toggleAllVisible}
        />
      )}

      {/* floating bottom dock for triggering batch extraction */}
      <SelectionBar
        selectedCount={selectedIds.size}
        totalTickets={tickets.length}
        onStartExtraction={handleStartExtraction}
        isLoading={submitting}
      />
    </div>
  );
}
