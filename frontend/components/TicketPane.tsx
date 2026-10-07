import { TicketSnippet } from "@/lib/types";
import { Mail, Globe, MessageSquare, Phone, Calendar, User, Tag } from "lucide-react";

interface TicketPaneProps {
  ticketId: string;
  ticket: TicketSnippet;
}

export function TicketPane({ ticketId, ticket }: TicketPaneProps) {
  // Format body lines, identifying quoted lines (lines starting with '>')
  const lines = ticket.body.split("\n");

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString();
    } catch {
      return isoStr;
    }
  };

  const getChannelIcon = (ch: string) => {
    switch (ch) {
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col h-full space-y-3">
      {/* Header metadata */}
      <div className="border-b border-slate-800 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {ticketId}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
            {getChannelIcon(ticket.channel)}
            <span>{ticket.channel.replace("_", " ")}</span>
          </span>
        </div>

        <h3 className="font-semibold text-slate-100 text-base leading-snug">
          {ticket.subject || <span className="text-slate-500 italic">(no subject)</span>}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{ticket.from_email || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{formatDate(ticket.received_at)}</span>
          </div>
        </div>
      </div>

      {/* Raw Body monospace pane */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>Raw ticket text</span>
          <span className="text-[11px] text-slate-500 italic">
            (dimmed lines = quoted chain ignored by model)
          </span>
        </div>
        <div
          tabIndex={0}
          aria-label="Raw ticket text view"
          className="flex-1 overflow-y-auto max-h-[500px] bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-slate-700"
        >
          {lines.map((line, idx) => {
            const isQuoted =
              line.trimStart().startsWith(">") ||
              line.trimStart().startsWith("On ") && line.includes("wrote:");
            return (
              <div
                key={idx}
                className={
                  isQuoted
                    ? "text-slate-600 bg-slate-900/40 px-1 rounded select-text"
                    : "text-slate-200 select-text"
                }
              >
                {line || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
