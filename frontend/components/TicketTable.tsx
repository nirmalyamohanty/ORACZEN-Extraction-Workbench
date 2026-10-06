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

  const renderChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="w-3.5 h-3.5 text-blue-400" />;
      case "web_form":
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case "chat":
        return <MessageSquare className="w-3.5 h-3.5 text-amber-400" />;
      case "phone_transcript":
        return <Phone className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return null;
    }
  };

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
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="p-4 w-12 text-center">
              <input
                type="checkbox"
                aria-label="Select all visible tickets"
                checked={allVisibleSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someVisibleSelected;
                }}
                onChange={(e) => onToggleAllVisible(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer"
              />
            </th>
            <th className="py-3 px-4 w-28">ID</th>
            <th className="py-3 px-4 w-32">Channel</th>
            <th className="py-3 px-4 w-64">Subject & Sender</th>
            <th className="py-3 px-4">Body Preview</th>
            <th className="py-3 px-4 w-28">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {tickets.map((t) => {
            const isSelected = selectedIds.has(t.id);
            return (
              <tr
                key={t.id}
                onClick={() => onToggleSelect(t.id)}
                className={`transition-colors cursor-pointer hover:bg-slate-800/40 ${
                  isSelected ? "bg-indigo-950/20" : ""
                }`}
              >
                <td
                  className="p-4 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ticket ${t.id}`}
                    checked={isSelected}
                    onChange={() => onToggleSelect(t.id)}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer"
                  />
                </td>
                <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-400">
                  {t.id}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {renderChannelIcon(t.channel)}
                    <span>{t.channel.replace("_", " ")}</span>
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-100 truncate max-w-xs">
                    {t.subject || (
                      <span className="text-slate-500 italic">(no subject)</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="truncate max-w-[180px]">{t.from_email}</span>
                    {t.attachments > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-slate-400">
                        <Paperclip className="w-3 h-3" />
                        {t.attachments}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-xs text-slate-400 line-clamp-2 max-w-md">
                  {t.body_preview}
                </td>
                <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
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
