"""Pydantic models for tickets, extracted records, and API payloads."""

from datetime import date, datetime
from math import isfinite
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

Channel = Literal["email", "web_form", "chat", "phone_transcript"]

Product = Literal[
    "Zen Orchestrator",
    "Zen Studio",
    "Zen Connect",
    "Zen Insights",
    "Zen Vault",
]
Category = Literal[
    "outage",
    "billing",
    "bug",
    "feature_request",
    "how_to",
    "churn_risk",
]
Severity = Literal["low", "medium", "high", "critical"]
RequestedAction = Literal["refund", "credit", "fix", "callback", "information", "none"]
FieldSource = Literal["model", "human"]
JobStatus = Literal["queued", "running", "done", "cancelled"]
ItemStatus = Literal[
    "queued",
    "running",
    "done",
    "needs_review",
    "failed",
    "cancelled",
]


class ExtractedRecord(BaseModel):
    """Structured fields extracted from a support ticket."""

    model_config = ConfigDict(extra="forbid")

    company: str
    product: Optional[Product] = None
    category: Category
    severity: Optional[Severity] = None
    requested_action: RequestedAction
    refund_amount: Optional[float] = Field(default=None, ge=0)
    deadline: Optional[date] = None
    escalated: bool

    @field_validator("company")
    @classmethod
    def company_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("company must be non-empty after strip")
        return stripped

    @field_validator("refund_amount")
    @classmethod
    def refund_amount_finite(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return None
        if not isfinite(v):
            raise ValueError("refund_amount must be a finite number")
        return v


class FieldMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confidence: float = Field(ge=0, le=1)
    grounded: bool
    evidence: Optional[str] = None
    source: FieldSource = "model"
    note: Optional[str] = None


class Flag(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    field: str
    message: str


class Ticket(BaseModel):
    """Raw ticket as stored in tickets.jsonl."""

    model_config = ConfigDict(extra="forbid")

    id: str
    subject: str
    body: str
    channel: Channel
    received_at: datetime
    from_email: str
    attachments: int


class TicketSummary(BaseModel):
    id: str
    subject: str
    channel: Channel
    received_at: datetime
    from_email: str
    attachments: int
    body_preview: str


class TicketListResponse(BaseModel):
    items: list[TicketSummary]
    total: int
    limit: int
    offset: int


class CreateJobRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticket_ids: list[str]


class CreateJobResponse(BaseModel):
    job_id: str
    status: JobStatus
    total: int


class JobProgress(BaseModel):
    total: int
    queued: int
    running: int
    done: int
    needs_review: int
    failed: int
    cancelled: int
    finished: int
    percent: float


class JobItemSummary(BaseModel):
    ticket_id: str
    record_id: str
    status: ItemStatus
    attempts: int
    flags_count: int
    error: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    status: JobStatus
    created_at: datetime
    finished_at: Optional[datetime] = None
    progress: JobProgress
    items: list[JobItemSummary]


class TicketSnippet(BaseModel):
    subject: str
    body: str
    channel: Channel
    received_at: datetime
    from_email: str


class JobResultItem(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "ticket_id": "tkt_0001",
                "record_id": "rec_0001",
                "status": "done",
                "attempts": 1,
                "record": {
                    "company": "Acme Corp",
                    "product": "Zen Orchestrator",
                    "category": "bug",
                    "severity": "high",
                    "requested_action": "fix",
                    "refund_amount": None,
                    "deadline": "2026-10-15",
                    "escalated": False,
                },
                "draft": None,
                "field_meta": {
                    "severity": {
                        "confidence": 0.95,
                        "grounded": True,
                        "evidence": "Critical outage affecting all users",
                        "source": "model",
                        "note": None,
                    }
                },
                "flags": [],
                "edited_fields": [],
                "original_values": {},
                "resolved": False,
                "raw_outputs": [],
                "validation_errors": [],
                "error": None,
                "ticket": {
                    "subject": "System down",
                    "body": "Critical outage affecting all users",
                    "channel": "email",
                    "received_at": "2026-10-07T12:00:00Z",
                    "from_email": "admin@acme.com",
                },
            }
        }
    )

    ticket_id: str
    record_id: str
    status: ItemStatus
    attempts: int
    record: Optional[ExtractedRecord] = None
    draft: Optional[dict[str, Any]] = None
    field_meta: dict[str, FieldMeta] = Field(
        default_factory=dict,
        description="Metadata keyed by extracted field name (e.g. company, severity).",
    )
    flags: list[Flag] = Field(default_factory=list)
    edited_fields: list[str] = Field(default_factory=list)
    original_values: dict[str, Any] = Field(
        default_factory=dict,
        description="Original model-extracted values before human edits, keyed by field name.",
    )
    resolved: bool = False
    raw_outputs: list[str] = Field(default_factory=list)
    validation_errors: list[str] = Field(default_factory=list)
    error: Optional[str] = None
    ticket: TicketSnippet


class JobResultsResponse(BaseModel):
    job_id: str
    status: JobStatus
    items: list[JobResultItem]


class PatchRecordRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "fields": {
                    "severity": "high",
                    "refund_amount": 150.00,
                }
            }
        },
    )
    fields: dict[str, Any] = Field(
        description="Dictionary of field names and new values to update (e.g. {'severity': 'high'})."
    )


class RerunRecordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: Optional[str] = None
    model: Optional[str] = None
    overwrite_edited: bool = False
    preview_only: bool = False


class FieldDiff(BaseModel):
    old_value: Any = None
    new_value: Any = None
    is_edited: bool
    will_replace: bool


class RerunRecordResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "item": {
                    "ticket_id": "tkt_0001",
                    "record_id": "rec_0001",
                    "status": "done",
                    "attempts": 1,
                    "record": None,
                    "draft": None,
                    "field_meta": {},
                    "flags": [],
                    "edited_fields": ["severity"],
                    "original_values": {"severity": "medium"},
                    "resolved": False,
                    "raw_outputs": [],
                    "validation_errors": [],
                    "error": None,
                    "ticket": {
                        "subject": "System down",
                        "body": "Critical outage affecting all users",
                        "channel": "email",
                        "received_at": "2026-10-07T12:00:00Z",
                        "from_email": "admin@acme.com",
                    },
                },
                "diff": {
                    "severity": {
                        "old_value": "medium",
                        "new_value": "high",
                        "is_edited": True,
                        "will_replace": False,
                    }
                },
                "preview": True,
            }
        }
    )

    item: JobResultItem
    diff: dict[str, FieldDiff] = Field(
        description="Field-by-field diff comparison keyed by field name."
    )
    preview: bool

