import math

import pytest
from pydantic import ValidationError

from app.schemas import ExtractedRecord


def test_extracted_record_rejects_extra_fields():
    with pytest.raises(ValidationError):
        ExtractedRecord.model_validate(
            {
                "company": "Acme",
                "category": "bug",
                "requested_action": "fix",
                "escalated": False,
                "unexpected": True,
            }
        )


def test_refund_amount_rejects_nan():
    with pytest.raises(ValidationError):
        ExtractedRecord.model_validate(
            {
                "company": "Acme",
                "category": "billing",
                "requested_action": "refund",
                "escalated": False,
                "refund_amount": math.nan,
            }
        )


def test_company_must_be_non_empty_after_strip():
    with pytest.raises(ValidationError):
        ExtractedRecord.model_validate(
            {
                "company": "   ",
                "category": "how_to",
                "requested_action": "information",
                "escalated": False,
            }
        )
