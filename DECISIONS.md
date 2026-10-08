# Engineering Decisions

This document details the architectural and product trade-offs made during the design and implementation of Extraction Workbench.

---

## 1. Why No Database?

**Decision**: All jobs, item progress counters, extracted records, and human edits are maintained in-memory within Python dictionaries (`job_store.jobs` and `job_store.records`).

**Rationale**:
- The project specification explicitly stipulates zero external database dependencies to enable straightforward grading and local evaluation.
- Storing state in memory removes the operational burden of provisioning PostgreSQL, SQLite migrations, or Redis instances.
- For an evaluation workload of 150 tickets, Python dictionaries provide $O(1)$ lookup performance, instant reads/writes, and zero connection overhead.

**Consequence & Limitation**:
- All state is wiped if the backend process restarts.
- The FastAPI application must be executed with a single Uvicorn worker process (`--workers 1`). Running multiple worker processes would shard memory across separate Python interpreters, leading to state inconsistencies.
- In a production evolution of this tool, `JobStore` would be backed by an async ORM (such as SQLModel/SQLAlchemy) pointing to PostgreSQL or SQLite.

---

## 2. Why a Deterministic Mock Provider?

**Decision**: The default extraction engine is `MockProvider`, which derives structured fields using pattern matching, regex heuristics, and predefined deliberate failure cases.

**Rationale**:
- External LLM APIs (OpenAI, Anthropic, Gemini) introduce non-deterministic completions, network latency, rate limits, and quota exhaustion during automated test runs.
- Evaluators should be able to clone the repository, run `pytest`, and evaluate the entire pipeline without registering for an API key or incurring billing costs.
- The mock provider explicitly simulates real-world LLM extraction behaviors:
  - Configurable artificial network latency (`MOCK_DELAY_MIN_MS` to `MOCK_DELAY_MAX_MS`).
  - Deliberate schema failure on attempt 1 with recovery on attempt 2 (`tkt_0017`, `tkt_0063`).
  - Deliberate unrecoverable failure after 2 attempts (`tkt_0042`, `tkt_0121`), routing into `needs_review`.
  - Evidence quote generation and confidence scoring.

---

## 3. Why Human-in-the-Loop Review?

**Decision**: Records with schema validation failures, missing content, ungrounded evidence quotes, or currency discrepancies are routed to an interactive human review queue rather than silently forced into arbitrary shapes.

**Rationale**:
- Support tickets frequently trigger critical operational actions (issuing financial refunds, initiating contract cancellations, escalating critical outages).
- An autonomous LLM making confident yet hallucinated guesses on financial amounts or contract deadlines can cause severe operational damage.
- Human review is prioritized by urgency: unresolved `needs_review` items appear first, followed by failed items, and finally completed items.

---

## 4. Why Can Severity Remain Null?

**Decision**: When a ticket does not explicitly indicate severity, `severity` is set to `null` and a `not_stated` flag is recorded.

**Rationale**:
- Defaulting missing severities to `"medium"` is deceptive. If 50% of routine questions have unstated severity, flooding triage queues with synthetic `"medium"` tags obscures genuine issues.
- More dangerously, defaulting to `"medium"` could downplay a critical outage if an executive email omits explicit severity keywords.
- Storing `null` is an honest reflection of the source data. The reviewer can choose to leave it unstated or assign a severity based on operational context.

---

## 5. Why Don't We Convert EUR to USD?

**Decision**: In tickets mentioning foreign currency (such as `tkt_0058` quoting `4 820 EUR`), `refund_amount` is set to `null` and a `currency_mismatch` flag is raised.

**Rationale**:
- The schema explicitly defines `refund_amount` as a USD float.
- Applying an arbitrary or hardcoded currency conversion rate introduces floating-point inaccuracies and currency exchange volatility.
- Silently converting EUR to USD would create a derived value that the customer never agreed to. Setting `refund_amount: null` forces a human reviewer to inspect the ticket and enter the exact approved USD refund amount.

---

## 6. Why Cancellation is Authoritative

**Decision**: When a job is cancelled via `POST /api/jobs/{id}/cancel`, all queued and currently running items are marked as `cancelled`. When a worker completes its extraction task, it explicitly checks whether the item was cancelled before updating record state.

**Rationale**:
- In asynchronous systems with concurrency, worker tasks already in flight may finish seconds after a user clicks "Cancel".
- If late-finishing tasks were allowed to write their results to the record store, a job marked `cancelled` could have items silently change from `cancelled` to `done`.
- Checking `if item.status != "cancelled"` before mutating state ensures that user cancellation is authoritative and cannot be overwritten by background worker races.

---

## 7. Why HTTP Polling Over Server-Sent Events (SSE)?

**Decision**: The frontend polls `GET /api/jobs/{id}` and `GET /api/jobs/{id}/results` every 1000ms while a job is active, stopping once terminal status (`done`, `cancelled`, `failed`) is reached.

**Rationale**:
- Free-tier serverless proxies (Vercel, Render free tier) frequently drop, buffer, or timeout long-lived HTTP streaming connections.
- Polling requires zero custom connection state, reconnect backoff logic, or event streaming infrastructure.
- To prevent network congestion, the frontend implements:
  - `inFlightRef`: Drops poll requests if a previous HTTP response is still traveling over the network.
  - `AbortController`: Aborts pending network requests immediately when the user navigates away or unmounts the page.
  - Optimistic local cache updates: Inline field edits update the UI immediately without waiting for the next polling interval.

---

## 8. Multi-Issue Ticket Category Priority

**Decision**: When a ticket touches multiple distinct issues (`tkt_0089`), the primary category is assigned using a strict risk-based priority order:
$$\text{churn\_risk} > \text{outage} > \text{billing} > \text{bug} > \text{feature\_request} > \text{how\_to}$$

**Rationale**:
- A single ticket may report a bug while simultaneously threatening contract termination. Churn risk and system outages demand immediate routing to executive or engineering incident teams.
- Secondary topics are not discarded: they are preserved in `multi_issue` flags and reviewer notes so the human reviewer can inspect the full context in the ticket viewer.

---

## 9. Near-Empty Tickets and Model Bypassing

**Decision**: Ticket bodies containing fewer than 10 alphabetic characters after cleanup (e.g. `tkt_0004` saying "please advise" or "?") bypass provider execution entirely.

**Rationale**:
- Sending near-empty prompts to an LLM reliably produces hallucinations, as the model attempts to generate plausible values for required schema fields.
- Bypassing the model saves API quota and processing time.
- The ticket immediately enters `needs_review` with a `skipped_model` flag and a company name inferred from the sender's email domain, giving the human reviewer a clear starting point.
