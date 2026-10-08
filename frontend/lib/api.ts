import {
  CreateJobResponse,
  ExtractedRecord,
  JobResponse,
  JobResultItem,
  JobResultsResponse,
  RerunRecordResponse,
  Ticket,
  TicketListResponse,
} from "./types";

// custom error subclass so components can inspect error.status (like 404 or 422)
// and error.errors for specific field validation failures
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

// backend base URL: defaults to localhost:8000 for local dev if env variable isn't set
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// generic fetch wrapper so we don't repeat headers and error handling in every API call
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  // if response code is not 2xx, try to extract error details from backend JSON response
  if (!response.ok) {
    let errorDetail: Record<string, unknown> | null = null;
    let message = `API request failed with status ${response.status}`;
    let errors: Record<string, string> | undefined = undefined;

    try {
      errorDetail = (await response.json()) as Record<string, unknown>;
      if (errorDetail) {
        if (typeof errorDetail.detail === "string") {
          message = errorDetail.detail;
        } else if (errorDetail.errors && typeof errorDetail.errors === "object") {
          errors = errorDetail.errors as Record<string, string>;
          message = "Validation failed on fields";
        }
      }
    } catch {
      // response body was empty or not valid JSON (e.g. 502 bad gateway HTML)
    }

    throw new ApiError(message, response.status, errors);
  }

  return response.json() as Promise<T>;
}

// fetches list of tickets with optional search query, channel filter, and pagination
export async function listTickets(params?: {
  q?: string;
  channel?: string;
  limit?: number;
  offset?: number;
}): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.channel) query.set("channel", params.channel);
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());
  const queryString = query.toString() ? `?${query.toString()}` : "";
  return request<TicketListResponse>(`/api/tickets${queryString}`);
}

// fetches single ticket details (used when inspecting full email body)
export async function getTicket(ticketId: string): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${ticketId}`);
}

// starts a batch extraction job for the selected ticket IDs
export async function createJob(ticketIds: string[]): Promise<CreateJobResponse> {
  return request<CreateJobResponse>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ ticket_ids: ticketIds }),
  });
}

// gets overall status & progress counts for a job
export async function getJob(jobId: string, signal?: AbortSignal): Promise<JobResponse> {
  return request<JobResponse>(`/api/jobs/${jobId}`, { signal });
}

// gets individual extraction results for all tickets processed in this job
export async function getJobResults(
  jobId: string,
  status?: string,
  signal?: AbortSignal
): Promise<JobResultsResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<JobResultsResponse>(`/api/jobs/${jobId}/results${query}`, { signal });
}

// updates record fields edited by human reviewer and marks it resolved
export async function patchRecord(
  recordId: string,
  fields: Partial<ExtractedRecord>
): Promise<JobResultItem> {
  return request<JobResultItem>(`/api/records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

// sends cancel signal to abort remaining queued items in the job
export async function cancelJob(jobId: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/jobs/${jobId}/cancel`, {
    method: "POST",
  });
}

// re-runs extraction on a single record with optional provider/model override or diff preview
export async function rerunRecord(
  recordId: string,
  payload?: {
    provider?: string;
    model?: string;
    overwrite_edited?: boolean;
    preview_only?: boolean;
  }
): Promise<RerunRecordResponse> {
  return request<RerunRecordResponse>(`/api/records/${recordId}/rerun`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

// helper to construct the direct CSV download link
export function getExportCsvUrl(jobId: string): string {
  return `${API_BASE}/api/jobs/${jobId}/export.csv`;
}
