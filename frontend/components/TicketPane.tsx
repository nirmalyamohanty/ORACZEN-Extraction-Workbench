import { TicketSnippet } from "@/lib/types";
import { Mail, Globe, MessageSquare, Phone, Calendar, User } from "lucide-react";

interface TicketPaneProps {
  ticketId: string;
  ticket: TicketSnippet;
}

export function TicketPane({ ticketId, ticket }: TicketPaneProps) {
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
        return <Mail className="w-3.5 h-3.5 text-[#94a3b8]" />;
      case "web_form":
        return <Globe className="w-3.5 h-3.5 text-[#94a3b8]" />;
      case "chat":
        return <MessageSquare className="w-3.5 h-3.5 text-[#94a3b8]" />;
      case "phone_transcript":
        return <Phone className="w-3.5 h-3.5 text-[#94a3b8]" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#161922] border border-[#262a36] rounded-md p-4 flex flex-col h-full space-y-4">
      {/* Header metadata */}
      <div className="border-b border-[#262a36] pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-[#f3f4f6] bg-[#0d0f14] px-2 py-0.5 rounded border border-[#262a36]">
            {ticketId}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-[#1e222f] text-[#94a3b8] border border-[#262a36]">
            {getChannelIcon(ticket.channel)}
            <span>{ticket.channel.replace("_", " ")}</span>
          </span>
        </div>

        <h3 className="font-semibold text-[#f3f4f6] text-base leading-snug">
          {ticket.subject || <span className="text-[#64748b] italic">(no subject)</span>}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#94a3b8] pt-1">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
            <span className="truncate">{ticket.from_email || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#64748b] shrink-0" />
            <span>{formatDate(ticket.received_at)}</span>
          </div>
        </div>
      </div>

      {/* Raw Body monospace pane */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1.5 font-medium">
          <span>Ticket text</span>
          <span className="text-[11px] text-[#64748b] italic">
            dimmed = quoted text
          </span>
        </div>
        <div
          tabIndex={0}
          aria-label="Raw ticket text view"
          className="flex-1 overflow-y-auto max-h-[500px] bg-[#0d0f14] p-3.5 rounded-md border border-[#262a36] font-mono text-xs text-[#f3f4f6] leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        >
          {lines.map((line, idx) => {
            const isQuoted =
              line.trimStart().startsWith(">") ||
              (line.trimStart().startsWith("On ") && line.includes("wrote:"));
            return (
              <div
                key={idx}
                className={
                  isQuoted
                    ? "text-[#64748b] select-text"
                    : "text-[#f3f4f6] select-text"
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
