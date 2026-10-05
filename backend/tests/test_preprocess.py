import json
from pathlib import Path

import pytest

from app.preprocess import prepare
from app.schemas import Ticket

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "tickets.jsonl"


def _load_ticket(ticket_id: str) -> Ticket:
    with DATA_PATH.open(encoding="utf-8") as f:
        for line in f:
            data = json.loads(line)
            if data["id"] == ticket_id:
                return Ticket.model_validate(data)
    pytest.fail(f"ticket {ticket_id} not found")


def test_tkt_0007_removes_quoted_reply_chain():
    prepared = prepare(_load_ticket("tkt_0007"))
    assert prepared.quoted_text_removed is True
    assert "Thanks for flagging" not in prepared.customer_text
    assert "Following up on the below" not in prepared.customer_text
    assert "Zen Studio failed overnight" in prepared.customer_text


def test_tkt_0001_footer_removed_and_signature_company():
    prepared = prepare(_load_ticket("tkt_0001"))
    assert "confidential" not in prepared.customer_text.lower()
    assert prepared.signature_company == "Castlerock Mining"
    assert prepared.domain_company_guess == "Castlerock Mining"


def test_tkt_0058_french_orcid_from_last_line_domain_mismatch():
    prepared = prepare(_load_ticket("tkt_0058"))
    assert prepared.language_hint == "fr"
    assert prepared.signature_company == "Orchid Hospitality"
    assert prepared.domain_company_guess == "Halcyon Foods"
    assert "4 820 EUR" in prepared.customer_text


def test_tkt_0004_and_0020_near_empty():
    assert prepare(_load_ticket("tkt_0004")).is_near_empty is True
    assert prepare(_load_ticket("tkt_0020")).is_near_empty is True


def test_tkt_0131_spoken_company_from_transcript():
    prepared = prepare(_load_ticket("tkt_0131"))
    assert prepared.signature_company == "Castlerock Mining"
    assert "nine thousand" in prepared.customer_text.lower()
