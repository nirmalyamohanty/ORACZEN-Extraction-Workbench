"use client";

import { useState, useMemo } from "react";
import { JobResultItem } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

// sorts items so the reviewer sees most urgent actions first:
// 1. unresolved reviews (priority)
// 2. failed items
// 3. resolved reviews
// 4. clean automated extractions (done)
export function sortItemsForReview(items: JobResultItem[]): JobResultItem[] {
  return [...items].sort((a, b) => {
    const aUnresolved = a.status === "needs_review" && !a.resolved;
    const bUnresolved = b.status === "needs_review" && !b.resolved;
    if (aUnresolved && !bUnresolved) return -1;
    if (!aUnresolved && bUnresolved) return 1;

    const aFailed = a.status === "failed";
    const bFailed = b.status === "failed";
    if (aFailed && !bFailed) return -1;
    if (!aFailed && bFailed) return 1;

    const aResolvedReview = a.status === "needs_review" && a.resolved;
    const bResolvedReview = b.status === "needs_review" && b.resolved;
    if (aResolvedReview && !bResolvedReview) return -1;
    if (!aResolvedReview && bResolvedReview) return 1;

    const aDone = a.status === "done";
    const bDone = b.status === "done";
    if (aDone && !bDone) return -1;
    if (!aDone && bDone) return 1;

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
        if (statusFilter === "needs_review" && item.status !== "needs_review") return false;
        if (statusFilter === "done" && item.status !== "done") return false;
        if (statusFilter === "failed" && item.status !== "failed") return false;
      }
      if (humanEditedOnly && (!item.edited_fields || item.edited_fields.length === 0)) {
        return false;
      }
      return true;
    });
  }, [sortedItems, statusFilter, humanEditedOnly]);

  return (
    <div className="flex flex-col h-full bg-white border border-[#eae6de] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* queue header and filter bar */}
      <div className="p-3 border-b border-[#eae6de] bg-[#fbf9f5] space-y-2.5">
        <div className="flex items-center justify-between text-xs font-medium text-[#1c1917]">
          <span className="font-semibold tracking-tight">Review Queue</span>
          <span className="font-mono text-[11px] text-[#57534e] bg-white px-1.5 py-0.5 rounded border border-[#eae6de]">
            {filteredItems.length} items
          </span>
        </div>

        {/* segmented status tabs */}
        <div className="flex items-center gap-1 bg-[#f5f2eb] p-0.5 rounded-md text-xs">
          {(
            [
              { id: "all", label: "All" },
              { id: "needs_review", label: "Review" },
              { id: "done", label: "Done" },
              { id: "failed", label: "Failed" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-1 py-1 rounded text-[11px] font-medium transition-all cursor-pointer text-center ${
                statusFilter === tab.id
                  ? "bg-white text-[#1c1917] font-semibold shadow-xs"
                  : "text-[#57534e] hover:text-[#1c1917]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* edited by reviewer toggle */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-1.5 text-[11px] text-[#57534e] hover:text-[#1c1917] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={humanEditedOnly}
              onChange={(e) => setHumanEditedOnly(e.target.checked)}
              className="rounded border-[#d6d0c4] bg-[#fbf9f5] text-[#15803d] focus:ring-[#15803d] cursor-pointer w-3.5 h-3.5"
            />
            <span>Edited records only</span>
          </label>
        </div>
      </div>

      {/* scrollable queue list */}
      <div
        tabIndex={0}
        aria-label="Ticket items list"
        className="flex-1 overflow-y-auto divide-y divide-[#eae6de] max-h-[680px] focus:outline-none focus:ring-1 focus:ring-[#15803d] bg-white"
      >
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8c857b]">
            No items in queue matching filter
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = item.ticket_id === selectedTicketId;
            const isUnresolvedReview = item.status === "needs_review" && !item.resolved;
            const isEdited = item.edited_fields && item.edited_fields.length > 0;

            return (
              <div
                key={item.ticket_id}
                onClick={() => onSelectTicket(item.ticket_id)}
                className={`p-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#f0fdf4] border-l-3 border-[#15803d]"
                    : isUnresolvedReview
                    ? "bg-[#fffdf7] hover:bg-[#fef9ee] border-l-3 border-[#d97706]"
                    : "bg-white hover:bg-[#fbf9f5] border-l-3 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-mono text-xs font-semibold text-[#1c1917]">
                      {item.ticket_id}
                    </span>
                    <div className="text-xs text-[#1c1917] truncate font-medium">
                      {item.ticket?.subject || (
                        <span className="text-[#8c857b] italic font-normal">(no subject)</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={item.status} resolved={item.resolved} />
                </div>

                <div className="flex items-center gap-2 mt-2 text-[11px] text-[#57534e]">
                  {item.flags && item.flags.length > 0 && (
                    <span className="text-[#92400e] font-medium bg-[#fef3c7] px-1.5 py-0.2 rounded border border-[#fde68a] text-[10px]">
                      {item.flags.length} flag{item.flags.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {isEdited && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#f5f2eb] text-[#57534e] border border-[#eae6de]">
                      Manual edit
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
