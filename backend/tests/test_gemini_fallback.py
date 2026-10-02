"""
Tests for retry / fallback behavior in generate_tailored_resume_json.
No network calls: the Gemini client is replaced with a scripted fake.

Run from backend/ with the venv active:  pytest tests/test_gemini_fallback.py
"""
import json
from types import SimpleNamespace

import pytest
from google.genai import errors

from app.services import resume_tailor as rt


GOOD = json.dumps(
    {
        "section_order": [],
        "sections": [],
        "skills_to_emphasize": [],
        "alternate_items": [],
    }
)


def make_error(cls, code, status, message="boom"):
    return cls(
        code,
        {"error": {"code": code, "status": status, "message": message}},
    )


def server_error():
    return make_error(errors.ServerError, 503, "UNAVAILABLE")


class FakeModels:
    def __init__(self, script):
        self.script = list(script)
        self.calls = []

    def generate_content(self, model, contents, config):
        mode = "structured" if "response_schema" in config else "plain_json"
        self.calls.append((model, mode))
        item = self.script.pop(0)

        if isinstance(item, Exception):
            raise item

        return SimpleNamespace(text=item)


@pytest.fixture
def fake(monkeypatch):
    monkeypatch.setattr(rt, "_sleep", lambda seconds: None)

    def install(script):
        models = FakeModels(script)
        monkeypatch.setattr(
            rt, "client", SimpleNamespace(models=models)
        )
        return models

    return install


def test_success_first_try(fake):
    models = fake([GOOD])
    assert rt.generate_tailored_resume_json("p") == GOOD
    assert models.calls == [("gemini-3.6-flash", "structured")]


def test_retries_transient_503_then_succeeds(fake):
    models = fake([server_error(), server_error(), GOOD])
    assert rt.generate_tailored_resume_json("p") == GOOD
    assert len(models.calls) == 3


def test_falls_back_to_plain_json_on_same_model(fake):
    models = fake([server_error()] * 3 + [GOOD])
    rt.generate_tailored_resume_json("p")
    assert models.calls[-1] == ("gemini-3.6-flash", "plain_json")


def test_falls_back_to_second_model(fake):
    models = fake([server_error()] * 6 + [GOOD])
    rt.generate_tailored_resume_json("p")
    assert models.calls[-1][0] == "gemini-3.8-flash"


def test_missing_model_skips_to_next_model(fake):
    models = fake(
        [make_error(errors.ClientError, 404, "NOT_FOUND"), GOOD]
    )
    rt.generate_tailored_resume_json("p")
    assert models.calls == [
        ("gemini-3.6-flash", "structured"),
        ("gemini-3.8-flash", "structured"),
    ]


def test_rejected_schema_falls_back_to_plain_json(fake):
    models = fake(
        [make_error(errors.ClientError, 400, "INVALID_ARGUMENT"), GOOD]
    )
    rt.generate_tailored_resume_json("p")
    assert models.calls[1] == ("gemini-3.6-flash", "plain_json")


def test_malformed_output_is_not_returned(fake):
    fake(["not json", GOOD])
    assert rt.generate_tailored_resume_json("p") == GOOD


def test_everything_failing_raises_friendly_error(fake):
    fake([server_error()] * 12)

    with pytest.raises(rt.ResumeTailoringUnavailableError) as info:
        rt.generate_tailored_resume_json("p")

    assert "busy" in str(info.value)


def test_quota_only_failures_report_quota(fake):
    fake([make_error(errors.ClientError, 429, "RESOURCE_EXHAUSTED")] * 2)

    with pytest.raises(rt.ResumeTailoringUnavailableError) as info:
        rt.generate_tailored_resume_json("p")

    assert "quota" in str(info.value)
