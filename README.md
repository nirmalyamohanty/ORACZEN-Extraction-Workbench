# Extraction Workbench

Human review tool for LLM-extracted support ticket fields.


## Architecture

FastAPI backend (Python) and Next.js frontend talk over HTTP. The backend holds all state in memory for the life of the process — no database. An LLM (or the default mock) extracts structured fields from raw ticket text; the frontend lets a reviewer verify and correct each field inline. Concurrency is capped via a semaphore so the backend never fires more than `MAX_CONCURRENCY` provider calls at once.

## Prerequisites

- Python 3.11 or newer
- Node 18 or newer

## Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp ../.env.example .env     # Windows: copy ..\.env.example .env
uvicorn app.main:app --reload
```

The API is at `http://127.0.0.1:8000`. Verify it works:

```
GET /health          → {"status":"ok"}
GET /api/tickets     → list of 150 tickets
```

For deployment (Render / Railway / Fly): use the start command
`uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`.
**One worker only** — job state is in-memory and would split across workers.
Note: free-tier cold starts can take 30-60 s. Open the URL yourself before a demo.

## Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then:
```bash
npm run dev
```

Open `http://localhost:3000`.

For deployment (Vercel): set `NEXT_PUBLIC_API_URL` to the deployed backend URL.

## Tests

```bash
# Backend (from the backend/ directory)
cd backend
pytest

# Frontend (from the frontend/ directory)
cd frontend
npx vitest run
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PROVIDER` | `mock` | Which extraction provider to use (`mock`) |
| `MAX_CONCURRENCY` | `4` | Max simultaneous provider calls per job |
| `MOCK_DELAY_MIN_MS` | `300` | Min artificial delay in the mock provider |
| `MOCK_DELAY_MAX_MS` | `1200` | Max artificial delay in the mock provider |
| `MOCK_FAIL_ONCE_IDS` | `tkt_0017,tkt_0063` | Tickets that return invalid output on attempt 1, valid on attempt 2 |
| `MOCK_FAIL_TWICE_IDS` | `tkt_0042,tkt_0121` | Tickets that return invalid output on both attempts (land in `needs_review`) |
| `TICKETS_PATH` | `data/tickets.jsonl` | Path to the tickets file (relative to `backend/`) |
| `FRONTEND_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| `NEXT_PUBLIC_API_URL` | — | Backend base URL (frontend only) |

### Mock deliberate failures

To see the **retry path**: include `tkt_0017` or `tkt_0063` in a job. The mock returns `severity: "urgent"` (invalid) on attempt 1 and a valid record on attempt 2.

To see the **`needs_review` path**: include `tkt_0042` or `tkt_0121`. Both attempts return invalid output, so the item lands in `needs_review` with both raw outputs preserved.

Other interesting tickets to verify: `tkt_0004` and `tkt_0020` (near-empty bodies, skipped model), `tkt_0058` (French, EUR amount), `tkt_0089` (multi-issue, churn risk, escalated), `tkt_0105` (shorthand with typos), `tkt_0131` (phone transcript, spoken amount).

## Docs

See `DECISIONS.md` for design decisions and notes on what breaks on process restart.
