"""Instantiate the configured extraction provider."""

from __future__ import annotations

from app.providers.mock import MockProvider


def get_provider(name: str | None = None, model: str | None = None) -> MockProvider:  # noqa: ARG001
    """Always returns the mock provider. Real providers are future work."""
    return MockProvider()
