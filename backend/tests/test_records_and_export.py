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


@pytest.mark.asyncio
async def test_rerun_record_preserves_human_edits_by_default():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0001"]})
        job_id = res.json()["job_id"]
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        item = job.items["tkt_0001"]
        rec_id = item.record_id

        # Patch severity to 'low'
        await client.patch(
            f"/api/records/{rec_id}",
            json={"fields": {"severity": "low"}},
        )
        assert "severity" in item.edited_fields
        assert item.record.severity == "low"

        # Re-run without overwrite_edited (default false)
        rerun_res = await client.post(
            f"/api/records/{rec_id}/rerun",
            json={"overwrite_edited": False},
        )
        assert rerun_res.status_code == 200
        data = rerun_res.json()

        # Human-edited severity must be preserved!
        assert data["item"]["record"]["severity"] == "low"
        assert "severity" in data["item"]["edited_fields"]
        assert data["diff"]["severity"]["is_edited"] is True
        assert data["diff"]["severity"]["will_replace"] is False


@pytest.mark.asyncio
async def test_rerun_record_overwrites_when_flag_true():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0001"]})
        job_id = res.json()["job_id"]
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        item = job.items["tkt_0001"]
        rec_id = item.record_id

        # Patch severity to 'low'
        await client.patch(
            f"/api/records/{rec_id}",
            json={"fields": {"severity": "low"}},
        )

        # Re-run with overwrite_edited = True
        rerun_res = await client.post(
            f"/api/records/{rec_id}/rerun",
            json={"overwrite_edited": True},
        )
        assert rerun_res.status_code == 200
        data = rerun_res.json()

        assert data["diff"]["severity"]["will_replace"] is True
        # Since it was overwritten by model, severity is whatever mock produced
        assert data["item"]["record"]["company"] == "Castlerock Mining"


@pytest.mark.asyncio
async def test_rerun_record_preview_mode_does_not_mutate():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0001"]})
        job_id = res.json()["job_id"]
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        item = job.items["tkt_0001"]
        rec_id = item.record_id

        # Patch company
        await client.patch(
            f"/api/records/{rec_id}",
            json={"fields": {"company": "Custom Human Company"}},
        )

        # Preview rerun
        preview_res = await client.post(
            f"/api/records/{rec_id}/rerun",
            json={"preview_only": True, "overwrite_edited": True},
        )
        assert preview_res.status_code == 200
        preview_data = preview_res.json()
        assert preview_data["preview"] is True
        # In preview, item.record in response shows the projected value
        assert preview_data["item"]["record"]["company"] == "Castlerock Mining"

        # But in actual job_store, item is NOT changed
        assert item.record.company == "Custom Human Company"


@pytest.mark.asyncio
async def test_patch_nonexistent_record_returns_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Patch on nonexistent record with invalid field should return 404, not 422
        patch_res = await client.patch(
            "/api/records/rec_nonexistent_0000",
            json={"fields": {"non_existent_field": "invalid"}},
        )
        assert patch_res.status_code == 404


@pytest.mark.asyncio
async def test_failed_rerun_does_not_wipe_data():
    """When a rerun fails (e.g., ticket fails extraction twice), existing valid data must not be wiped to None."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a valid job first with tkt_0001
        res = await client.post("/api/jobs", json={"ticket_ids": ["tkt_0001"]})
        job_id = res.json()["job_id"]
        job = job_store.jobs[job_id]
        while job.status != "done":
            import asyncio
            await asyncio.sleep(0.05)

        item = job.items["tkt_0001"]
        rec_id = item.record_id
        assert item.record is not None
        saved_company = item.record.company

        # Simulate rerunning with a failing provider or failing ticket ID
        item.ticket_id = "tkt_0042"  # mock_fail_twice ticket
        rerun_res = await client.post(f"/api/records/{rec_id}/rerun", json={})
        assert rerun_res.status_code == 200
        data = rerun_res.json()

        # The rerun failed so status is needs_review, but draft retains company
        assert data["item"]["draft"]["company"] == saved_company

