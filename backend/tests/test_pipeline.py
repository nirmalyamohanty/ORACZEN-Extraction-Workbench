import json

import pytest
from pydantic import ValidationError

from app.pipeline import format_validation_error, process_item
from app.schemas import ExtractedRecord, Ticket


class StubProvider:
    name = "stub"

    def __init__(self, outputs: list[str]) -> None:
        self.outputs = outputs
        self.calls: list[dict] = []

    async def extract(
        self,
        ticket: Ticket,
        *,
        attempt: int,
        previous_output: str | None = None,
        validation_error: str | None = None,
    ) -> str:
        self.calls.append(
            {
                "attempt": attempt,
                "previous_output": previous_output,
                "validation_error": validation_error,
            }
        )
        return self.outputs[attempt - 1]


def _ticket() -> Ticket:
    return Ticket.model_validate(
        {
            "id": "tkt_test",
            "subject": "s",
            "body": "Search in Zen Connect returns nothing for apostrophe cases.",
            "channel": "email",
            "received_at": "2026-08-01T12:00:00Z",
            "from_email": "a@panacea.com",
            "attachments": 0,
        }
    )


def _valid_json(**overrides: object) -> str:
    base = {
        "company": "Panacea Labs",
        "product": "Zen Connect",
        "category": "bug",
        "severity": "medium",
        "requested_action": "fix",
        "refund_amount": None,
        "deadline": None,
        "escalated": False,
        "field_meta": {},
        "flags": [],
    }
    base.update(overrides)
    return json.dumps(base)


def test_format_validation_error_literal():
    try:
        ExtractedRecord.model_validate(
            {
                "company": "Acme",
                "category": "bug",
                "severity": "urgent",
                "requested_action": "fix",
                "escalated": False,
            }
        )
    except ValidationError as exc:
        msg = format_validation_error(exc)
    else:
        pytest.fail("expected validation error")
    assert "severity" in msg
    assert "urgent" in msg
    assert "low" in msg or "critical" in msg


@pytest.mark.asyncio
async def test_retry_invalid_then_valid():
    invalid = json.dumps(
        {
            "company": "Acme",
            "category": "bug",
            "severity": "urgent",
            "requested_action": "fix",
            "escalated": False,
        }
    )
    provider = StubProvider([invalid, _valid_json()])
    result = await process_item(provider, _ticket())
    assert len(provider.calls) == 2
    assert provider.calls[1]["validation_error"]
    assert "severity" in provider.calls[1]["validation_error"]
    assert result.status == "done"
    assert result.attempts == 2
    assert result.record is not None


@pytest.mark.asyncio
async def test_fails_twice_needs_review():
    bad = json.dumps(
        {
            "company": "Acme",
            "category": "bug",
            "severity": "urgent",
            "requested_action": "fix",
            "escalated": False,
        }
    )
    provider = StubProvider([bad, bad])
    result = await process_item(provider, _ticket())
    assert result.status == "needs_review"
    assert result.attempts == 2
    assert len(result.raw_outputs) == 2
    assert len(result.validation_errors) == 2
    codes = {f.code for f in result.flags}
    assert "invalid_model_output" in codes


@pytest.mark.asyncio
async def test_provider_exception_becomes_failed():
    class BoomProvider:
        name = "boom"

        async def extract(self, *args, **kwargs) -> str:
            raise RuntimeError("provider crashed")

    result = await process_item(BoomProvider(), _ticket())
    assert result.status == "failed"
    assert result.error == "provider crashed"


@pytest.mark.asyncio
async def test_near_empty_skips_provider():
    ticket = Ticket.model_validate(
        {
            "id": "tkt_0004",
            "subject": "help",
            "body": "please advise",
            "channel": "email",
            "received_at": "2026-08-08T19:41:14Z",
            "from_email": "t.beckett@sunbelt.com",
            "attachments": 0,
        }
    )

    class ShouldNotRun:
        name = "nope"

        async def extract(self, *args, **kwargs) -> str:
            raise AssertionError("provider should not run")

    result = await process_item(ShouldNotRun(), ticket)
    assert result.status == "needs_review"
    assert result.attempts == 0
    assert result.draft["company"] == "Sunbelt Utilities"
    assert any(f.code == "skipped_model" for f in result.flags)
