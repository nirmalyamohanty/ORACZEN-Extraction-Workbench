"use client";

import { Channel } from "@/lib/types";
import { Search, Filter, CheckSquare, Square, Paperclip } from "lucide-react";

interface TicketFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
  hasAttachmentsOnly: boolean;
  onAttachmentsOnlyChange: (val: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  selectedCount: number;
  totalFiltered: number;
}

export function TicketFilters({
  searchQuery,
  onSearchChange,
  selectedChannel,
  onChannelChange,
  hasAttachmentsOnly,
  onAttachmentsOnlyChange,
  onSelectAll,
  onClearSelection,
  selectedCount,
  totalFiltered,
}: TicketFiltersProps) {
  const channels: { label: string; value: string }[] = [
    { label: "All Channels", value: "" },
    { label: "Email", value: "email" },
    { label: "Web Form", value: "web_form" },
    { label: "Chat", value: "chat" },
    { label: "Phone Transcript", value: "phone_transcript" },
  ];

  return (
    <div className="bg-white border border-[#e2e2dd] rounded-md p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search subject or ticket body..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#e2e2dd] rounded-md text-sm text-[#1c1c1a] placeholder-[#6b6b66] focus:outline-none focus:ring-2 focus:ring-[#1f4fd8] transition-colors"
          />
        </div>

        {/* Channel filter */}
        <div className="min-w-[150px]">
          <select
            value={selectedChannel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#e2e2dd] rounded-md text-sm text-[#1c1c1a] focus:outline-none focus:ring-2 focus:ring-[#1f4fd8] cursor-pointer"
          >
            {channels.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Attachments filter */}
        <label className="flex items-center gap-2 text-sm text-[#1c1c1a] cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={hasAttachmentsOnly}
            onChange={(e) => onAttachmentsOnlyChange(e.target.checked)}
            className="rounded border-[#e2e2dd] text-[#1f4fd8] focus:ring-[#1f4fd8] cursor-pointer"
          />
          <span>Has attachments</span>
        </label>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#e2e2dd]">
        <button
          type="button"
          onClick={onSelectAll}
          className="px-3 py-1.5 text-xs font-semibold text-[#1c1c1a] bg-white hover:bg-[#f7f7f5] rounded-md border border-[#e2e2dd] transition-colors cursor-pointer"
        >
          Select all matching ({totalFiltered})
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            className="px-2 py-1.5 text-xs text-[#6b6b66] hover:text-[#1c1c1a] transition-colors cursor-pointer"
          >
            Clear ({selectedCount})
          </button>
        )}
      </div>
    </div>
  );
}
