"""Instantiate the configured extraction provider."""

from __future__ import annotations

from app.config import settings
from app.providers.base import Provider
from app.providers.mock import MockProvider
from app.providers.openai_compat import OpenAICompatibleProvider

_REAL_PROVIDER_ALIASES = frozenset({"openai", "groq", "gemini"})


def get_provider() -> Provider:
    name = settings.PROVIDER.lower().strip()
    if name == "mock":
        return MockProvider()
    if name in _REAL_PROVIDER_ALIASES:
        base_urls = {
            "openai": "https://api.openai.com/v1",
            "groq": "https://api.groq.com/openai/v1",
            "gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
        }
        return OpenAICompatibleProvider(base_url=base_urls[name])
    raise ValueError(f"Unknown PROVIDER: {settings.PROVIDER!r}")
