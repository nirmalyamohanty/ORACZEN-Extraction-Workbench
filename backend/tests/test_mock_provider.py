import json
from pathlib import Path

import pytest

from app.preprocess import prepare
from app.providers.mock import MockProvider, build_mock_payload, deterministic_delay_ms
from app.schemas import Ticket
from app.tickets import load_tickets

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "tickets.jsonl"


@pytest.fixture(scope="module", autouse=True)
def _tickets():
    load_tickets(DATA_PATH)


def _ticket(ticket_id: str) -> Ticket:
    from app.tickets import get_ticket

    t = get_ticket(ticket_id)
    assert t is not None
    return t


def _payload(ticket_id: str) -> dict:
    ticket = _ticket(ticket_id)
    return build_mock_payload(prepare(ticket), ticket)


@pytest.mark.asyncio
async def test_same_ticket_same_attempt_is_byte_identical():
    provider = MockProvider()
    ticket = _ticket("tkt_0003")
    a = await provider.extract(ticket, attempt=1)
    b = await provider.extract(ticket, attempt=1)
    assert a == b
    assert a  # non-empty JSON string


def test_deterministic_delay_in_range():
    ms = deterministic_delay_ms("tkt_0042")
    assert ms == deterministic_delay_ms("tkt_0042")
    from app.config import settings

    assert settings.MOCK_DELAY_MIN_MS <= ms <= settings.MOCK_DELAY_MAX_MS


@pytest.mark.asyncio
async def test_fail_once_invalid_then_valid():
    provider = MockProvider()
    ticket = _ticket("tkt_0017")
    out1 = await provider.extract(ticket, attempt=1)
    out2 = await provider.extract(ticket, attempt=2)
    assert json.loads(out1)["severity"] == "urgent"
    data = json.loads(out2)
    assert data["severity"] in ("low", "medium", "high", "critical", None)
    assert "urgent" not in out2


@pytest.mark.asyncio
async def test_fail_twice_invalid_both_attempts(caplog):
    import logging

    caplog.set_level(logging.INFO)
    provider = MockProvider()
    ticket = _ticket("tkt_0042")
    out1 = await provider.extract(ticket, attempt=1, validation_error=None)
    out2 = await provider.extract(
        ticket,
        attempt=2,
        previous_output=out1,
        validation_error="company: field required",
    )
    with pytest.raises(json.JSONDecodeError):
        json.loads(out1)
    with pytest.raises(json.JSONDecodeError):
        json.loads(out2)
    assert any("validation_error" in r.message or "retry feedback" in r.message for r in caplog.records)


def test_tkt_0013_refund_duplicate_amount():
    data = _payload("tkt_0013")
    assert data["requested_action"] == "refund"
    assert data["refund_amount"] == 4820.0


def test_tkt_0072_credit_300():
    data = _payload("tkt_0072")
    assert data["requested_action"] == "credit"
    assert data["refund_amount"] == 300.0


def test_tkt_0058_currency_mismatch():
    data = _payload("tkt_0058")
    assert data["refund_amount"] is None
    codes = {f["code"] for f in data["flags"]}
    assert "currency_mismatch" in codes


def test_tkt_0089_churn_multi_issue_escalated():
    data = _payload("tkt_0089")
    assert data["category"] == "churn_risk"
    assert data["escalated"] is True
    codes = {f["code"] for f in data["flags"]}
    assert "multi_issue" in codes


def test_tkt_0131_approximate_9000():
    data = _payload("tkt_0131")
    assert data["refund_amount"] == 9000.0
    codes = {f["code"] for f in data["flags"]}
    assert "approximate_amount" in codes


def test_tkt_0089_signature_ferrolane_sender_domain_mismatch():
    data = _payload("tkt_0089")
    assert data["company"] == "Ferrolane Steel"
    codes = {f["code"] for f in data["flags"]}
    assert "sender_domain_mismatch" in codes


def test_tkt_0008_vireo_health_grounded():
    data = _payload("tkt_0008")
    assert data["company"] == "Vireo Health"
    assert data["field_meta"]["company"]["grounded"] is True


def test_tkt_0008_not_escalated_and_tkt_0002_is():
    data_0008 = _payload("tkt_0008")
    assert data_0008["escalated"] is False

    data_0002 = _payload("tkt_0002")
    assert data_0002["escalated"] is True
