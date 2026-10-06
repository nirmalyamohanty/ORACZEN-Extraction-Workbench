import csv
import io
import pytest
from httpx import ASGITransport, AsyncClient

from app.jobs import job_store
from app.main import app
from app.records import sanitize_csv_cell
from app.schemas import ExtractedRecord, Flag


@pytest.mark.asyncio
async def test_patch_valid_field_and_audit_trail():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a job with tkt_0001
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0001"]})
        assert res.status_code == 202
        job_id = res.json()["job_id"]

        # Wait until done
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        item = job.items["tkt_0001"]
        rec_id = item.record_id
        original_sev = item.record.severity if item.record else None

        # Patch severity to 'critical'
        patch_res = await client.patch(
            f"/api/records/{rec_id}",
            json={"fields": {"severity": "critical"}},
        )
        assert patch_res.status_code == 200
        data = patch_res.json()
        assert data["record"]["severity"] == "critical"
        assert "severity" in data["edited_fields"]
        assert data["original_values"]["severity"] == original_sev
        assert data["field_meta"]["severity"]["source"] == "human"
        assert data["field_meta"]["severity"]["confidence"] == 1.0
        assert data["field_meta"]["severity"]["grounded"] is True


@pytest.mark.asyncio
async def test_patch_invalid_value_returns_422_keyed():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0002"]})
        job_id = res.json()["job_id"]
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        item = job.items["tkt_0002"]
        rec_id = item.record_id
        prev_sev = item.record.severity if item.record else None

        # Patch invalid severity
        patch_res = await client.patch(
            f"/api/records/{rec_id}",
            json={"fields": {"severity": "ultra_urgent"}},
        )
        assert patch_res.status_code == 422
        body = patch_res.json()
        assert "errors" in body
        assert "severity" in body["errors"]
        # Ensure record was unchanged
        assert (item.record.severity if item.record else None) == prev_sev


@pytest.mark.asyncio
async def test_patch_unknown_field_returns_422():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0003"]})
        job_id = res.json()["job_id"]
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        rec_id = job.items["tkt_0003"].record_id
        patch_res = await client.patch(
            f"/api/records/{rec_id}",
            json={"fields": {"non_existent_field": "foo"}},
        )
        assert patch_res.status_code == 422
        assert "non_existent_field" in patch_res.json()["errors"]


@pytest.mark.asyncio
async def test_patch_needs_review_resolves_when_valid():
    job = job_store.create_job(["tkt_0004"])
    item = job.items["tkt_0004"]
    item.status = "needs_review"
    item.resolved = False
    item.draft = {
        "company": "Sunbelt Utilities",
        "product": None,
        "category": "how_to",
        "severity": None,
        "requested_action": "information",
        "refund_amount": None,
        "deadline": None,
        "escalated": False,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Patch product
        res = await client.patch(
            f"/api/records/{item.record_id}",
            json={"fields": {"product": "Zen Studio"}},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["resolved"] is True
        assert item.resolved is True
        assert data["record"]["product"] == "Zen Studio"


def test_csv_injection_guard():
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_csv_cell("-2+3") == "'-2+3"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("Safe company") == "Safe company"
    assert sanitize_csv_cell(None) == ""
    assert sanitize_csv_cell(True) == "true"


@pytest.mark.asyncio
async def test_csv_export_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0005"]})
        job_id = res.json()["job_id"]
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        # Patch a field so edited_fields is present
        rec_id = job.items["tkt_0005"].record_id
        await client.patch(
            f"/api/records/{rec_id}",
            json={"fields": {"escalated": True}},
        )

        csv_resp = await client.get(f"/api/jobs/{job_id}/export.csv")
        assert csv_resp.status_code == 200
        assert "text/csv" in csv_resp.headers["content-type"]
        assert f'filename="job_{job_id}_records.csv"' in csv_resp.headers["content-disposition"]

        reader = csv.DictReader(io.StringIO(csv_resp.text))
        rows = list(reader)
        assert len(rows) == 1
        assert rows[0]["ticket_id"] == "tkt_0005"
        assert rows[0]["escalated"] == "true"
        assert "escalated" in rows[0]["edited_fields"]
