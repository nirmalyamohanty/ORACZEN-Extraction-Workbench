# Engineering Decisions

This document details the architectural decisions, trade-offs, dataset observations, and design rationales made during the development of Extraction Workbench.

---

## 1. Core Architectural & Extraction Decisions

### 1.1 In-Memory Job Store Over Database
- **Decision**: All active jobs, record statuses, and human edits reside in-memory within Python dictionaries (`app.jobs.job_store`).
- **Rationale**: The specification requires zero database setup to facilitate rapid evaluation and clean cloning. An in-memory store avoids migrations, Docker/PostgreSQL dependencies, and connection overhead.
- **Trade-off**: State resets upon server restart, and the backend must run as a single process (`uvicorn --workers 1`) to avoid process memory sharding.

### 1.2 Deterministic Mock Provider as Default
- **Decision**: The extraction engine defaults to `MockProvider` using regex and heuristic rules with simulated latency.
- **Rationale**: Eliminates external API dependencies, billing friction, rate limits, and non-deterministic behavior during evaluation. Deliberately simulates attempt-1 retry recoveries (`tkt_0017`, `tkt_0063`) and unrecoverable failures (`tkt_0042`, `tkt_0121`).

### 1.3 Human-in-the-Loop Review Queue
- **Decision**: Records failing validation, missing grounded evidence, or exhibiting ambiguous values route to a prioritized human triage queue rather than being forced into synthetic outputs.
- **Rationale**: Support workflows handle refunds, enterprise cancellations, and executive escalations. Human oversight prevents catastrophic hallucinated actions while prioritizing urgent items.

### 1.4 Honest Null Values (Severity & Refund Amount)
- **Decision**: When severity is not explicitly stated in the ticket, it remains `null` with a `not_stated` flag. Similarly, non-USD amounts (e.g. `4 820 EUR` in `tkt_0058`) leave `refund_amount` as `null` with a `currency_mismatch` flag.
- **Rationale**: Defaulting unstated severities to `"medium"` masks critical outages and clutters triage. Arbitrarily converting foreign currencies introduces floating-point inaccuracies and unauthorized currency conversions. Storing `null` truthfully reflects ticket data and alerts human operators.

### 1.5 Authoritative Cancellation
- **Decision**: Calling `POST /api/jobs/{id}/cancel` immediately marks pending and active items as `cancelled`. Workers explicitly check item status before committing results to the store.
- **Rationale**: In asynchronous concurrency with semaphore limits, tasks in flight may complete shortly after cancellation. Guarding store writes prevents late-finishing tasks from overwriting user cancellation.

### 1.6 HTTP Polling Over Server-Sent Events (SSE)
- **Decision**: Frontend polls `GET /api/jobs/{id}` and `/results` at 1000ms intervals with deduplicated in-flight requests and `AbortController` cancellation.
- **Rationale**: Long-lived SSE/WebSocket connections frequently suffer buffering, proxy timeouts, or disconnects on free-tier cloud platforms. Polling is stateless, universally supported, and resilient against proxy interruptions.

### 1.7 Multi-Issue Hierarchy & Near-Empty Handling
- **Decision**: Multi-issue tickets (`tkt_0089`) prioritize high-risk categories ($\text{churn\_risk} > \text{outage} > \text{billing} > \text{bug} > \text{feature\_request} > \text{how\_to}$), recording secondary tags in `multi_issue` flags. Bodies with fewer than 10 characters (`tkt_0004`) bypass the model entirely, directly entering `needs_review` to prevent hallucination.

---

## 2. What I Noticed in the Data

Analyzing the 150 tickets in `data/tickets.jsonl` revealed key real-world messy data patterns:
1. **Quoted Thread Contamination**: Many email tickets contain trailing `> On ... wrote:` blocks from internal support agents (`@oraczen.ai`). Preprocessing must strip these quotes so model extraction is grounded purely in the customer's input.
2. **Signature & Domain Discrepancies**: Senders occasionally submit from personal accounts (`@gmail.com`) while their email signature explicitly identifies enterprise clients (e.g. `Acme Corp`). Preprocessing prioritizes signature block company cues before falling back to domain mapping.
3. **Contradictory Subject Lines**: Subjects such as "Quick question / How to" frequently mask high-severity database outages or churn threats, necessitating whole-body text scanning rather than subject-line reliance.
4. **Currency Heterogeneity**: European tickets quote amounts in EUR (`4 820 EUR`), which would lead to silent accounting errors if parsed as USD without currency validation.
5. **Near-Empty & Fragmented Submissions**: Tickets containing only punctuation (`?`) or generic phrases ("please advise") cause models to hallucinate required fields unless intercepted prior to provider execution.

---

## 3. Parts I'm Least Happy With

1. **In-Memory Volatility**: The lack of persistent storage means active jobs and human review edits are lost if the server process restarts. It also strictly caps backend scalability to a single worker process (`--workers 1`).
2. **Polling Network Overhead**: While 1-second polling is rock-solid across free-tier hosting proxies, it introduces redundant HTTP request churn compared to push-based streaming sockets.
3. **Heuristic Preprocessing Fragility**: Company extraction and footer removal rely on regex heuristics. While effective for the 150-ticket evaluation dataset, unusual email signatures or novel disclaimer templates can bypass these heuristics without a specialized named-entity recognition (NER) pass.

---

## 4. What I'd Do with Another Day

1. **Persistent Relational Storage**: Migrate `JobStore` to PostgreSQL or SQLite via SQLModel with async sessions, enabling multi-worker deployment and audit history retention.
2. **Live LLM Integration**: Implement production provider classes for Anthropic (Claude 3.5 Sonnet) and OpenAI (GPT-4o) using native tool-calling/JSON schema modes with automatic schema repair fallbacks.
3. **Resilient SSE / WebSockets**: Implement server-sent events with reconnect backoff and a polling fallback to provide instantaneous progress streaming.
4. **Batch Operator Actions**: Add bulk-review capabilities ("Accept all high-confidence", "Mark all resolved") to accelerate high-volume human triage.
5. **Embedding-Based Grounding**: Upgrade evidence grounding from exact substring matching to semantic span verification with sentence-level citations.
