"use client";

import { useState, useMemo } from "react";
import { JobResultItem } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

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
    <div className="flex flex-col h-full bg-white border border-[#e2e2dd] rounded-md overflow-hidden">
      {/* Filter header */}
      <div className="p-3 border-b border-[#e2e2dd] bg-[#ffffff] space-y-2.5">
        <div className="flex items-center justify-between text-xs font-medium text-[#1c1c1a]">
          <span className="font-semibold">Items ({filteredItems.length})</span>
          <span className="text-[11px] text-[#6b6b66]">
            Review queue first
          </span>
        </div>

        {/* Tab filters */}
        <div className="flex items-center border-b border-[#e2e2dd] text-xs gap-3">
          {(
            [
              { id: "all", label: "All" },
              { id: "needs_review", label: "Needs review" },
              { id: "done", label: "Done" },
              { id: "failed", label: "Failed" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`pb-1.5 font-medium transition-colors cursor-pointer relative ${
                statusFilter === tab.id
                  ? "text-[#1c1c1a] border-b-2 border-[#1f4fd8] font-semibold"
                  : "text-[#6b6b66] hover:text-[#1c1c1a]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Human edited filter */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-1.5 text-xs text-[#6b6b66] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={humanEditedOnly}
              onChange={(e) => setHumanEditedOnly(e.target.checked)}
              className="rounded border-[#e2e2dd] text-[#1f4fd8] focus:ring-[#1f4fd8] cursor-pointer"
            />
            <span>Edited by me</span>
          </label>
        </div>
      </div>

      {/* Items list */}
      <div
        tabIndex={0}
        aria-label="Ticket items list"
        className="flex-1 overflow-y-auto divide-y divide-[#e2e2dd] max-h-[700px] focus:outline-none focus:ring-1 focus:ring-[#1f4fd8]"
      >
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6b6b66]">
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
                className={`p-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#f7f7f5] border-l-2 border-[#1f4fd8]"
                    : isUnresolvedReview
                    ? "bg-[#fffbeb]/50 hover:bg-[#fffbeb] border-l-2 border-[#f59e0b]"
                    : "bg-white hover:bg-[#f7f7f5] border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#1c1c1a]">
                        {item.ticket_id}
                      </span>
                    </div>

                    <div className="text-xs text-[#1c1c1a] truncate font-medium">
                      {item.ticket?.subject || (
                        <span className="text-[#6b6b66] italic">
                          (no subject)
                        </span>
                      )}
                    </div>
                  </div>

                  <StatusBadge status={item.status} resolved={item.resolved} />
                </div>

                {/* Bottom pill row */}
                <div className="flex items-center gap-2 mt-2 text-[11px] text-[#6b6b66]">
                  {item.flags && item.flags.length > 0 && (
                    <span className="text-[#b45309] font-medium">
                      {item.flags.length} flag{item.flags.length > 1 ? "s" : ""}
                    </span>
                  )}

                  {isEdited && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]">
                      Edited
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
