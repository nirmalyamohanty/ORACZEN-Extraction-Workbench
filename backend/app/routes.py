"""HTTP API routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import JSONResponse

from app import tickets as ticket_store
from app.jobs import job_store
from app.records import generate_job_csv, patch_record, rerun_record, validate_patch_fields
from app.schemas import (
    CreateJobRequest,
    CreateJobResponse,
    JobItemSummary,
    JobResponse,
    JobResultItem,
    JobResultsResponse,
    PatchRecordRequest,
    RerunRecordRequest,
    RerunRecordResponse,
    Ticket,
    TicketListResponse,
    TicketSnippet,
)

router = APIRouter()


@router.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Extraction Workbench API",
        "status": "ok",
        "docs_url": "/docs",
        "health_url": "/health",
        "frontend_url": "http://localhost:3000",
        "message": "Visit http://localhost:3000 to use the Extraction Workbench frontend, or /docs for API documentation.",
    }


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/api/tickets", response_model=TicketListResponse)
def list_tickets(
    q: str | None = Query(default=None),
    channel: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> TicketListResponse:
    items, total = ticket_store.list_tickets(
        q=q, channel=channel, limit=limit, offset=offset
    )
    return TicketListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/api/tickets/{ticket_id}", response_model=Ticket)
def get_ticket(ticket_id: str) -> Ticket:
    ticket = ticket_store.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/api/jobs", status_code=202, response_model=CreateJobResponse)
async def create_job(payload: CreateJobRequest) -> CreateJobResponse:
    job = job_store.create_job(payload.ticket_ids)
    job_store.start_job(job)
    return CreateJobResponse(
        job_id=job.id,
        status=job.status,
        total=len(job.ticket_ids),
    )


@router.get("/api/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str) -> JobResponse:
    job = job_store.jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    item_summaries = [
        JobItemSummary(
            ticket_id=it.ticket_id,
            record_id=it.record_id,
            status=it.status,
            attempts=it.attempts,
            flags_count=len(it.flags),
            error=it.error,
        )
        for it in job.items.values()
    ]

    return JobResponse(
        id=job.id,
        status=job.status,
        created_at=job.created_at,
        finished_at=job.finished_at,
        progress=job_store.progress(job),
        items=item_summaries,
    )


def _build_ticket_snippet(ticket_id: str) -> TicketSnippet:
    raw_ticket = ticket_store.get_ticket(ticket_id)
    if raw_ticket is None:
        return TicketSnippet(
            subject="",
            body="",
            channel="email",
            received_at=datetime.now(timezone.utc),
            from_email="",
        )
    return TicketSnippet(
        subject=raw_ticket.subject,
        body=raw_ticket.body,
        channel=raw_ticket.channel,
        received_at=raw_ticket.received_at,
        from_email=raw_ticket.from_email,
    )


def _build_job_result_item(item: Item) -> JobResultItem:
    return JobResultItem(
        ticket_id=item.ticket_id,
        record_id=item.record_id,
        status=item.status,
        attempts=item.attempts,
        record=item.record,
        draft=item.draft,
        field_meta=item.field_meta,
        flags=item.flags,
        edited_fields=sorted(item.edited_fields),
        original_values=item.original_values,
        resolved=item.resolved,
        raw_outputs=item.raw_outputs,
        validation_errors=item.validation_errors,
        error=item.error,
        ticket=_build_ticket_snippet(item.ticket_id),
    )


@router.get("/api/jobs/{job_id}/results", response_model=JobResultsResponse)
def get_job_results(
    job_id: str,
    status: str | None = Query(default=None),
) -> JobResultsResponse:
    job = job_store.jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    result_items = [
        _build_job_result_item(it)
        for it in job.items.values()
        if not (status and it.status != status)
    ]

    return JobResultsResponse(
        job_id=job.id,
        status=job.status,
        items=result_items,
    )


@router.post("/api/jobs/{job_id}/cancel")
def cancel_job_endpoint(job_id: str) -> dict[str, str]:
    job = job_store.cancel_job(job_id)
    return {"status": job.status}


@router.patch("/api/records/{record_id}", response_model=JobResultItem)
def patch_record_endpoint(record_id: str, payload: PatchRecordRequest):
    if record_id not in job_store.records:
        raise HTTPException(status_code=404, detail="Record not found")

    errors = validate_patch_fields(payload.fields)
    if errors:
        return JSONResponse(status_code=422, content={"errors": errors})

    item = patch_record(record_id, payload.fields)
    return _build_job_result_item(item)


@router.post("/api/records/{record_id}/rerun", response_model=RerunRecordResponse)
async def rerun_record_endpoint(
    record_id: str,
    payload: RerunRecordRequest | None = None,
) -> RerunRecordResponse:
    req = payload or RerunRecordRequest()
    item, diff, is_preview = await rerun_record(
        record_id=record_id,
        provider_name=req.provider,
        model_name=req.model,
        overwrite_edited=req.overwrite_edited,
        preview_only=req.preview_only,
    )

    return RerunRecordResponse(
        item=_build_job_result_item(item),
        diff=diff,
        preview=is_preview,
    )


@router.get("/api/jobs/{job_id}/export.csv")
def export_job_csv_endpoint(job_id: str) -> Response:
    csv_data = generate_job_csv(job_id)
    headers = {
        "Content-Disposition": f'attachment; filename="job_{job_id}_records.csv"',
    }
    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers=headers,
    )


