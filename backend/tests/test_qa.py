from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.translation import Translation


# ── DB session fixture ─────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """Provide a direct DB session using the same test engine as conftest."""
    from tests.conftest import override_get_db
    async for session in override_get_db():
        yield session
        break


# ── Translation helper ─────────────────────────────────────────────────────────

async def _make_translation(
    db: AsyncSession,
    source_text: str,
    translated_text: str,
) -> str:
    """Insert a minimal completed translation directly and return its ID string."""
    t = Translation(
        source_text=source_text,
        translated_text=translated_text,
        source_lang="en",
        target_lang="es",
        status="completed",
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return str(t.id)


# ── QA Check Tests ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_qa_checks_number_mismatch(client, db):
    """Source has '100' and '50' but translated only has '100' — should flag 50."""
    tid = await _make_translation(
        db,
        source_text="The price is 100 dollars and quantity is 50 units.",
        translated_text="El precio es 100 dolares.",
    )

    resp = await client.post(f"/api/v1/qa/run/{tid}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["translation_id"] == tid

    number_errors = [c for c in body["checks"] if c["check_type"] == "numbers"]
    assert len(number_errors) >= 1
    assert any("50" in c["message"] for c in number_errors)


@pytest.mark.asyncio
async def test_run_qa_checks_length_ratio(client, db):
    """Translated text much shorter than source should trigger a length warning."""
    tid = await _make_translation(
        db,
        source_text="This is a very long sentence with many words that should produce a substantial translation output.",
        translated_text="Corto.",
    )

    resp = await client.post(f"/api/v1/qa/run/{tid}")
    assert resp.status_code == 200
    body = resp.json()

    length_warnings = [c for c in body["checks"] if c["check_type"] == "length"]
    assert len(length_warnings) >= 1


@pytest.mark.asyncio
async def test_run_qa_checks_formatting(client, db):
    """Source has bullet points but translated doesn't — should flag formatting."""
    tid = await _make_translation(
        db,
        source_text="Items:\n- Apple\n- Banana\n- Cherry",
        translated_text="Articulos Apple Banana Cherry",
    )

    resp = await client.post(f"/api/v1/qa/run/{tid}")
    assert resp.status_code == 200
    body = resp.json()

    fmt_warnings = [c for c in body["checks"] if c["check_type"] == "formatting"]
    assert len(fmt_warnings) >= 1


@pytest.mark.asyncio
async def test_resolve_check(client, db):
    """Resolve a QA check and verify is_resolved becomes True."""
    tid = await _make_translation(
        db,
        source_text="Price: 999 dollars.",
        translated_text="Precio: cien dolares.",
    )

    run_resp = await client.post(f"/api/v1/qa/run/{tid}")
    assert run_resp.status_code == 200
    checks = run_resp.json()["checks"]
    assert len(checks) >= 1

    check_id = checks[0]["id"]
    resolve_resp = await client.put(f"/api/v1/qa/checks/{check_id}/resolve")
    assert resolve_resp.status_code == 200
    resolved = resolve_resp.json()
    assert resolved["is_resolved"] is True
    assert resolved["resolved_at"] is not None


@pytest.mark.asyncio
async def test_get_qa_report(client, db):
    """Run checks then fetch the stored report via GET."""
    tid = await _make_translation(
        db,
        source_text="Value is 42.",
        translated_text="El valor es cuarenta.",
    )

    await client.post(f"/api/v1/qa/run/{tid}")

    report_resp = await client.get(f"/api/v1/qa/report/{tid}")
    assert report_resp.status_code == 200
    report = report_resp.json()
    assert report["translation_id"] == tid
    assert "checks" in report
    assert "error_count" in report
    assert "warning_count" in report
    assert "unresolved_count" in report


# ── Review Tests ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_review(client, db):
    """Create a review and verify it is stored with status pending."""
    tid = await _make_translation(db, "Hello world", "Hola mundo")

    resp = await client.post(
        "/api/v1/qa/reviews",
        json={"translation_id": tid, "reviewer_name": "Alice"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["reviewer_name"] == "Alice"
    assert body["status"] == "pending"
    assert body["translation_id"] == tid


@pytest.mark.asyncio
async def test_update_review_approve(client, db):
    """Approve a review and verify completed_at is set."""
    tid = await _make_translation(db, "Hello", "Hola")

    create_resp = await client.post(
        "/api/v1/qa/reviews",
        json={"translation_id": tid, "reviewer_name": "Bob"},
    )
    assert create_resp.status_code == 201
    review_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/api/v1/qa/reviews/{review_id}",
        json={"status": "approved", "score": 5},
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["status"] == "approved"
    assert updated["completed_at"] is not None
    assert updated["score"] == 5


@pytest.mark.asyncio
async def test_get_review_queue(client, db):
    """Pending and in_review reviews appear in the queue."""
    tid = await _make_translation(db, "Hello", "Hola")

    await client.post(
        "/api/v1/qa/reviews",
        json={"translation_id": tid, "reviewer_name": "Charlie"},
    )

    queue_resp = await client.get("/api/v1/qa/reviews/queue")
    assert queue_resp.status_code == 200
    queue = queue_resp.json()
    assert isinstance(queue, list)
    assert len(queue) >= 1
    assert any(r["reviewer_name"] == "Charlie" for r in queue)


@pytest.mark.asyncio
async def test_update_review_score_validation(client, db):
    """Score > 5 should return 422 Unprocessable Entity."""
    tid = await _make_translation(db, "Hello", "Hola")

    create_resp = await client.post(
        "/api/v1/qa/reviews",
        json={"translation_id": tid, "reviewer_name": "Dave"},
    )
    assert create_resp.status_code == 201
    review_id = create_resp.json()["id"]

    bad_resp = await client.put(
        f"/api/v1/qa/reviews/{review_id}",
        json={"score": 10},
    )
    assert bad_resp.status_code == 422
