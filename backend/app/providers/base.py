"""Provider protocol interface."""

from typing import Protocol

from app.schemas import Ticket


class Provider(Protocol):
    name: str

    async def extract(
        self,
        ticket: Ticket,
        *,
        attempt: int,
        previous_output: str | None = None,
        validation_error: str | None = None,
    ) -> str: ...
