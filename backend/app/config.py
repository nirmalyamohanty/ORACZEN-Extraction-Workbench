"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROVIDER: str = "mock"
    MAX_CONCURRENCY: int = 4
    MOCK_DELAY_MIN_MS: int = 300
    MOCK_DELAY_MAX_MS: int = 1200
    MOCK_FAIL_ONCE_IDS: str = "tkt_0017,tkt_0063"
    MOCK_FAIL_TWICE_IDS: str = "tkt_0042,tkt_0121"
    TICKETS_PATH: str = "data/tickets.jsonl"
    FRONTEND_ORIGINS: str = "http://localhost:3000"
    PROVIDER_API_KEY: str = ""
    PROVIDER_MODEL: str = ""

    def frontend_origin_list(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]

    def mock_fail_once_id_set(self) -> set[str]:
        return {x.strip() for x in self.MOCK_FAIL_ONCE_IDS.split(",") if x.strip()}

    def mock_fail_twice_id_set(self) -> set[str]:
        return {x.strip() for x in self.MOCK_FAIL_TWICE_IDS.split(",") if x.strip()}


settings = Settings()
