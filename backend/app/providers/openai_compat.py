"""OpenAI-compatible HTTP provider stub (optional; not used when PROVIDER=mock)."""

from __future__ import annotations

import json

import httpx

from app.config import settings
from app.preprocess import prepare
from app.schemas import ExtractedRecord, Ticket

SCHEMA_HINT = json.dumps(ExtractedRecord.model_json_schema(), indent=2)


class OpenAICompatibleProvider:
    name = "openai_compatible"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str = "https://api.openai.com/v1",
    ) -> None:
        self._api_key = api_key if api_key is not None else settings.PROVIDER_API_KEY
        self._model = model if model is not None else settings.PROVIDER_MODEL or "gpt-4o-mini"
        self._base_url = base_url.rstrip("/")

    def _build_prompt(
        self,
        ticket: Ticket,
        *,
        attempt: int,
        previous_output: str | None,
        validation_error: str | None,
    ) -> str:
        prepared = prepare(ticket)
        parts = [
            "Extract a JSON object matching this schema:",
            SCHEMA_HINT,
            "",
            f"Ticket id: {ticket.id}",
            f"Received at: {ticket.received_at.isoformat()}",
            f"From: {ticket.from_email}",
            f"Subject (weak hint): {ticket.subject}",
            "",
            "Customer text (quoted replies already removed):",
            prepared.customer_text,
        ]
        if attempt > 1 and previous_output:
            parts.extend(
                [
                    "",
                    f"Previous invalid output (attempt {attempt - 1}):",
                    previous_output,
                ]
            )
        if validation_error:
            parts.extend(["", "Validation errors to fix:", validation_error])
        return "\n".join(parts)

    async def extract(
        self,
        ticket: Ticket,
        *,
        attempt: int,
        previous_output: str | None = None,
        validation_error: str | None = None,
    ) -> str:
        if not self._api_key:
            raise RuntimeError("PROVIDER_API_KEY is required for the real provider")

        prompt = self._build_prompt(
            ticket,
            attempt=attempt,
            previous_output=previous_output,
            validation_error=validation_error,
        )
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": "Return only valid JSON for the schema."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self._base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return content.strip()
