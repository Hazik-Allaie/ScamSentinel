"""
ScamSentinel MY — Firestore Client Singleton

Provides a single shared Firestore client instance across the application.
Initialised once at app startup via lifespan handler in main.py.
"""

from google.cloud import firestore
from datetime import datetime, timezone
from typing import Optional

from src.models.verdict import ScanRequest, Verdict

# Module-level client — set by init_firestore()
_db: Optional[firestore.Client] = None


def init_firestore() -> None:
    """
    Initialise the Firestore client singleton.
    Called once at app startup in main.py lifespan handler.
    Uses Application Default Credentials (ADC) on Cloud Run,
    or GOOGLE_APPLICATION_CREDENTIALS locally.
    """
    global _db
    _db = firestore.Client()


def get_db() -> firestore.Client:
    """
    Returns the shared Firestore client instance.
    Raises RuntimeError if called before init_firestore().
    """
    if _db is None:
        raise RuntimeError(
            "Firestore client not initialised. "
            "Call init_firestore() in the app lifespan handler first."
        )
    return _db


async def write_scan_log(
    scan_id: str,
    request: ScanRequest,
    verdict: Verdict,
) -> None:
    """
    Writes a complete scan audit log to Firestore /scans/{scanId}.
    Stores the full reasoning trace for auditability (judging criteria).

    Schema matches TECHSTACK_ScamSentinel_MY.md §6 Firestore design.
    """
    db = get_db()
    scan_ref = db.collection("scans").document(scan_id)

    doc = {
        "input_type": request.input_type,
        "raw_content": request.raw_content[:500],  # Truncate for storage safety
        "extracted_entities": request.extracted_entities,
        "verdict": {
            "tier": verdict.tier.value,
            "risk_score": verdict.risk_score,
            "threat_type": verdict.threat_type.value,
            "explanation": verdict.explanation,
            "confidence": verdict.confidence,
            "cited_sources": verdict.cited_sources,
            "reasoning_trace": verdict.reasoning_trace,
            "model_used": verdict.model_used,
            "processing_ms": verdict.processing_ms,
        },
        "user_id": request.user_id,
        "created_at": datetime.now(timezone.utc),
    }

    scan_ref.set(doc)
