"use client";

import { TicketSummary } from "@/lib/types";

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
    <div className="overflow-x-auto rounded-md border border-[#262a36] bg-[#161922]">
      <table className="w-full text-left text-sm text-[#f3f4f6]">
        <thead className="bg-[#12141c] text-xs font-semibold text-[#94a3b8] border-b border-[#262a36]">
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
                className="w-4 h-4 rounded border-[#262a36] bg-[#0d0f14] text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer"
              />
            </th>
            <th className="py-2.5 px-3 w-28 font-semibold">ID</th>
            <th className="py-2.5 px-3 w-32 font-semibold">Channel</th>
            <th className="py-2.5 px-3 w-64 font-semibold">Subject & Sender</th>
            <th className="py-2.5 px-3 font-semibold">Body Preview</th>
            <th className="py-2.5 px-3 w-28 font-semibold">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#262a36]">
          {tickets.map((t) => {
            const isSelected = selectedIds.has(t.id);
            return (
              <tr
                key={t.id}
                onClick={() => onToggleSelect(t.id)}
                className={`transition-colors cursor-pointer hover:bg-[#1e222f] ${
                  isSelected ? "bg-[#1e293b]" : ""
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
                    className="w-4 h-4 rounded border-[#262a36] bg-[#0d0f14] text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#f3f4f6]">
                  {t.id}
                </td>
                <td className="py-2.5 px-3 text-xs text-[#94a3b8]">
                  {t.channel.replace("_", " ")}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-sm text-[#f3f4f6] truncate max-w-xs">
                    {t.subject || (
                      <span className="text-[#64748b] italic font-normal">(no subject)</span>
                    )}
                  </div>
                  <div className="text-xs text-[#94a3b8] truncate max-w-[200px] mt-0.5">
                    {t.from_email}
                    {t.attachments > 0 && ` (${t.attachments} att)`}
                  </div>
                </td>
                <td className="py-2.5 px-3 max-w-md">
                  <div
                    className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed break-words"
                    title={t.body_preview}
                  >
                    {t.body_preview}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-xs text-[#94a3b8] whitespace-nowrap">
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
