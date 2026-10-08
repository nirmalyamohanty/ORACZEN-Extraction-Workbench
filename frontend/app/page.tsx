"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TicketSummary } from "@/lib/types";
import { listTickets, createJob, ApiError } from "@/lib/api";
import { TicketFilters } from "@/components/TicketFilters";
import { TicketTable } from "@/components/TicketTable";
import { SelectionBar } from "@/components/SelectionBar";
import { Loader2 } from "lucide-react";

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState<boolean>(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch tickets
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTickets({
        q: debouncedQuery || undefined,
        channel: selectedChannel || undefined,
        limit: 200, // Load full dataset (150 tickets)
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

  useEffect(() => {
    fetchTickets();
  }, [debouncedQuery, selectedChannel]);

  // Client-side attachment filtering
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
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 pb-24 space-y-4">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#f3f4f6]">
            Tickets
          </h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            Choose tickets to run extraction on.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="self-start sm:self-auto px-3 py-1.5 rounded-md text-xs font-semibold text-[#f3f4f6] bg-[#161922] border border-[#262a36] hover:bg-[#1e222f] transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Filter and search bar */}
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

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-md bg-[#7f1d1d]/30 border border-[#b91c1c]/50 text-[#f87171] flex items-center justify-between text-sm">
          <span>{error}</span>
          <button
            onClick={fetchTickets}
            className="px-2.5 py-1 rounded bg-[#161922] border border-[#b91c1c]/50 text-xs font-semibold text-[#f87171] hover:bg-[#7f1d1d]/30 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="p-3 rounded-md bg-[#7f1d1d]/30 border border-[#b91c1c]/50 text-[#f87171] text-sm">
          {submitError}
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="py-20 flex flex-col items-center justify-center text-[#94a3b8] gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
          <p className="text-sm">Loading tickets...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayedTickets.length === 0 && (
        <div className="py-20 text-center border border-[#262a36] rounded-md bg-[#161922] p-6">
          <p className="text-sm font-semibold text-[#f3f4f6]">No tickets match</p>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or clearing channel and attachment filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedChannel("");
              setHasAttachmentsOnly(false);
            }}
            className="mt-3 px-3 py-1.5 rounded-md text-xs font-semibold text-[#3b82f6] bg-[#161922] hover:bg-[#1e222f] border border-[#262a36] transition-colors cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Data table */}
      {!loading && !error && displayedTickets.length > 0 && (
        <TicketTable
          tickets={displayedTickets}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAllVisible={toggleAllVisible}
        />
      )}

      {/* Sticky selection bar */}
      <SelectionBar
        selectedCount={selectedIds.size}
        totalTickets={tickets.length}
        onStartExtraction={handleStartExtraction}
        isLoading={submitting}
      />
    </div>
  );
}
