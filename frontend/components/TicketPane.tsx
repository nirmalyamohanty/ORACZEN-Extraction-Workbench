import { TicketSnippet } from "@/lib/types";
import { Mail, Globe, MessageSquare, Phone, Calendar, User } from "lucide-react";

// displays the original raw ticket details alongside the extraction form
// so the reviewer can look at the original email/chat while editing fields
interface TicketPaneProps {
  ticketId: string;
  ticket: TicketSnippet;
}

export function TicketPane({ ticketId, ticket }: TicketPaneProps) {
  // split ticket body by line so we can detect quoted email replies line-by-line
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
        return <Mail className="w-3.5 h-3.5 text-[#57534e]" />;
      case "web_form":
        return <Globe className="w-3.5 h-3.5 text-[#57534e]" />;
      case "chat":
        return <MessageSquare className="w-3.5 h-3.5 text-[#57534e]" />;
      case "phone_transcript":
        return <Phone className="w-3.5 h-3.5 text-[#57534e]" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-[#eae6de] rounded-lg p-4 flex flex-col h-full space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* top card metadata */}
      <div className="border-b border-[#eae6de] pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-[#1c1917] bg-[#fbf9f5] px-2 py-0.5 rounded border border-[#eae6de]">
            {ticketId}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-[#f5f2eb] text-[#57534e] border border-[#eae6de]">
            {getChannelIcon(ticket.channel)}
            <span className="font-medium">{ticket.channel.replace("_", " ")}</span>
          </span>
        </div>

        <h3 className="font-semibold text-[#1c1917] text-base leading-snug">
          {ticket.subject || <span className="text-[#8c857b] italic font-normal">(no subject)</span>}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#57534e] pt-1">
          <div className="flex items-center gap-1.5 truncate font-mono">
            <User className="w-3.5 h-3.5 text-[#8c857b] shrink-0" />
            <span className="truncate">{ticket.from_email || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-[#8c857b] shrink-0" />
            <span>{formatDate(ticket.received_at)}</span>
          </div>
        </div>
      </div>

      {/* scrollable monospace box for raw ticket body text */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between text-xs text-[#57534e] mb-1.5 font-medium">
          <span>Source message content</span>
          <span className="text-[11px] text-[#8c857b] italic font-mono">
            dimmed = quoted reply
          </span>
        </div>
        <div
          tabIndex={0}
          aria-label="Raw ticket text view"
          className="flex-1 overflow-y-auto max-h-[500px] bg-[#fbf9f5] p-3.5 rounded-md border border-[#eae6de] font-mono text-xs text-[#1c1917] leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-[#15803d]"
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
                    ? "text-[#8c857b] select-text bg-[#f5f2eb]/50 pl-1 border-l border-[#d6d0c4]"
                    : "text-[#1c1917] select-text"
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
