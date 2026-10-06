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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject or ticket body..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Channel filter */}
        <div className="relative min-w-[160px]">
          <select
            value={selectedChannel}
            onChange={(e) => onChannelChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          >
            {channels.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Attachments filter */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-300 hover:text-slate-100 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasAttachmentsOnly}
            onChange={(e) => onAttachmentsOnlyChange(e.target.checked)}
            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
          />
          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
          <span>Has attachments</span>
        </label>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
        <button
          type="button"
          onClick={onSelectAll}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
          <span>Select all matching ({totalFiltered})</span>
        </button>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClearSelection}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Clear ({selectedCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
