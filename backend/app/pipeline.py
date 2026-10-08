"""Single-ticket extraction: preprocess, provider call, validate, retry."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from pydantic import ValidationError

from app.preprocess import prepare
from app.providers.base import Provider
from app.schemas import ExtractedRecord, FieldMeta, Flag, ItemStatus, Ticket

RECORD_FIELD_NAMES = frozenset(ExtractedRecord.model_fields.keys())


@dataclass
class ItemResult:
    status: ItemStatus
    attempts: int
    record: ExtractedRecord | None = None
    draft: dict[str, Any] | None = None
    field_meta: dict[str, FieldMeta] = field(default_factory=dict)
    flags: list[Flag] = field(default_factory=list)
    raw_outputs: list[str] = field(default_factory=list)
    validation_errors: list[str] = field(default_factory=list)
    error: str | None = None
    edited_fields: set[str] = field(default_factory=set)
    original_values: dict[str, Any] = field(default_factory=dict)
    resolved: bool = False


def format_validation_error(exc: ValidationError) -> str:
    """Human-readable summary for provider retry prompts."""
    parts: list[str] = []
    for err in exc.errors():
        loc = err.get("loc", ())
        field_name = str(loc[0]) if loc else "record"
        err_type = err.get("type", "")
        if err_type == "literal_error":
            expected = err.get("ctx", {}).get("expected")
            bad = err.get("input")
            if expected:
                parts.append(
                    f"{field_name}: {bad!r} is not one of {expected}"
                )
            else:
                parts.append(f"{field_name}: {err.get('msg')}")
        elif err_type == "missing":
            parts.append(f"{field_name}: field required")
        else:
            parts.append(f"{field_name}: {err.get('msg')}")
    return "; ".join(parts)


def _parse_raw_output(raw: str) -> tuple[dict[str, Any] | None, str | None]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, f"JSON decode error: {exc.msg}"
    if not isinstance(data, dict):
        return None, "JSON decode error: top-level value must be an object"
    return data, None


def _split_payload(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], list[Any]]:
    payload = dict(data)
    field_meta_raw = payload.pop("field_meta", {}) or {}
    flags_raw = payload.pop("flags", []) or []
    record_data = {k: payload[k] for k in RECORD_FIELD_NAMES if k in payload}
    return record_data, field_meta_raw, flags_raw


def _parse_field_meta(raw: dict[str, Any]) -> dict[str, FieldMeta]:
    parsed: dict[str, FieldMeta] = {}
    for key, value in raw.items():
        if isinstance(value, dict):
            try:
                parsed[key] = FieldMeta.model_validate(value)
            except ValidationError:
                continue
    return parsed


def _parse_flags(raw: list[Any]) -> list[Flag]:
    flags: list[Flag] = []
    for item in raw:
        if isinstance(item, dict):
            try:
                flags.append(Flag.model_validate(item))
            except ValidationError:
                continue
    return flags


def _validate_record(record_data: dict[str, Any]) -> tuple[ExtractedRecord | None, str | None]:
    try:
        return ExtractedRecord.model_validate(record_data), None
    except ValidationError as exc:
        return None, format_validation_error(exc)


def _apply_grounding_check(
    record: ExtractedRecord,
    field_meta: dict[str, FieldMeta],
    customer_text: str,
    flags: list[Flag],
) -> None:
    """Override model claims when quoted evidence is not present in customer text."""
    haystack = customer_text.lower()
    existing = {(f.field, f.code) for f in flags}

    for fname, meta in list(field_meta.items()):
        evidence = meta.evidence
        if evidence and evidence.lower() not in haystack:
            field_meta[fname] = meta.model_copy(update={"grounded": False})
            key = (fname, "ungrounded")
            if key not in existing:
                flags.append(
                    Flag(
                        code="ungrounded",
                        field=fname,
                        message="Quoted evidence is not found in customer text.",
                    )
                )
                existing.add(key)


def _minimal_near_empty_draft(prepared) -> dict[str, Any]:
    company = prepared.domain_company_guess or "Unknown"
    return {
        "company": company,
        "product": None,
        "category": "how_to",
        "severity": None,
        "requested_action": "information",
        "refund_amount": None,
        "deadline": None,
        "escalated": False,
    }


def _near_empty_result(prepared) -> ItemResult:
    company = prepared.domain_company_guess or "Unknown"
    return ItemResult(
        status="needs_review",
        attempts=0,
        draft=_minimal_near_empty_draft(prepared),
        field_meta={
            "company": FieldMeta(
                confidence=0.4,
                grounded=False,
                note="inferred from sender domain",
                source="model",
            )
        },
        flags=[
            Flag(
                code="skipped_model",
                field="record",
                message="Body has no extractable content",
            )
        ],
    )


async def process_item(provider: Provider, ticket: Ticket) -> ItemResult:
    prepared = prepare(ticket)
    if prepared.is_near_empty:
        return _near_empty_result(prepared)

    raw_outputs: list[str] = []
    validation_errors: list[str] = []
    last_data: dict[str, Any] | None = None
    last_field_meta: dict[str, FieldMeta] = {}
    last_flags: list[Flag] = []

    try:
        for attempt in (1, 2):
            previous = raw_outputs[-1] if raw_outputs else None
            verr = validation_errors[-1] if validation_errors else None
            raw = await provider.extract(
                ticket,
                attempt=attempt,
                previous_output=previous,
                validation_error=verr,
            )
            raw_outputs.append(raw)

            data, decode_err = _parse_raw_output(raw)
            if decode_err:
                validation_errors.append(decode_err)
                if attempt == 2:
                    break
                continue

            assert data is not None
            record_data, field_meta_raw, flags_raw = _split_payload(data)
            last_data = record_data
            last_field_meta = _parse_field_meta(field_meta_raw)
            last_flags = _parse_flags(flags_raw)

            record, val_err = _validate_record(record_data)
            if record is not None:
                _apply_grounding_check(
                    record, last_field_meta, prepared.customer_text, last_flags
                )
                return ItemResult(
                    status="done",
                    attempts=attempt,
                    record=record,
                    field_meta=last_field_meta,
                    flags=last_flags,
                    raw_outputs=raw_outputs,
                    validation_errors=validation_errors,
                )

            validation_errors.append(val_err or "validation failed")
            if attempt == 2:
                break

        flags = list(last_flags)
        flags.append(
            Flag(
                code="invalid_model_output",
                field="record",
                message="Model output failed validation after two attempts.",
            )
        )
        return ItemResult(
            status="needs_review",
            attempts=2,
            draft=last_data or {},
            field_meta=last_field_meta,
            flags=flags,
            raw_outputs=raw_outputs,
            validation_errors=validation_errors,
        )
    except Exception as exc:
        return ItemResult(
            status="failed",
            attempts=len(raw_outputs) or 1,
            error=str(exc),
            raw_outputs=raw_outputs,
            validation_errors=validation_errors,
        )
