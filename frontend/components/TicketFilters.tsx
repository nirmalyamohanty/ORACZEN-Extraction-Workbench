"use client";

import { Channel } from "@/lib/types";
import { Search, Paperclip, X } from "lucide-react";

// toolbar component for filtering and bulk-selecting tickets
// engineered to feel like a fast, responsive developer search strip
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
    <div className="bg-white border border-[#eae6de] rounded-lg p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* search input with inline icon and quick clear */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#8c857b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets by ID, subject, email, or content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-[#fbf9f5] border border-[#eae6de] rounded-md text-xs text-[#1c1917] placeholder-[#8c857b] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#15803d] focus:border-[#15803d] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c857b] hover:text-[#1c1917] p-0.5"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* channel filter dropdown */}
        <div className="min-w-[140px]">
          <select
            value={selectedChannel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-[#fbf9f5] hover:bg-white border border-[#eae6de] rounded-md text-xs text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#15803d] focus:border-[#15803d] cursor-pointer transition-colors"
          >
            {channels.map((c) => (
              <option key={c.value} value={c.value} className="bg-white text-[#1c1917]">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* attachment toggle pill button */}
        <button
          type="button"
          onClick={() => onAttachmentsOnlyChange(!hasAttachmentsOnly)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer select-none ${
            hasAttachmentsOnly
              ? "bg-[#dcfce7] border-[#bbf7d0] text-[#166534]"
              : "bg-[#fbf9f5] hover:bg-white border-[#eae6de] text-[#57534e]"
          }`}
        >
          <Paperclip className="w-3 h-3 text-current" />
          <span>Has attachments</span>
        </button>
      </div>

      {/* selection controls */}
      <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#eae6de]">
        <button
          type="button"
          onClick={onSelectAll}
          className="px-2.5 py-1.5 text-xs font-medium text-[#1c1917] bg-[#fbf9f5] hover:bg-white rounded-md border border-[#eae6de] transition-colors cursor-pointer"
        >
          Select all ({totalFiltered})
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            className="px-2 py-1.5 text-xs text-[#57534e] hover:text-[#1c1917] transition-colors cursor-pointer"
          >
            Clear ({selectedCount})
          </button>
        )}
      </div>
    </div>
  );
}
