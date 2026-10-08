"use client";

import { TicketSummary } from "@/lib/types";
import { Mail, Globe, MessageSquare, Phone, Paperclip } from "lucide-react";

interface TicketTableProps {
  tickets: TicketSummary[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAllVisible: (selected: boolean) => void;
}

export function TicketTable({
  tickets,
  selectedIds,
  onToggleSelect,
  onToggleAllVisible,
}: TicketTableProps) {
  const allVisibleSelected =
    tickets.length > 0 && tickets.every((t) => selectedIds.has(t.id));

  const someVisibleSelected =
    tickets.some((t) => selectedIds.has(t.id)) && !allVisibleSelected;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "email":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#57534e]">
            <Mail className="w-3 h-3 text-[#8c857b]" />
            <span>Email</span>
          </span>
        );
      case "web_form":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#57534e]">
            <Globe className="w-3 h-3 text-[#8c857b]" />
            <span>Web Form</span>
          </span>
        );
      case "chat":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#57534e]">
            <MessageSquare className="w-3 h-3 text-[#8c857b]" />
            <span>Chat</span>
          </span>
        );
      case "phone_transcript":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#57534e]">
            <Phone className="w-3 h-3 text-[#8c857b]" />
            <span>Transcript</span>
          </span>
        );
      default:
        return <span className="text-xs text-[#57534e]">{channel}</span>;
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#eae6de] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <table className="w-full text-left text-sm text-[#1c1917]">
        <thead className="bg-[#f5f2eb] text-[11px] font-semibold text-[#6b655b] uppercase tracking-wider border-b border-[#eae6de]">
          <tr>
            <th className="p-3 w-10 text-center">
              <input
                type="checkbox"
                aria-label="Select all visible tickets"
                checked={allVisibleSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someVisibleSelected;
                }}
                onChange={(e) => onToggleAllVisible(e.target.checked)}
                className="w-4 h-4 rounded border-[#d6d0c4] bg-[#fbf9f5] text-[#15803d] focus:ring-[#15803d] cursor-pointer"
              />
            </th>
            <th className="py-2.5 px-3 w-28 font-medium">Ticket ID</th>
            <th className="py-2.5 px-3 w-32 font-medium">Channel</th>
            <th className="py-2.5 px-3 w-72 font-medium">Subject &amp; Sender</th>
            <th className="py-2.5 px-3 font-medium">Body Preview</th>
            <th className="py-2.5 px-3 w-28 font-medium">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eae6de]">
          {tickets.map((t) => {
            const isSelected = selectedIds.has(t.id);
            return (
              <tr
                key={t.id}
                onClick={() => onToggleSelect(t.id)}
                className={`transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#fcf8f0] border-l-2 border-l-[#15803d]"
                    : "hover:bg-[#f8f6f0]"
                }`}
              >
                <td
                  className="p-3 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ticket ${t.id}`}
                    checked={isSelected}
                    onChange={() => onToggleSelect(t.id)}
                    className="w-4 h-4 rounded border-[#d6d0c4] bg-[#fbf9f5] text-[#15803d] focus:ring-[#15803d] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3">
                  <span className="font-mono text-xs font-semibold text-[#1c1917] bg-[#fbf9f5] px-1.5 py-0.5 rounded border border-[#eae6de]">
                    {t.id}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {getChannelBadge(t.channel)}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-xs text-[#1c1917] truncate max-w-xs">
                    {t.subject || (
                      <span className="text-[#8c857b] italic font-normal">(no subject)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#57534e] truncate max-w-[240px] mt-0.5 font-mono">
                    <span className="truncate">{t.from_email}</span>
                    {t.attachments > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#f5f2eb] text-[#57534e] text-[10px] shrink-0 font-sans">
                        <Paperclip className="w-2.5 h-2.5" />
                        {t.attachments}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 max-w-md">
                  <div
                    className="text-xs text-[#57534e] line-clamp-2 leading-relaxed break-words"
                    title={t.body_preview}
                  >
                    {t.body_preview}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-[11px] font-mono text-[#57534e] whitespace-nowrap">
                  {formatDate(t.received_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
