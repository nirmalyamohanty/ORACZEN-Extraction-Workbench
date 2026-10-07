"""Instantiate the configured extraction provider."""

from __future__ import annotations

from app.config import settings
from app.providers.base import Provider
from app.providers.mock import MockProvider
from app.providers.openai_compat import OpenAICompatibleProvider

_REAL_PROVIDER_ALIASES = frozenset({"openai", "groq", "gemini"})


def get_provider(name: str | None = None, model: str | None = None) -> Provider:
    provider_name = (name or settings.PROVIDER).lower().strip()
    if provider_name == "mock":
        return MockProvider()
    if provider_name in _REAL_PROVIDER_ALIASES:
        base_urls = {
            "openai": "https://api.openai.com/v1",
            "groq": "https://api.groq.com/openai/v1",
            "gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
        }
        return OpenAICompatibleProvider(
            base_url=base_urls[provider_name],
            model=model,
        )
    raise ValueError(f"Unknown PROVIDER: {provider_name!r}")
