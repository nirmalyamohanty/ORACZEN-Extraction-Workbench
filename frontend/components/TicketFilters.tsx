"use client";

import { Channel } from "@/lib/types";

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
    <div className="bg-[#161922] border border-[#262a36] rounded-md p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search ticket ID, subject, email or body..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0d0f14] border border-[#262a36] rounded-md text-sm text-[#f3f4f6] placeholder-[#64748b] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] transition-colors"
          />
        </div>

        {/* Channel filter */}
        <div className="min-w-[150px]">
          <select
            value={selectedChannel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0d0f14] border border-[#262a36] rounded-md text-sm text-[#f3f4f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] cursor-pointer"
          >
            {channels.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#161922] text-[#f3f4f6]">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Attachments filter */}
        <label className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#f3f4f6] cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={hasAttachmentsOnly}
            onChange={(e) => onAttachmentsOnlyChange(e.target.checked)}
            className="rounded border-[#262a36] bg-[#0d0f14] text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer"
          />
          <span>Has attachments</span>
        </label>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#262a36]">
        <button
          type="button"
          onClick={onSelectAll}
          className="px-3 py-1.5 text-xs font-semibold text-[#f3f4f6] bg-[#161922] hover:bg-[#1e222f] rounded-md border border-[#262a36] transition-colors cursor-pointer"
        >
          Select all matching ({totalFiltered})
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            className="px-2 py-1.5 text-xs text-[#94a3b8] hover:text-[#f3f4f6] transition-colors cursor-pointer"
          >
            Clear ({selectedCount})
          </button>
        )}
      </div>
    </div>
  );
}
