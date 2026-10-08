"""Deterministic mock LLM: rule-based extraction for grading without API keys."""

from __future__ import annotations

import asyncio
import calendar
import hashlib
import json
import logging
import re
from datetime import date, datetime, timedelta
from typing import Any

from app.config import settings
from app.preprocess import PreparedTicket, prepare
from app.schemas import Ticket

logger = logging.getLogger(__name__)

PRODUCTS = (
    "Zen Orchestrator",
    "Zen Studio",
    "Zen Connect",
    "Zen Insights",
    "Zen Vault",
)
CATEGORY_PRIORITY = (
    "churn_risk",
    "outage",
    "billing",
    "bug",
    "feature_request",
    "how_to",
)

_ZEN_PRODUCT_RE = re.compile(
    r"zen\s+(orchestrator|studio|connect|insights|vault)",
    re.IGNORECASE,
)
_USD_AMOUNT_RE = re.compile(r"\$\s*([\d,]+(?:\.\d+)?)")
_EUR_AMOUNT_RE = re.compile(
    r"([\d\s]+)\s*EUR",
    re.IGNORECASE,
)
_SPOKEN_AMOUNT_RE = re.compile(
    r"nine\s+thousand\s+something",
    re.IGNORECASE,
)
_DUPLICATE_EACH_RE = re.compile(
    r"billed twice.*?(\$[\d,]+)\s*each time",
    re.IGNORECASE | re.DOTALL,
)
_CREDIT_OF_RE = re.compile(
    r"credit of\s*(\$[\d,]+(?:\.\d+)?)",
    re.IGNORECASE,
)
_QUOTE_INVOICE_RE = re.compile(
    r"came through at\s*(\$[\d,]+).*?quote was\s*(\$[\d,]+)",
    re.IGNORECASE | re.DOTALL,
)
_CHARGED_QUOTE_RE = re.compile(
    r"charged\s*(\$[\d,]+).*?(?:order form|quote)\s*(?:says|was)\s*(\$[\d,]+)",
    re.IGNORECASE | re.DOTALL,
)
_DAY_OF_MONTH_RE = re.compile(
    r"\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b",
    re.IGNORECASE,
)
_WEEKDAY_RE = re.compile(
    r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    re.IGNORECASE,
)


