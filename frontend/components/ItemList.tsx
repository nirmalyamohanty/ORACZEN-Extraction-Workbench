"use client";

import { useState, useMemo } from "react";
import { JobResultItem } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Flag as FlagIcon, UserCheck, AlertTriangle } from "lucide-react";

export function sortItemsForReview(items: JobResultItem[]): JobResultItem[] {
  return [...items].sort((a, b) => {
    // 1. Unresolved needs_review items always on top
    const aUnresolved = a.status === "needs_review" && !a.resolved;
    const bUnresolved = b.status === "needs_review" && !b.resolved;
    if (aUnresolved && !bUnresolved) return -1;
    if (!aUnresolved && bUnresolved) return 1;

    // 2. Failed items next
    const aFailed = a.status === "failed";
    const bFailed = b.status === "failed";
    if (aFailed && !bFailed) return -1;
    if (!aFailed && bFailed) return 1;

    // 3. Resolved needs_review items
    const aResolvedReview = a.status === "needs_review" && a.resolved;
    const bResolvedReview = b.status === "needs_review" && b.resolved;
    if (aResolvedReview && !bResolvedReview) return -1;
    if (!aResolvedReview && bResolvedReview) return 1;

    // 4. Done items
    const aDone = a.status === "done";
    const bDone = b.status === "done";
    if (aDone && !bDone) return -1;
    if (!aDone && bDone) return 1;

    // 5. Default by ticket_id
    return a.ticket_id.localeCompare(b.ticket_id);
  });
}

interface ItemListProps {
  items: JobResultItem[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
}

export function ItemList({
  items,
  selectedTicketId,
  onSelectTicket,
}: ItemListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [humanEditedOnly, setHumanEditedOnly] = useState<boolean>(false);

  const sortedItems = useMemo(() => {
    return sortItemsForReview(items);
  }, [items]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      if (statusFilter !== "all") {
        if (statusFilter === "needs_review" && item.status !== "needs_review") {
          return false;
        }
        if (statusFilter === "done" && item.status !== "done") {
          return false;
        }
        if (statusFilter === "failed" && item.status !== "failed") {
          return false;
        }
      }
      if (humanEditedOnly && (!item.edited_fields || item.edited_fields.length === 0)) {
        return false;
      }
      return true;
    });
  }, [sortedItems, statusFilter, humanEditedOnly]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Filter header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/90 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>Items ({filteredItems.length})</span>
          <span className="text-[11px] text-slate-500">
            Unresolved review items first
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter buttons */}
          {(["all", "needs_review", "done", "failed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st === "all" ? "All" : st.replace("_", " ")}
            </button>
          ))}

          {/* Human edited filter */}
          <label className="flex items-center gap-1.5 ml-auto text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={humanEditedOnly}
              onChange={(e) => setHumanEditedOnly(e.target.checked)}
              className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer"
            />
            <span>Human-edited</span>
          </label>
        </div>
      </div>

      {/* Items list */}
      <div
        tabIndex={0}
        aria-label="Ticket items list"
        className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[700px] focus:outline-none focus:ring-1 focus:ring-slate-700"
      >
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No items match current filters
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = item.ticket_id === selectedTicketId;
            const isUnresolvedReview =
              item.status === "needs_review" && !item.resolved;
            const isEdited =
              item.edited_fields && item.edited_fields.length > 0;

            return (
              <div
                key={item.ticket_id}
                onClick={() => onSelectTicket(item.ticket_id)}
                className={`p-3.5 transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-slate-800/90 border-l-4 border-indigo-500"
                    : isUnresolvedReview
                    ? "bg-amber-950/20 hover:bg-amber-950/30 border-l-4 border-amber-500"
                    : "hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {item.ticket_id}
                      </span>
                      {isUnresolvedReview && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          REVIEW QUEUE
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-300 truncate font-medium">
                      {item.ticket?.subject || (
                        <span className="text-slate-500 italic">
                          (no subject)
                        </span>
                      )}
                    </div>
                  </div>

                  <StatusBadge status={item.status} resolved={item.resolved} />
                </div>

                {/* Bottom pill row */}
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                  {item.flags && item.flags.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                      <FlagIcon className="w-3 h-3 text-amber-400" />
                      <span>{item.flags.length} flag{item.flags.length > 1 ? "s" : ""}</span>
                    </span>
                  )}

                  {isEdited && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                      <UserCheck className="w-3 h-3 text-indigo-400" />
                      <span>Edited</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
