export type Channel = "email" | "web_form" | "chat" | "phone_transcript";

export type Product =
  | "Zen Orchestrator"
  | "Zen Studio"
  | "Zen Connect"
  | "Zen Insights"
  | "Zen Vault";

export type Category =
  | "outage"
  | "billing"
  | "bug"
  | "feature_request"
  | "how_to"
  | "churn_risk";

export type Severity = "low" | "medium" | "high" | "critical";

export type RequestedAction =
  | "refund"
  | "credit"
  | "fix"
  | "callback"
  | "information"
  | "none";

export type FieldSource = "model" | "human";

export type JobStatus = "queued" | "running" | "done" | "cancelled";

export type ItemStatus =
  | "queued"
  | "running"
  | "done"
  | "needs_review"
  | "failed"
  | "cancelled";

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

export interface FieldMeta {
  confidence: number;
  grounded: boolean;
  evidence?: string | null;
  source: FieldSource;
  note?: string | null;
}

export interface Flag {
  code: string;
  field: string;
  message: string;
}

export interface Ticket {
  id: string;
  subject: string;
  body: string;
  channel: Channel;
  received_at: string;
  from_email: string;
  attachments: number;
}

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

export interface TicketSnippet {
  subject: string;
  body: string;
  channel: Channel;
  received_at: string;
  from_email: string;
}

export interface JobResultItem {
  ticket_id: string;
  record_id: string;
  status: ItemStatus;
  attempts: number;
  record?: ExtractedRecord | null;
  draft?: Partial<ExtractedRecord> | null;
  field_meta: Record<string, FieldMeta>;
  flags: Flag[];
  edited_fields: string[];
  original_values: Record<string, unknown>;
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
