from pathlib import Path
import pytest

from app.tickets import load_tickets

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "tickets.jsonl"


@pytest.fixture(autouse=True)
def load_all_tickets():
    load_tickets(DATA_PATH)
