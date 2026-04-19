"""
ScamSentinel MY — Error Handling & Fallbacks

Graceful degradation handlers for when external services are unavailable.
These ensure the user always gets a response, even if degraded.

Reference: AGENTS_ScamSentinel_MY.md §9
"""

from datetime import datetime, timezone
from src.models.verdict import Verdict, RiskTier, ThreatType


def gemini_rate_limit_fallback(error: Exception) -> Verdict:
    """
    Returns a safe MEDIUM verdict when Gemini hits 429 rate limit.
    Frontend will show: "Unable to complete full analysis — treat with caution."
    """
    return Verdict(
        threat_type=ThreatType.UNKNOWN,
        risk_score=50,
        tier=RiskTier.MEDIUM,
        explanation=(
            "ScamSentinel could not complete a full analysis at this time. "
            "Treat this communication with caution and do not share personal "
            "or financial information until you can verify the sender."
        ),
        confidence=0.0,
        cited_sources=[],
        reasoning_trace=f"Rate limit fallback triggered: {str(error)}",
        rag_passages_used=[],
        model_used="fallback",
        processing_ms=0,
    )


def vertex_search_unavailable_fallback() -> list:
    """Returns empty passage list when Vertex AI Search is unavailable."""
    return []


def community_push_failure_handler(error: Exception, scan_id: str) -> None:
    """
    Logs community push failures to Firestore for retry.
    Does not raise — response flow continues even if community push fails.
    """
    from src.db.firestore import get_db

    db = get_db()
    db.collection("failed_community_pushes").add({
        "scan_id": scan_id,
        "error": str(error),
        "created_at": datetime.now(timezone.utc),
        "retry_count": 0,
    })
