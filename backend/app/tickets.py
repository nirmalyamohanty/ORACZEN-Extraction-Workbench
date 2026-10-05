"""Load tickets from JSONL once and serve lookups."""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.config import settings
from app.schemas import Ticket, TicketSummary

_tickets_by_id: dict[str, Ticket] = {}


def _collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def body_preview(body: str, max_len: int = 200) -> str:
    collapsed = _collapse_whitespace(body)
    if len(collapsed) <= max_len:
        return collapsed
    return collapsed[: max_len - 3] + "..."


def load_tickets(path: Path | None = None) -> None:
    """Parse tickets.jsonl into memory. Safe to call once at startup."""
    global _tickets_by_id
    file_path = path or Path(settings.TICKETS_PATH)
    tickets: dict[str, Ticket] = {}
    with file_path.open(encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                ticket = Ticket.model_validate(data)
            except Exception as exc:
                raise ValueError(f"Invalid ticket on line {line_no}: {exc}") from exc
            if ticket.id in tickets:
                raise ValueError(f"Duplicate ticket id {ticket.id} on line {line_no}")
            tickets[ticket.id] = ticket
    _tickets_by_id = tickets


def list_tickets(
    *,
    q: str | None = None,
    channel: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[TicketSummary], int]:
    items = list(_tickets_by_id.values())
    if channel:
        items = [t for t in items if t.channel == channel]
    if q:
        needle = q.lower()
        items = [
            t
            for t in items
            if needle in t.subject.lower() or needle in t.body.lower()
        ]
    total = len(items)
    items.sort(key=lambda t: t.received_at, reverse=True)
    page = items[offset : offset + limit]
    summaries = [
        TicketSummary(
            id=t.id,
            subject=t.subject,
            channel=t.channel,
            received_at=t.received_at,
            from_email=t.from_email,
            attachments=t.attachments,
            body_preview=body_preview(t.body),
        )
        for t in page
    ]
    return summaries, total


def get_ticket(ticket_id: str) -> Ticket | None:
    return _tickets_by_id.get(ticket_id)


def all_ticket_ids() -> list[str]:
    return list(_tickets_by_id.keys())
