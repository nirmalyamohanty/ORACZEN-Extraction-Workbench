from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.tickets import load_tickets

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "tickets.jsonl"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _load_real_tickets():
    load_tickets(DATA_PATH)


def test_every_line_of_real_file_loads():
    load_tickets(DATA_PATH)
    with DATA_PATH.open(encoding="utf-8") as f:
        lines = [ln.strip() for ln in f if ln.strip()]
    assert len(lines) == 150


@pytest.mark.asyncio
async def test_get_unknown_ticket_returns_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tickets/tkt_9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_tickets_returns_summaries():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tickets?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 150
    assert len(data["items"]) == 5
    assert "body_preview" in data["items"][0]


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_search_tickets_by_id_and_email():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Search by 'tkt' matches all 150 tickets
        resp = await client.get("/api/tickets?q=tkt")
        assert resp.status_code == 200
        assert resp.json()["total"] == 150

        # Search by specific ID
        resp_single = await client.get("/api/tickets?q=tkt_0089")
        assert resp_single.status_code == 200
        assert resp_single.json()["total"] == 1
        assert resp_single.json()["items"][0]["id"] == "tkt_0089"
