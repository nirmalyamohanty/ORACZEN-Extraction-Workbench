"use client";

import { TicketSummary } from "@/lib/types";
import { Paperclip, Mail, Globe, MessageSquare, Phone } from "lucide-react";

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

  return (
    <div className="overflow-x-auto rounded-md border border-[#e2e2dd] bg-white">
      <table className="w-full text-left text-sm text-[#1c1c1a]">
        <thead className="bg-[#f7f7f5] text-xs font-semibold text-[#6b6b66] border-b border-[#e2e2dd]">
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
                className="w-4 h-4 rounded border-[#e2e2dd] text-[#1f4fd8] focus:ring-[#1f4fd8] cursor-pointer"
              />
            </th>
            <th className="py-2.5 px-3 w-28 font-semibold">ID</th>
            <th className="py-2.5 px-3 w-32 font-semibold">Channel</th>
            <th className="py-2.5 px-3 w-64 font-semibold">Subject & Sender</th>
            <th className="py-2.5 px-3 font-semibold">Body Preview</th>
            <th className="py-2.5 px-3 w-28 font-semibold">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e2dd]">
          {tickets.map((t) => {
            const isSelected = selectedIds.has(t.id);
            return (
              <tr
                key={t.id}
                onClick={() => onToggleSelect(t.id)}
                className={`transition-colors cursor-pointer hover:bg-[#f7f7f5] ${
                  isSelected ? "bg-[#f0f4ff]" : ""
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
                    className="w-4 h-4 rounded border-[#e2e2dd] text-[#1f4fd8] focus:ring-[#1f4fd8] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#1c1c1a]">
                  {t.id}
                </td>
                <td className="py-2.5 px-3 text-xs text-[#6b6b66]">
                  {t.channel.replace("_", " ")}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-sm text-[#1c1c1a] truncate max-w-xs">
                    {t.subject || (
                      <span className="text-[#6b6b66] italic font-normal">(no subject)</span>
                    )}
                  </div>
                  <div className="text-xs text-[#6b6b66] truncate max-w-[200px] mt-0.5">
                    {t.from_email}
                    {t.attachments > 0 && ` (${t.attachments} att)`}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-sm text-[#6b6b66] line-clamp-2 max-w-md">
                  {t.body_preview}
                </td>
                <td className="py-2.5 px-3 text-xs text-[#6b6b66] whitespace-nowrap">
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