def _ticket_hash_int(ticket_id: str) -> int:
    digest = hashlib.sha256(ticket_id.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def deterministic_delay_ms(ticket_id: str) -> int:
    span = settings.MOCK_DELAY_MAX_MS - settings.MOCK_DELAY_MIN_MS
    if span <= 0:
        return settings.MOCK_DELAY_MIN_MS
    return settings.MOCK_DELAY_MIN_MS + (_ticket_hash_int(ticket_id) % (span + 1))


def _meta(
    confidence: float,
    grounded: bool,
    *,
    evidence: str | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    return {
        "confidence": confidence,
        "grounded": grounded,
        "evidence": evidence,
        "source": "model",
        "note": note,
    }


def _flag(code: str, field: str, message: str) -> dict[str, str]:
    return {"code": code, "field": field, "message": message}


def _parse_usd(text: str) -> float:
    return float(text.replace("$", "").replace(",", "").strip())


def _detect_categories(text: str) -> set[str]:
    lower = text.lower()
    found: set[str] = set()

    churn_kw = (
        "lapse",
        "non-renew",
        "non renew",
        "terminate",
        "termination",
        "do not renew",
        "offboarding",
        "consolidating",
    )
    if any(k in lower for k in churn_kw):
        found.add("churn_risk")

    outage_kw = (
        "completely down",
        "502",
        "unavailable",
        "failed overnight",
        "everything is failing",
    )
    if any(k in lower for k in outage_kw) or "COMPLETELY DOWN" in text:
        found.add("outage")

    billing_kw = (
        "charged",
        "billed",
        "invoice",
        "refund",
        "credit",
        "double prélèvement",
        "facture",
        "prélèvement",
    )
    if any(k in lower for k in billing_kw):
        found.add("billing")

    bug_kw = (
        "blank",
        "returns nothing",
        "drops rows",
        "serial-number",
        "serial number",
        "error",
        "504",
        "apostrophe",
    )
    if any(k in lower for k in bug_kw):
        found.add("bug")

    if "on the roadmap" in lower or re.search(r"would like .+ in", lower):
        found.add("feature_request")
    if re.search(r"any plan to", lower):
        found.add("feature_request")

    how_kw = (
        "how do i",
        "where do i find",
        "does ",
        "is there any way",
    )
    if any(k in lower for k in how_kw):
        found.add("how_to")

    return found


def _pick_category(text: str) -> tuple[str, list[dict[str, str]]]:
    found = _detect_categories(text)
    if not found:
        return "how_to", []
    ordered = [c for c in CATEGORY_PRIORITY if c in found]
    winner = ordered[0]
    flags: list[dict[str, str]] = []
    if len(found) > 1:
        others = [c for c in ordered if c != winner]
        flags.append(
            _flag(
                "multi_issue",
                "category",
                f"Multiple issues detected; chose {winner}. Also seen: {', '.join(others)}.",
            )
        )
    return winner, flags


def _extract_product(text: str) -> tuple[str | None, dict[str, Any], list[dict[str, str]]]:
    flags: list[dict[str, str]] = []
    normalized = re.sub(r"(studio)\w+", r"\1", text, flags=re.IGNORECASE)
    m = _ZEN_PRODUCT_RE.search(normalized)
    if not m:
        flags.append(
            _flag("not_stated", "product", "No Zen product name found in customer text.")
        )
        return None, _meta(0.0, False), flags
    key = m.group(1).lower()
    mapping = {
        "orchestrator": "Zen Orchestrator",
        "studio": "Zen Studio",
        "connect": "Zen Connect",
        "insights": "Zen Insights",
        "vault": "Zen Vault",
    }
    product = mapping[key]
    snippet = m.group(0)
    return product, _meta(0.9, True, evidence=snippet), flags


def _extract_company(
    prepared: PreparedTicket,
) -> tuple[str, dict[str, dict[str, Any]], list[dict[str, str]]]:
    flags: list[dict[str, str]] = []
    field_meta: dict[str, dict[str, Any]] = {}

    if prepared.signature_company:
        company = prepared.signature_company
        field_meta["company"] = _meta(0.95, True, evidence=company)
        domain = prepared.domain_company_guess
        if domain and domain.lower() != company.lower():
            flags.append(
                _flag(
                    "sender_domain_mismatch",
                    "company",
                    f"Signature company '{company}' differs from sender domain guess '{domain}'.",
                )
            )
        return company, field_meta, flags

    guess = prepared.domain_company_guess or "Unknown"
    field_meta["company"] = _meta(
        0.4,
        False,
        note="inferred from sender domain",
    )
    return guess, field_meta, flags


def _extract_severity(text: str) -> tuple[str | None, dict[str, Any], list[dict[str, str]]]:
    flags: list[dict[str, str]] = []
    lower = text.lower()

    if "COMPLETELY DOWN" in text or "people sitting idle" in lower:
        return "critical", _meta(0.9, True, evidence="COMPLETELY DOWN"), flags

    if (
        "502" in text
        or "termination" in lower
        or "board demo" in lower
        or "third time" in lower
        or "do not renew" in lower
    ):
        ev = "502" if "502" in text else "third time" if "third time" in lower else "termination"
        return "high", _meta(0.85, True, evidence=ev), flags

    if any(k in lower for k in ("charged", "billed", "invoice", "refund", "credit", "dispute")):
        return "medium", _meta(0.7, True, evidence="billing"), flags
    if any(k in lower for k in ("blank", "error", "504", "bug", "returns nothing")):
        return "medium", _meta(0.7, True, evidence="bug impact"), flags

    if "workaround is fine" in lower or "minor" in lower:
        return "low", _meta(0.6, True, evidence="minor"), flags

    flags.append(_flag("not_stated", "severity", "No severity cue in customer text."))
    return None, _meta(0.0, False), flags


def _extract_requested_action(text: str) -> tuple[str, dict[str, Any]]:
    lower = text.lower()
    if "refund" in lower or "remboursement" in lower:
        return "refund", _meta(0.9, True, evidence="refund")
    if "credit of" in lower or "credit is fine" in lower:
        return "credit", _meta(0.85, True, evidence="credit")
    if "please call" in lower or "call with" in lower:
        return "callback", _meta(0.8, True, evidence="call")
    if "please fix" in lower or "can u pls fix" in lower or "pls fix" in lower:
        return "fix", _meta(0.85, True, evidence="fix")
    if "how do" in lower or "where do" in lower or "?" in text:
        return "information", _meta(0.7, True, evidence="question")
    return "none", _meta(0.5, True)


def _extract_refund_amount(
    text: str,
) -> tuple[float | None, dict[str, Any], list[dict[str, str]]]:
    flags: list[dict[str, str]] = []

    if _EUR_AMOUNT_RE.search(text):
        m = _EUR_AMOUNT_RE.search(text)
        raw = m.group(0) if m else "EUR amount"
        flags.append(
            _flag(
                "currency_mismatch",
                "refund_amount",
                f"Customer stated {raw.strip()} (two duplicate charges). "
                "Field is USD; enter USD amount manually.",
            )
        )
        return None, _meta(0.0, False, note=raw.strip(), evidence=raw.strip()), flags

    m_dup = _DUPLICATE_EACH_RE.search(text)
    if m_dup:
        amount = _parse_usd(m_dup.group(1))
        return amount, _meta(0.9, True, evidence=m_dup.group(1)), flags

    m_credit = _CREDIT_OF_RE.search(text)
    if m_credit:
        amount = _parse_usd(m_credit.group(1))
        return amount, _meta(0.85, True, evidence=m_credit.group(1), note="credit amount"), flags

    m_quote = _QUOTE_INVOICE_RE.search(text) or _CHARGED_QUOTE_RE.search(text)
    if m_quote:
        a, b = m_quote.group(1), m_quote.group(2)
        delta = _parse_usd(a) - _parse_usd(b)
        flags.append(
            _flag(
                "derived_value",
                "refund_amount",
                f"Quote vs invoice: charged {a}, quoted {b} (delta {delta:.0f}). "
                "No explicit refund amount requested.",
            )
        )
        return None, _meta(0.0, False), flags

    if _SPOKEN_AMOUNT_RE.search(text):
        flags.append(
            _flag(
                "approximate_amount",
                "refund_amount",
                "Caller gave a spoken approximate amount ('nine thousand something').",
            )
        )
        return 9000.0, _meta(0.3, False, evidence="nine thousand something"), flags

    return None, _meta(0.0, False), flags


def _is_event_date_context(text: str, match: re.Match[str]) -> bool:
    start = max(0, match.start() - 40)
    window = text[start : match.end() + 10].lower()
    return any(w in window for w in ("billed", "charged", "cancelled", "canceled", "invoice"))


def _next_day_of_month(after: date, day: int) -> date:
    year, month = after.year, after.month
    for _ in range(14):
        last = calendar.monthrange(year, month)[1]
        d = min(day, last)
        candidate = date(year, month, d)
        if candidate >= after:
            return candidate
        month += 1
        if month > 12:
            month = 1
            year += 1
    return candidate


def _next_weekday(after: date, weekday_name: str) -> date:
    names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    target = names.index(weekday_name.lower())
    d = after
    for _ in range(8):
        if d.weekday() == target and d >= after:
            return d
        d += timedelta(days=1)
    return d


def _quarter_end(d: date) -> date:
    quarter = (d.month - 1) // 3 + 1
    end_month = quarter * 3
    last_day = calendar.monthrange(d.year, end_month)[1]
    return date(d.year, end_month, last_day)


def _extract_deadline(
    text: str,
    received_at: datetime,
) -> tuple[date | None, dict[str, Any], list[dict[str, str]]]:
    flags: list[dict[str, str]] = []
    lower = text.lower()
    has_deadline_cue = any(
        cue in lower
        for cue in (
            "before",
            "by ",
            "no later than",
            "until",
            "sorted before",
            "need ",
        )
    )
    if "next week" in lower and has_deadline_cue:
        flags.append(_flag("vague_deadline", "deadline", "Phrase 'next week' is too vague."))
        return None, _meta(0.0, False), flags

    if not has_deadline_cue:
        return None, _meta(0.0, False), flags

    received = received_at.date()

    if "quarter end" in lower:
        resolved = _quarter_end(received)
        flags.append(
            _flag(
                "relative_date_resolved",
                "deadline",
                "Resolved 'quarter end' relative to received_at.",
            )
        )
        return resolved, _meta(0.75, True, evidence="quarter end"), flags

    wm = _WEEKDAY_RE.search(text)
    if wm and ("by " in lower or "before" in lower):
        name = wm.group(1)
        resolved = _next_weekday(received, name)
        flags.append(
            _flag(
                "relative_date_resolved",
                "deadline",
                f"Resolved weekday '{name}' relative to received_at.",
            )
        )
        return resolved, _meta(0.8, True, evidence=name), flags

    for m in _DAY_OF_MONTH_RE.finditer(text):
        if _is_event_date_context(text, m):
            continue
        day = int(m.group(1))
        if day < 1 or day > 31:
            continue
        phrase = m.group(0)
        resolved = _next_day_of_month(received, day)
        flags.append(
            _flag(
                "relative_date_resolved",
                "deadline",
                f"Resolved '{phrase}' relative to received_at.",
            )
        )
        return resolved, _meta(0.75, True, evidence=phrase), flags

    return None, _meta(0.0, False), flags


_ESCALATED_RE = re.compile(
    r"\b(termination|non-renew|non renew|cto|cfo|leadership|escalating|do not renew)\b",
    re.IGNORECASE,
)


def _extract_escalated(text: str) -> tuple[bool, dict[str, Any]]:
    m = _ESCALATED_RE.search(text)
    if m:
        hit = m.group(1)
        return True, _meta(0.9, True, evidence=hit)
    return False, _meta(0.8, True)


def build_mock_payload(prepared: PreparedTicket, ticket: Ticket) -> dict[str, Any]:
    text = prepared.customer_text
    flags: list[dict[str, str]] = []
    field_meta: dict[str, dict[str, Any]] = {}

    company, company_meta, f1 = _extract_company(prepared)
    field_meta.update(company_meta)
    flags.extend(f1)

    product, product_meta, f2 = _extract_product(text)
    field_meta["product"] = product_meta
    flags.extend(f2)

    category, f3 = _pick_category(text)
    field_meta["category"] = _meta(0.85, True)
    flags.extend(f3)

    severity, severity_meta, f4 = _extract_severity(text)
    field_meta["severity"] = severity_meta
    flags.extend(f4)

    action, action_meta = _extract_requested_action(text)
    field_meta["requested_action"] = action_meta

    amount, amount_meta, f5 = _extract_refund_amount(text)
    field_meta["refund_amount"] = amount_meta
    flags.extend(f5)

    deadline, deadline_meta, f6 = _extract_deadline(text, ticket.received_at)
    field_meta["deadline"] = deadline_meta
    flags.extend(f6)

    escalated, esc_meta = _extract_escalated(text)
    field_meta["escalated"] = esc_meta

    payload: dict[str, Any] = {
        "company": company,
        "product": product,
        "category": category,
        "severity": severity,
        "requested_action": action,
        "refund_amount": amount,
        "deadline": deadline.isoformat() if deadline else None,
        "escalated": escalated,
        "field_meta": field_meta,
        "flags": flags,
    }
    return payload


def _invalid_attempt_output(ticket_id: str, attempt: int) -> str:
    if ticket_id in settings.mock_fail_twice_id_set():
        if attempt == 1:
            return "MODEL OUTPUT: not valid json {{"
        logger.info("mock fail-twice attempt 1 for %s", ticket_id)
        return "still not json"
    # fail-once
    return json.dumps(
        {
            "company": "Placeholder Co",
            "category": "bug",
            "severity": "urgent",
            "requested_action": "fix",
            "escalated": False,
        },
        sort_keys=True,
    )


class MockProvider:
    name = "mock"

    async def extract(
        self,
        ticket: Ticket,
        *,
        attempt: int,
        previous_output: str | None = None,
        validation_error: str | None = None,
    ) -> str:
        delay_ms = deterministic_delay_ms(ticket.id)
        await asyncio.sleep(delay_ms / 1000.0)

        fail_once = ticket.id in settings.mock_fail_once_id_set()
        fail_twice = ticket.id in settings.mock_fail_twice_id_set()

        if fail_twice:
            if validation_error:
                logger.info(
                    "mock retry feedback for %s: %s",
                    ticket.id,
                    validation_error,
                )
            if attempt <= 2:
                return _invalid_attempt_output(ticket.id, attempt)

        if fail_once and attempt == 1:
            return _invalid_attempt_output(ticket.id, attempt)

        if validation_error and attempt == 2:
            logger.info(
                "mock retry feedback for %s: %s",
                ticket.id,
                validation_error,
            )

        prepared = prepare(ticket)
        payload = build_mock_payload(prepared, ticket)
        return json.dumps(payload, sort_keys=True)
