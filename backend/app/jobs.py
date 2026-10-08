"""Job store and runner with concurrency cap and computed progress."""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app import tickets as ticket_store
from app.config import settings
from app.pipeline import process_item
from app.providers.base import Provider
from app.providers.factory import get_provider
from app.schemas import (
    ExtractedRecord,
    FieldMeta,
    Flag,
    ItemStatus,
    JobProgress,
    JobStatus,
)


@dataclass
class Item:
    ticket_id: str
    record_id: str
    status: ItemStatus
    attempts: int = 0
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
    started_at: datetime | None = None
    finished_at: datetime | None = None


@dataclass
class Job:
    id: str
    ticket_ids: list[str]
    status: JobStatus
    created_at: datetime
    finished_at: datetime | None = None
    items: dict[str, Item] = field(default_factory=dict)
    config_snapshot: dict[str, Any] = field(default_factory=dict)


class JobStore:
    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}
        self.records: dict[str, Item] = {}
        self._tasks: set[asyncio.Task] = set()

    def create_job(self, ticket_ids: list[str]) -> Job:
        """Validate ticket ids exist, deduplicate preserving order, and create queued items."""
        if not ticket_ids:
            raise HTTPException(status_code=422, detail="ticket_ids cannot be empty")

        unknown = [tid for tid in ticket_ids if ticket_store.get_ticket(tid) is None]
        if unknown:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown ticket IDs: {', '.join(unknown)}",
            )

        seen: set[str] = set()
        deduped: list[str] = []
        for tid in ticket_ids:
            if tid not in seen:
                seen.add(tid)
                deduped.append(tid)

        job_id = uuid.uuid4().hex[:12]
        jobid8 = job_id[:8]
        now = datetime.now(timezone.utc)

        job_items: dict[str, Item] = {}
        for tid in deduped:
            rec_id = f"rec_{jobid8}_{tid}"
            item = Item(
                ticket_id=tid,
                record_id=rec_id,
                status="queued",
            )
            job_items[tid] = item
            self.records[rec_id] = item

        job = Job(
            id=job_id,
            ticket_ids=deduped,
            status="queued",
            created_at=now,
            items=job_items,
            config_snapshot={
                "provider": settings.PROVIDER,
                "max_concurrency": settings.MAX_CONCURRENCY,
            },
        )
        self.jobs[job_id] = job
        return job

    def progress(self, job: Job) -> JobProgress:
        """Compute progress counters on the fly from current item statuses."""
        total = len(job.ticket_ids)
        queued = sum(1 for it in job.items.values() if it.status == "queued")
        running = sum(1 for it in job.items.values() if it.status == "running")
        done = sum(1 for it in job.items.values() if it.status == "done")
        needs_review = sum(1 for it in job.items.values() if it.status == "needs_review")
        failed = sum(1 for it in job.items.values() if it.status == "failed")
        cancelled = sum(1 for it in job.items.values() if it.status == "cancelled")
        finished = done + needs_review + failed + cancelled
        percent = round((finished / total) * 100, 1) if total > 0 else 0.0

        return JobProgress(
            total=total,
            queued=queued,
            running=running,
            done=done,
            needs_review=needs_review,
            failed=failed,
            cancelled=cancelled,
            finished=finished,
            percent=percent,
        )

    def start_job(self, job: Job, provider: Provider | None = None) -> asyncio.Task:
        """Start async runner with strong task reference so it is not garbage-collected."""
        task = asyncio.create_task(self.run_job(job, provider=provider))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return task

    async def run_job(self, job: Job, provider: Provider | None = None) -> None:
        """Run extraction for all items with MAX_CONCURRENCY cap."""
        if job.status == "cancelled":
            return

        job.status = "running"
        active_provider = provider if provider is not None else get_provider()
        semaphore = asyncio.Semaphore(settings.MAX_CONCURRENCY)

        async def _run_item(item: Item) -> None:
            if job.status == "cancelled" or item.status == "cancelled":
                item.status = "cancelled"
                item.finished_at = datetime.now(timezone.utc)
                return

            async with semaphore:
                if job.status == "cancelled":
                    item.status = "cancelled"
                    item.finished_at = datetime.now(timezone.utc)
                    return

                item.status = "running"
                item.started_at = datetime.now(timezone.utc)

                try:
                    ticket = ticket_store.get_ticket(item.ticket_id)
                    if ticket is None:
                        item.status = "failed"
                        item.error = f"Ticket {item.ticket_id} not found"
                    else:
                        res = await process_item(active_provider, ticket)
                        # Only apply result if job was not cancelled while we were waiting
                        if item.status != "cancelled":
                            item.status = res.status
                            item.attempts = res.attempts
                            item.record = res.record
                            item.draft = res.draft
                            item.field_meta = res.field_meta
                            item.flags = res.flags
                            item.raw_outputs = res.raw_outputs
                            item.validation_errors = res.validation_errors
                            item.error = res.error
                except Exception as exc:
                    if item.status != "cancelled":
                        item.status = "failed"
                        item.error = str(exc)
                finally:
                    if item.status == "running":
                        item.status = "failed"
                        item.error = item.error or "Task ended unexpectedly"
                    item.finished_at = datetime.now(timezone.utc)

        # Process all items concurrently subject to semaphore
        await asyncio.gather(*(_run_item(it) for it in job.items.values()), return_exceptions=True)

        # Terminal state for job set in the exact same function once all items complete
        if job.status != "cancelled":
            job.status = "done"
            job.finished_at = datetime.now(timezone.utc)

    def cancel_job(self, job_id: str) -> Job:
        """Cancel a job, marking only queued or running items as cancelled."""
        job = self.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.status in ("done", "cancelled", "failed"):
            raise HTTPException(
                status_code=409,
                detail=f"Job is already in terminal state '{job.status}'",
            )

        job.status = "cancelled"
        now = datetime.now(timezone.utc)
        job.finished_at = now
        for item in job.items.values():
            if item.status in ("queued", "running"):
                item.status = "cancelled"
                item.finished_at = now
        return job


job_store = JobStore()
