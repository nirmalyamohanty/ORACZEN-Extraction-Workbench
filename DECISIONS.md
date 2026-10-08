# Decisions

## The five decisions

### 1. A ticket says nothing about severity — what does the model return?

Severity comes back as `null` and a `not_stated` flag is attached to the record.
I rejected defaulting to `"medium"` because a wrong severity can hide a real outage — an
ops team triaging a `critical` board-demo failure should not have to dig past a queue full
of `medium` items that are medium only by default. An empty field is honest; a wrong default
is not. The item does not go to `needs_review` for this alone — missing severity is a gap
the reviewer can fill or leave, not a system error. (About half the how-to and
feature-request tickets never state a severity; flooding `needs_review` would make the tool
useless.)

### 2. `tkt_0058` is in French and mentions 4 820 EUR — what does `refund_amount` hold?

`refund_amount` is set to `null` and a `currency_mismatch` flag is added with the message
"Customer stated 4 820 EUR (two duplicate charges). Field is USD; enter USD amount manually."
The original amount is kept in the flag message and in `FieldMeta.note` so the reviewer
sees exactly what the customer said. Silently converting at any exchange rate would give a
number that looks precise but is wrong the moment the rate changes. Null forces the
reviewer to enter the correct USD figure.

### 3. `tkt_0089` has three problems and two categories — how is multi-issue handled?

The pipeline picks the single highest-risk category using a fixed priority order:
`churn_risk > outage > billing > bug > feature_request > how_to`. A `multi_issue` flag
records every other detected category. The schema stays flat (one category per record) and
the most urgent signal drives routing. Reviewers can read the full ticket in the side panel
to understand the other issues.

### 4. Tickets whose bodies are `please advise` and `?` — do they go to the model?

No. Bodies with fewer than 10 alphabetic characters after cleaning are classified as
near-empty and bypassed. The record goes straight to `needs_review` with a `skipped_model`
flag. A company guess is inferred from the sender's email domain so the reviewer has
something to start from. Sending these to the model wastes quota and reliably produces
hallucinated records that look plausible.

### 5. Progress reporting — polling or streaming?

Polling. The frontend polls `GET /api/jobs/{id}` and `GET /api/jobs/{id}/results` every second, using an `inFlightRef` to prevent concurrent polls from stacking if network latency spikes, and an `AbortController` to cleanly abort pending requests on unmount. Polling stops automatically once the job reaches a terminal state (`done`, `cancelled`, `failed`).

Polling is the right default for this use case: it works reliably on free-tier hosting and serverless proxies that buffer or terminate long-lived connections (Vercel, Render free tier). SSE would lower the request count at scale, but it adds a server-side async generator, an `EventSource` on the client, and a fallback path for proxies that strip chunked responses — complexity that is not justified for an internal review tool used by a handful of reviewers. SSE is noted as future work if the tool is deployed at scale.

---

## What I noticed in the ticket data

Reading the first twenty or so tickets before writing any code saved a lot of rework:

- **Subject lines contradict the body** in several tickets (e.g. subject "How do I..."
  on what is plainly a bug report). The extractor ignores the subject for field values.
- **Quoted reply chains** include staff replies (`@oraczen.ai`) with old dates and
  "following up, still no response". If those aren't stripped first, the model treats
  them as the customer's current claim. About 38 tickets have them.
- **Company name is absent from the body** in roughly 64 of 150 tickets; the only
  clue is the sender domain. In tkt_0058, tkt_0089, and tkt_0131 the signature company
  and sender domain actively disagree — the signature wins but the mismatch is flagged.
- **Two amounts appear in billing tickets**: the amount charged and the amount quoted.
  The model must not invent a refund for a quote-vs-invoice dispute; those land with a
  `derived_value` flag instead.
- **Relative dates mix deadlines with event dates**: "billed on the 7th" is past, not
  a deadline. "before the 27th" is a deadline — but tkt_0002 was received on 28 Aug,
  so "the 27th" resolves to 27 Sep. Getting this wrong would show a date that has
  already passed.
- `tkt_0131` is a phone transcript where the customer says "about nine thousand
  something". The mock converts it to 9000.0 with an `approximate_amount` flag and
  confidence 0.3.

---

## What breaks on process restart

Everything. All jobs, all extracted records, all human edits are stored in Python dicts
in memory. A restart wipes them. This is fine for a graded exercise but not for
production. With another day I would add an optional SQLite backend behind the same
`JobStore` interface — no change to routes or the frontend. The single-worker constraint
(needed for consistent in-memory state) also means the backend can only use one CPU core;
that would go away with a real store.

---

## What I would test on the frontend beyond the one test

The current test covers field-error display and the sort order of the results list.
I would also want:

- **Polling teardown**: mount the hook, advance fake timers past the 1-second interval,
  unmount, and assert no further fetch calls happen. Prevents memory leaks in long-running
  tabs.
- **Abort-controller non-stacking**: simulate a slow first response, verify a second tick
  does not fire a new request while the first is in flight.
- **PATCH validation feedback**: verify the saving state is displayed and inline
  422 validation errors are rendered under the specific rejected field.
- **Export CSV button**: assert the `<a>` href points to the correct URL with the right
  job id.

---

## What I am least happy with

- The mock provider's field rules are keyword-based regexes, not real inference.
  Determinism is achieved by hardcoding behaviour for specific ticket patterns rather than
  actually deriving fields from text. A real provider would do it differently.
- `patch_record` re-validates the entire merged record on every call. For a single-field
  patch this is fine, but it means a `needs_review` draft with multiple missing required
  fields cannot be partially saved unless the dummy baseline covers them. The current
  workaround (a `dummy` dict with defaults) is slightly hacky.
