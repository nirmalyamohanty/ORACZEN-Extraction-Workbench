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
        return <Mail className="w-3.5 h-3.5 text-[#6b6b66]" />;
      case "web_form":
        return <Globe className="w-3.5 h-3.5 text-[#6b6b66]" />;
      case "chat":
        return <MessageSquare className="w-3.5 h-3.5 text-[#6b6b66]" />;
      case "phone_transcript":
        return <Phone className="w-3.5 h-3.5 text-[#6b6b66]" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-[#e2e2dd] rounded-md p-4 flex flex-col h-full space-y-4">
      {/* Header metadata */}
      <div className="border-b border-[#e2e2dd] pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-[#1c1c1a] bg-[#f7f7f5] px-2 py-0.5 rounded border border-[#e2e2dd]">
            {ticketId}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-[#f7f7f5] text-[#4b5563] border border-[#e2e2dd]">
            {getChannelIcon(ticket.channel)}
            <span>{ticket.channel.replace("_", " ")}</span>
          </span>
        </div>

        <h3 className="font-semibold text-[#1c1c1a] text-base leading-snug">
          {ticket.subject || <span className="text-[#6b6b66] italic">(no subject)</span>}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#6b6b66] pt-1">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-[#6b6b66] shrink-0" />
            <span className="truncate">{ticket.from_email || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#6b6b66] shrink-0" />
            <span>{formatDate(ticket.received_at)}</span>
          </div>
        </div>
      </div>

      {/* Raw Body monospace pane */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between text-xs text-[#6b6b66] mb-1.5 font-medium">
          <span>Ticket text</span>
          <span className="text-[11px] text-[#9ca3af] italic">
            dimmed = quoted text
          </span>
        </div>
        <div
          tabIndex={0}
          aria-label="Raw ticket text view"
          className="flex-1 overflow-y-auto max-h-[500px] bg-[#f7f7f5] p-3.5 rounded-md border border-[#e2e2dd] font-mono text-xs text-[#1c1c1a] leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-[#1f4fd8]"
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
                    ? "text-[#9ca3af] select-text"
                    : "text-[#1c1c1a] select-text"
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
