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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

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
      // response was not JSON
    }

    throw new ApiError(message, response.status, errors);
  }

  return response.json() as Promise<T>;
}

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

export async function getTicket(ticketId: string): Promise<Ticket> {
  return request<Ticket>(`/api/tickets/${ticketId}`);
}

export async function createJob(ticketIds: string[]): Promise<CreateJobResponse> {
  return request<CreateJobResponse>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ ticket_ids: ticketIds }),
  });
}

export async function getJob(jobId: string, signal?: AbortSignal): Promise<JobResponse> {
  return request<JobResponse>(`/api/jobs/${jobId}`, { signal });
}

export async function getJobResults(
  jobId: string,
  status?: string,
  signal?: AbortSignal
): Promise<JobResultsResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<JobResultsResponse>(`/api/jobs/${jobId}/results${query}`, { signal });
}

export async function patchRecord(
  recordId: string,
  fields: Partial<ExtractedRecord>
): Promise<JobResultItem> {
  return request<JobResultItem>(`/api/records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

export async function cancelJob(jobId: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/jobs/${jobId}/cancel`, {
    method: "POST",
  });
}

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

export function getExportCsvUrl(jobId: string): string {
  return `${API_BASE}/api/jobs/${jobId}/export.csv`;
}
