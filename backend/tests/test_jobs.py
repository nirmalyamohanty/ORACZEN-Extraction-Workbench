import asyncio
import json
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.jobs import JobStore
from app.main import app
from app.schemas import Ticket
from app import tickets as ticket_store


def _valid_json(**overrides: object) -> str:
    base = {
        "company": "Castlerock Mining",
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


class ControlledProvider:
    name = "controlled"

    def __init__(self, count: int) -> None:
        self.events = {i: asyncio.Event() for i in range(count)}
        self.started = {i: asyncio.Event() for i in range(count)}
        self._index = 0

    async def extract(self, ticket: Ticket, *, attempt: int, **kwargs) -> str:
        idx = int(ticket.id.split("_")[-1]) % len(self.events)
        self.started[idx].set()
        await self.events[idx].wait()
        return _valid_json()


@pytest.mark.asyncio
async def test_progress_arithmetic():
    """Verify progress counters sum to total at every stage and job flips to done on last item."""
    store = JobStore()
    tids = ["tkt_0001", "tkt_0002", "tkt_0003", "tkt_0005", "tkt_0006"]
    job = store.create_job(tids)

    # Initial state
    prog0 = store.progress(job)
    assert prog0.total == 5
    assert prog0.queued == 5
    assert prog0.running == 0
    assert prog0.done == 0
    assert prog0.finished == 0
    assert prog0.percent == 0.0
    assert job.status == "queued"
    assert job.finished_at is None

    events = [asyncio.Event() for _ in range(5)]

    class StepProvider:
        name = "step"

        async def extract(self, ticket: Ticket, *, attempt: int, **kwargs) -> str:
            idx = tids.index(ticket.id)
            await events[idx].wait()
            return _valid_json()

    task = store.start_job(job, provider=StepProvider())

    # Give event loop a cycle to start workers
    await asyncio.sleep(0.02)
    prog_mid = store.progress(job)
    assert (
        prog_mid.queued
        + prog_mid.running
        + prog_mid.done
        + prog_mid.needs_review
        + prog_mid.failed
        + prog_mid.cancelled
        == prog_mid.total
    )
    assert job.status == "running"
    assert job.finished_at is None

    # Release items one by one
    for i in range(5):
        events[i].set()
        await asyncio.sleep(0.02)
        prog = store.progress(job)
        assert (
            prog.queued
            + prog.running
            + prog.done
            + prog.needs_review
            + prog.failed
            + prog.cancelled
            == prog.total
        )
        if i < 4:
            assert job.status != "done"
            assert job.finished_at is None

    await task
    assert job.status == "done"
    assert job.finished_at is not None
    prog_end = store.progress(job)
    assert prog_end.done == 5
    assert prog_end.finished == 5
    assert prog_end.percent == 100.0


@pytest.mark.asyncio
async def test_fails_twice_job_completes():
    """Verify one failing ticket lands in needs_review, others succeed, and job still marks done."""
    store = JobStore()
    tids = ["tkt_0001", "tkt_0002", "tkt_0003", "tkt_0005", "tkt_0006"]
    job = store.create_job(tids)
    bad_id = tids[2]

    class PartialFailProvider:
        name = "partial_fail"

        async def extract(self, ticket: Ticket, *, attempt: int, **kwargs) -> str:
            if ticket.id == bad_id:
                return "Not a valid json"
            return _valid_json()

    await store.run_job(job, provider=PartialFailProvider())

    assert job.status == "done"
    assert job.items[bad_id].status == "needs_review"
    assert len(job.items[bad_id].raw_outputs) == 2
    assert any(f.code == "invalid_model_output" for f in job.items[bad_id].flags)

    done_count = sum(1 for it in job.items.values() if it.status == "done")
    assert done_count == 4
    prog = store.progress(job)
    assert prog.done == 4
    assert prog.needs_review == 1
    assert prog.finished == 5


@pytest.mark.asyncio
async def test_concurrency_cap():
    """Verify concurrency is capped at MAX_CONCURRENCY."""
    store = JobStore()
    tids = ["tkt_0001", "tkt_0002", "tkt_0003", "tkt_0005", "tkt_0006", "tkt_0007", "tkt_0008", "tkt_0009"]
    job = store.create_job(tids)

    in_flight = 0
    max_in_flight = 0
    lock = asyncio.Lock()

    class ConcurrencyCheckProvider:
        name = "concurrency_check"

        async def extract(self, ticket: Ticket, *, attempt: int, **kwargs) -> str:
            nonlocal in_flight, max_in_flight
            async with lock:
                in_flight += 1
                if in_flight > max_in_flight:
                    max_in_flight = in_flight
            await asyncio.sleep(0.05)
            async with lock:
                in_flight -= 1
            return _valid_json()

    await store.run_job(job, provider=ConcurrencyCheckProvider())
    assert max_in_flight <= settings.MAX_CONCURRENCY
    assert max_in_flight > 1


@pytest.mark.asyncio
async def test_post_jobs_api_and_422():
    """Test 202 async response and 422 validations on create_job."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty list -> 422
        resp_empty = await client.post("/api/jobs", json={"ticket_ids": []})
        assert resp_empty.status_code == 422

        # Unknown id -> 422
        resp_unknown = await client.post("/api/jobs", json={"ticket_ids": ["tkt_9999"]})
        assert resp_unknown.status_code == 422
        assert "tkt_9999" in resp_unknown.json()["detail"]

        # Valid create -> 202
        resp = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0001", "tkt_0002"]})
        assert resp.status_code == 202
        data = resp.json()
        assert "job_id" in data
        assert data["status"] in ("queued", "running", "done")
        assert data["total"] == 2

        job_id = data["job_id"]
        # Poll GET /api/jobs/{id}
        job_resp = await client.get(f"/api/jobs/{job_id}")
        assert job_resp.status_code == 200
        job_data = job_resp.json()
        assert job_data["id"] == job_id
        assert len(job_data["items"]) == 2

        # Results endpoint
        results_resp = await client.get(f"/api/jobs/{job_id}/results")
        assert results_resp.status_code == 200
        results_data = results_resp.json()
        assert len(results_data["items"]) == 2

