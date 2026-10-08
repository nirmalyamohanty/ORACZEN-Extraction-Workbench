// TypeScript types matching the FastAPI / Pydantic schemas on the backend
// keeping these in sync so we get full type-safety across API requests and responses

// support channels where customer tickets come from
export type Channel = "email" | "web_form" | "chat" | "phone_transcript";

// the 5 standard products sold by Oraczen that the LLM extracts
export type Product =
  | "Zen Orchestrator"
  | "Zen Studio"
  | "Zen Connect"
  | "Zen Insights"
  | "Zen Vault";

// ticket issue category classification
export type Category =
  | "outage"
  | "billing"
  | "bug"
  | "feature_request"
  | "how_to"
  | "churn_risk";

// urgency levels
export type Severity = "low" | "medium" | "high" | "critical";

// what the customer is asking us to do
export type RequestedAction =
  | "refund"
  | "credit"
  | "fix"
  | "callback"
  | "information"
  | "none";

// tracks whether a field was extracted by the AI model or overwritten by a human
export type FieldSource = "model" | "human";

// life-cycle state of the batch extraction job
export type JobStatus = "queued" | "running" | "done" | "cancelled";

// state of an individual ticket within a job
// 'needs_review' means the model extracted fields but validator caught low confidence or discrepancies
export type ItemStatus =
  | "queued"
  | "running"
  | "done"
  | "needs_review"
  | "failed"
  | "cancelled";

// the actual structured JSON record extracted from unstructured text
export interface ExtractedRecord {
  company: string;
  product: Product | null;
  category: Category;
  severity: Severity | null;
  requested_action: RequestedAction;
  refund_amount: number | null;
  deadline: string | null;
  escalated: boolean;
}

// metadata attached to each extracted field (confidence score, grounded quote, etc.)
export interface FieldMeta {
  confidence: number;
  grounded: boolean;
  evidence?: string | null; // direct quote snippet from the raw ticket body
  source: FieldSource;
  note?: string | null;
}

// validation warning or rule violation flagged during extraction
export interface Flag {
  code: string;
  field: string;
  message: string;
}

// full ticket record as stored in tickets.json
export interface Ticket {
  id: string;
  subject: string;
  body: string;
  channel: Channel;
  received_at: string;
  from_email: string;
  attachments: number;
}

// lightweight summary used for rendering the initial tickets table
export interface TicketSummary {
  id: string;
  subject: string;
  channel: Channel;
  received_at: string;
  from_email: string;
  attachments: number;
  body_preview: string;
}

export interface TicketListResponse {
  items: TicketSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateJobResponse {
  job_id: string;
  status: JobStatus;
  total: number;
}

// live progress counters returned by the job polling endpoint
export interface JobProgress {
  total: number;
  queued: number;
  running: number;
  done: number;
  needs_review: number;
  failed: number;
  cancelled: number;
  finished: number;
  percent: number;
}

export interface JobItemSummary {
  ticket_id: string;
  record_id: string;
  status: ItemStatus;
  attempts: number;
  flags_count: number;
  error?: string | null;
}

export interface JobResponse {
  id: string;
  status: JobStatus;
  created_at: string;
  finished_at?: string | null;
  progress: JobProgress;
  items: JobItemSummary[];
}

// mini ticket payload embedded inside job result items so review screen doesn't need extra fetches
export interface TicketSnippet {
  subject: string;
  body: string;
  channel: Channel;
  received_at: string;
  from_email: string;
}

// complete extraction item with draft edits, original values, and audit history
export interface JobResultItem {
  ticket_id: string;
  record_id: string;
  status: ItemStatus;
  attempts: number;
  record?: ExtractedRecord | null;
  draft?: Partial<ExtractedRecord> | null;
  field_meta: Record<string, FieldMeta>;
  flags: Flag[];
  edited_fields: string[]; // list of field keys modified by human reviewer
  original_values: Record<string, unknown>; // stores what the AI originally had before human edits
  resolved: boolean;
  raw_outputs: string[];
  validation_errors: string[];
  error?: string | null;
  ticket: TicketSnippet;
}

export interface JobResultsResponse {
  job_id: string;
  status: JobStatus;
  items: JobResultItem[];
}

// represents a single field comparison when re-running extraction
export interface FieldDiff {
  old_value: unknown;
  new_value: unknown;
  is_edited: boolean;
  will_replace: boolean;
}

export interface RerunRecordResponse {
  item: JobResultItem;
  diff: Record<string, FieldDiff>;
  preview: boolean;
}
