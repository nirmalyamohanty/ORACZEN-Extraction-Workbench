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
from app.pipeline import RECORD_FIELD_NAMES, process_item
from app.providers.factory import get_provider
from app.schemas import ExtractedRecord, FieldDiff, FieldMeta, TicketSnippet

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


async def rerun_record(
    record_id: str,
    provider_name: str | None = None,
    model_name: str | None = None,
    overwrite_edited: bool = False,
    preview_only: bool = False,
) -> tuple[Item, dict[str, FieldDiff], bool]:
    """Re-run the extraction pipeline for one record, preserving human edits unless overwrite is requested."""
    item = job_store.records.get(record_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Record not found")

    raw_ticket = ticket_store.get_ticket(item.ticket_id)
    if raw_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    try:
        provider = get_provider(provider_name, model_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    result = await process_item(provider, raw_ticket)

    current_data: dict[str, Any] = {}
    if item.record is not None:
        current_data = item.record.model_dump()
    elif item.draft is not None:
        current_data = dict(item.draft)

    new_data: dict[str, Any] = {}
    if result.record is not None:
        new_data = result.record.model_dump()
    elif result.draft is not None:
        new_data = dict(result.draft)

    diff: dict[str, FieldDiff] = {}
    for fname in sorted(RECORD_FIELD_NAMES):
        old_val = current_data.get(fname)
        new_val = new_data.get(fname)
        is_edited = fname in item.edited_fields
        will_replace = overwrite_edited or (not is_edited)
        diff[fname] = FieldDiff(
            old_value=old_val,
            new_value=new_val,
            is_edited=is_edited,
            will_replace=will_replace,
        )

    if preview_only:
        preview_fields: dict[str, Any] = dict(current_data)
        preview_meta: dict[str, FieldMeta] = dict(item.field_meta)
        for fname in RECORD_FIELD_NAMES:
            if overwrite_edited or fname not in item.edited_fields:
                preview_fields[fname] = new_data.get(fname)
                if fname in result.field_meta:
                    preview_meta[fname] = result.field_meta[fname]

        preview_record: ExtractedRecord | None = None
        preview_draft: dict[str, Any] | None = None
        try:
            preview_record = ExtractedRecord.model_validate(preview_fields)
        except ValidationError:
            preview_draft = preview_fields

        preview_item = Item(
            ticket_id=item.ticket_id,
            record_id=item.record_id,
            status=result.status,
            attempts=item.attempts + result.attempts,
            record=preview_record,
            draft=preview_draft,
            field_meta=preview_meta,
            flags=result.flags,
            raw_outputs=item.raw_outputs + result.raw_outputs,
            validation_errors=item.validation_errors + result.validation_errors,
            error=result.error,
            edited_fields=set() if overwrite_edited else set(item.edited_fields),
            original_values=dict(item.original_values),
            resolved=item.resolved or (preview_record is not None and result.status == "needs_review"),
        )
        return preview_item, diff, True

    merged_data: dict[str, Any] = dict(current_data)
    for fname in RECORD_FIELD_NAMES:
        if overwrite_edited or fname not in item.edited_fields:
            merged_data[fname] = new_data.get(fname)
            if fname in result.field_meta:
                item.field_meta[fname] = result.field_meta[fname]
            elif fname in item.field_meta:
                del item.field_meta[fname]
            if overwrite_edited and fname in item.edited_fields:
                item.edited_fields.remove(fname)
        else:
            # Preserved human edit: keep current value and human field_meta
            pass

    try:
        valid_rec = ExtractedRecord.model_validate(merged_data)
        item.record = valid_rec
        item.draft = None if result.status == "done" else merged_data
        item.status = result.status
        if item.status == "needs_review":
            item.resolved = True
    except ValidationError:
        item.record = None
        item.draft = merged_data
        item.status = "needs_review"
        item.resolved = False

    item.flags = result.flags
    item.raw_outputs.extend(result.raw_outputs)
    item.validation_errors.extend(result.validation_errors)
    item.attempts += result.attempts
    item.error = result.error

    return item, diff, False


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
