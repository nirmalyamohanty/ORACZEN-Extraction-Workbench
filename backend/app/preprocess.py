"""Clean ticket bodies before extraction: strip quotes, footers, parse hints."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.schemas import Ticket

# Full names seen in ticket signatures (Section 0).
KNOWN_COMPANIES: tuple[str, ...] = (
    "Bluepeak Retail",
    "Castlerock Mining",
    "Ferrolane Steel",
    "Halcyon Foods",
    "Kestrel Motors",
    "Meridian Logistics",
    "Nordvale Bank",
    "Orchid Hospitality",
    "Panacea Labs",
    "Sunbelt Utilities",
    "Trident Pharma",
    "Vireo Health",
)

_DOMAIN_TO_COMPANY: dict[str, str] = {
    "bluepeak": "Bluepeak Retail",
    "castlerock": "Castlerock Mining",
    "ferrolane": "Ferrolane Steel",
    "halcyon": "Halcyon Foods",
    "kestrel": "Kestrel Motors",
    "meridian": "Meridian Logistics",
    "nordvale": "Nordvale Bank",
    "orchid": "Orchid Hospitality",
    "panacea": "Panacea Labs",
    "sunbelt": "Sunbelt Utilities",
    "trident": "Trident Pharma",
    "vireo": "Vireo Health",
}

CONFIDENTIAL_FOOTER_PREFIX = (
    "This email and any attachments are confidential"
)

# Bodies that are too vague to send to the model (Decision 4).
_NEAR_EMPTY_STOP_LIST = frozenset({"?", "please advise"})

_ON_WROTE_RE = re.compile(r"^\s*(?:>+\s*)?On\s+.+\s+wrote:\s*$", re.IGNORECASE)
_ZEN_ADMIN_RE = re.compile(
    r"^Zen\s+(?:Orchestrator|Studio|Connect|Insights|Vault)\s+admin,\s*(.+)$",
    re.IGNORECASE,
)
_SPOKEN_COMPANY_RE = re.compile(
    r"\bthis is\s+\w+\s+from\s+(.+?)(?:\.|$)",
    re.IGNORECASE,
)
_FR_MARKERS = ("bonjour", "cordialement", "merci", "factures", "prélèvement", "facture")


@dataclass(frozen=True)
class PreparedTicket:
    customer_text: str
    signature_company: str | None
    domain_company_guess: str | None
    is_near_empty: bool
    quoted_text_removed: bool
    language_hint: str


def prepare(ticket: Ticket) -> PreparedTicket:
    """Pure preprocessing: customer-facing text plus company hints."""
    quoted_removed, without_quotes = _strip_quoted_reply_lines(ticket.body)
    customer_text = _strip_confidential_footer(without_quotes)
    customer_text = _strip_device_footers(customer_text).strip()
    signature_company = _parse_signature_company(customer_text, ticket.body)
    domain_company_guess = _domain_company_guess(ticket.from_email)
    is_near_empty = _check_near_empty(customer_text)
    language_hint = _detect_language(customer_text)
    return PreparedTicket(
        customer_text=customer_text,
        signature_company=signature_company,
        domain_company_guess=domain_company_guess,
        is_near_empty=is_near_empty,
        quoted_text_removed=quoted_removed,
        language_hint=language_hint,
    )


def _strip_quoted_reply_lines(body: str) -> tuple[bool, str]:
    kept: list[str] = []
    removed = False
    for line in body.splitlines():
        stripped = line.lstrip()
        if stripped.startswith(">"):
            removed = True
            continue
        if _ON_WROTE_RE.match(line):
            removed = True
            continue
        kept.append(line)
    return removed, "\n".join(kept)


def _strip_confidential_footer(text: str) -> str:
    lower = text.lower()
    idx = lower.find(CONFIDENTIAL_FOOTER_PREFIX.lower())
    if idx == -1:
        return text
    return text[:idx].rstrip()


def _strip_device_footers(text: str) -> str:
    lines = [line for line in text.splitlines() if line.strip().lower() != "sent from my iphone"]
    return "\n".join(lines)


def _parse_signature_company(customer_text: str, raw_body: str) -> str | None:
    # Pipe form after "--" (often before footer in raw body).
    for block in (customer_text, raw_body):
        if "--" in block:
            after = block.split("--", 1)[1]
            after = _strip_confidential_footer(after)
            for line in after.splitlines():
                line = line.strip()
                if "|" in line:
                    parts = [p.strip() for p in line.split("|")]
                    if len(parts) >= 3:
                        company = parts[-1]
                        if _is_known_company(company):
                            return company
                        return company if company else None

    for line in customer_text.splitlines():
        m = _ZEN_ADMIN_RE.match(line.strip())
        if m:
            return m.group(1).strip()

    lines = [ln.strip() for ln in customer_text.splitlines() if ln.strip()]
    for i, line in enumerate(lines):
        if "@" in line and i > 0:
            prev = lines[i - 1]
            if prev.count(",") >= 1:
                company = prev.split(",")[-1].strip()
                matched = _match_known_company(company)
                if matched:
                    return matched
                if company:
                    return company

    spoken = _SPOKEN_COMPANY_RE.search(customer_text)
    if spoken:
        name = spoken.group(1).strip()
        return _match_known_company(name) or name

    if lines:
        last = lines[-1]
        if _is_known_company(last):
            return last
        matched = _match_known_company(last)
        if matched:
            return matched

    # Last resort: find any known company name mentioned in the customer text
    for comp in KNOWN_COMPANIES:
        if re.search(r"\b" + re.escape(comp) + r"\b", customer_text, re.IGNORECASE):
            return comp

    return None


def _domain_company_guess(from_email: str) -> str | None:
    if "@" not in from_email:
        return None
    domain = from_email.split("@", 1)[1].lower()
    stem = domain.split(".", 1)[0]
    if stem in _DOMAIN_TO_COMPANY:
        return _DOMAIN_TO_COMPANY[stem]
    # Fallback: title-case stem when we have no mapping.
    return stem.replace("-", " ").title() if stem else None


def _check_near_empty(customer_text: str) -> bool:
    normalized = " ".join(customer_text.split()).strip().lower()
    if normalized in _NEAR_EMPTY_STOP_LIST:
        return True
    alpha_count = sum(1 for c in customer_text if c.isalpha())
    return alpha_count < 10


def _detect_language(text: str) -> str:
    lower = text.lower()
    if any(marker in lower for marker in _FR_MARKERS):
        return "fr"
    return "en"


def _is_known_company(name: str) -> bool:
    return name in KNOWN_COMPANIES


def _match_known_company(name: str) -> str | None:
    if name in KNOWN_COMPANIES:
        return name
    lower = name.lower()
    for company in KNOWN_COMPANIES:
        if company.lower().startswith(lower) or lower in company.lower():
            return company
    return None
