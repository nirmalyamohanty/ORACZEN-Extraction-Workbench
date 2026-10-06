"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TicketSummary } from "@/lib/types";
import { listTickets, createJob, ApiError } from "@/lib/api";
import { TicketFilters } from "@/components/TicketFilters";
import { TicketTable } from "@/components/TicketTable";
import { SelectionBar } from "@/components/SelectionBar";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const ticketIds = Array.from(selectedIds);
      const res = await createJob(ticketIds);
      router.push(`/jobs/${res.job_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(`Failed to start job: ${err.message}`);
      } else {
        alert("Unexpected error starting extraction job.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-6 pb-28 space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Support Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Select incoming customer support tickets to run LLM extraction and
            human review.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
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
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTickets}
            className="px-3 py-1 rounded bg-red-800/50 hover:bg-red-800 text-xs font-medium text-white transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading tickets from backend...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayedTickets.length === 0 && (
        <div className="py-24 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <p className="text-base font-medium text-slate-300">No tickets match</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or clearing channel and attachment filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedChannel("");
              setHasAttachmentsOnly(false);
            }}
            className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
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
