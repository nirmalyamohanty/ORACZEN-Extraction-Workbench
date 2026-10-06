"""Record editing (PATCH) and CSV export logic."""

from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError

from app import tickets as ticket_store
from app.jobs import Item, job_store
from app.pipeline import RECORD_FIELD_NAMES
from app.schemas import ExtractedRecord, FieldMeta, TicketSnippet

# CSV injection trigger characters
CSV_INJECTION_PREFIXES = ("=", "+", "-", "@")


def sanitize_csv_cell(value: Any) -> str:
    """Guard against CSV injection by prefixing formula characters with single quote."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, date):
        return value.isoformat()
    text = str(value)
    if text and text[0] in CSV_INJECTION_PREFIXES:
        return "'" + text
    return text


def validate_patch_fields(fields: dict[str, Any]) -> dict[str, str]:
    """Validate each field to be patched against ExtractedRecord, returning errors by field name."""
    errors: dict[str, str] = {}
    for fname, val in fields.items():
        if fname not in RECORD_FIELD_NAMES:
            errors[fname] = f"Unknown field '{fname}'"
            continue

        # Build baseline valid record to validate this specific field
        dummy: dict[str, Any] = {
            "company": "Valid Company",
            "category": "bug",
            "requested_action": "fix",
            "escalated": False,
            fname: val,
        }
        try:
            ExtractedRecord.model_validate(dummy)
        except ValidationError as exc:
            for err in exc.errors():
                loc = err.get("loc", ())
                if loc and str(loc[0]) == fname:
                    errors[fname] = err.get("msg", "Validation error")
                    break
            if fname not in errors:
                errors[fname] = "Validation error"
    return errors


def patch_record(record_id: str, fields: dict[str, Any]) -> Item:
    """Apply human correction to a record or draft, updating audit trail."""
    item = job_store.records.get(record_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Record not found")

    errors = validate_patch_fields(fields)
    if errors:
        # 422 with {"errors": {...}}
        raise HTTPException(status_code=422, detail={"errors": errors})

    # Prepare base data
    base_data: dict[str, Any] = {}
    if item.record is not None:
        base_data = item.record.model_dump()
    elif item.draft:
        base_data = dict(item.draft)

    merged = dict(base_data)
    merged.update(fields)

    # Track edits and update FieldMeta
    for fname, val in fields.items():
        if fname not in item.original_values:
            item.original_values[fname] = base_data.get(fname)
        item.edited_fields.add(fname)
        evidence = item.field_meta[fname].evidence if fname in item.field_meta else None
        item.field_meta[fname] = FieldMeta(
            confidence=1.0,
            grounded=True,
            evidence=evidence,
            source="human",
            note="edited by reviewer",
        )

    # Check if merged result is now a fully valid record
    try:
        valid_rec = ExtractedRecord.model_validate(merged)
        item.record = valid_rec
        if item.draft is not None:
            item.draft = merged
        if item.status == "needs_review":
            item.resolved = True
    except ValidationError:
        item.draft = merged

    return item


def generate_job_csv(job_id: str) -> str:
    """Generate CSV string for finished records in a job with CSV injection protection."""
    job = job_store.jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\r\n")

    columns = [
        "ticket_id",
        "record_id",
        "status",
        "resolved",
        "company",
        "product",
        "category",
        "severity",
        "requested_action",
        "refund_amount",
        "deadline",
        "escalated",
        "edited_fields",
        "flags",
        "attempts",
    ]
    writer.writerow(columns)

    for item in job.items.values():
        if item.status in ("queued", "running"):
            continue

        data: dict[str, Any] = {}
        if item.record is not None:
            data = item.record.model_dump()
        elif item.draft is not None:
            data = dict(item.draft)

        edited_str = ";".join(sorted(item.edited_fields))
        flags_str = ";".join(f.code for f in item.flags)

        row = [
            sanitize_csv_cell(item.ticket_id),
            sanitize_csv_cell(item.record_id),
            sanitize_csv_cell(item.status),
            sanitize_csv_cell(item.resolved),
            sanitize_csv_cell(data.get("company")),
            sanitize_csv_cell(data.get("product")),
            sanitize_csv_cell(data.get("category")),
            sanitize_csv_cell(data.get("severity")),
            sanitize_csv_cell(data.get("requested_action")),
            sanitize_csv_cell(data.get("refund_amount")),
            sanitize_csv_cell(data.get("deadline")),
            sanitize_csv_cell(data.get("escalated")),
            sanitize_csv_cell(edited_str),
            sanitize_csv_cell(flags_str),
            sanitize_csv_cell(item.attempts),
        ]
        writer.writerow(row)

    return output.getvalue()
