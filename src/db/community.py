"""
ScamSentinel MY — Community Knowledge Base & Mule Account Operations

Handles all Firestore read/write operations for:
- Community KB (anonymised HIGH-risk scam reports)
- Mule account index (known fraudulent account identifiers)

Privacy: No PII is ever stored in community_kb. Only threat
indicators and pattern metadata are written.
"""

import re
from datetime import datetime, timezone
from typing import Optional

from src.db.firestore import get_db


async def get_community_feed(
    limit: int = 20,
    threat_type: Optional[str] = None,
    region: Optional[str] = None,
) -> list[dict]:
    """
    Returns paginated community feed entries from /community_kb collection.
    Supports filtering by threat_type and region without page reload.

    This is the REST fallback — primary feed uses Firestore onSnapshot
    on the frontend (task 9.8 / 9.13).
    """
    db = get_db()
    query = db.collection("community_kb")

    # Apply optional filters
    if threat_type:
        query = query.where("threat_type", "==", threat_type)
    if region:
        query = query.where("region", "==", region)

    # Order by newest first, limit results
    query = query.order_by("timestamp", direction="DESCENDING").limit(limit)

    docs = query.stream()

    feed = []
    for doc in docs:
        data = doc.to_dict()
        feed.append({
            "id": doc.id,
            "threat_type": data.get("threat_type", "unknown"),
            "threat_indicators": data.get("threat_indicators", []),
            "risk_score": data.get("risk_score", 0),
            "tier": data.get("tier", "MEDIUM"),
            "region": data.get("region", "malaysia"),
            "cited_sources": data.get("cited_sources", []),
            "report_count": data.get("report_count", 1),
            "timestamp": data.get("timestamp", "").isoformat()
            if isinstance(data.get("timestamp"), datetime)
            else str(data.get("timestamp", "")),
        })

    return feed


async def check_mule_account(
    identifier: str,
    identifier_type: str,
) -> dict:
    """
    Checks a recipient identifier against the mule account index.
    Returns BLOCK or CLEAR verdict with confidence.

    Lookup chain (per PRD F5):
    1. Normalise identifier (strip spaces, standardise format)
    2. Exact match against Firestore /mule_accounts collection
    3. Return BLOCK (with source report) or CLEAR (with confidence %)
    """
    db = get_db()

    # Step 1 — Normalise identifier
    normalised = _normalise_identifier(identifier, identifier_type)

    # Step 2 — Exact match against mule_accounts collection
    mule_ref = db.collection("mule_accounts")
    query = mule_ref.where("identifier", "==", normalised).limit(1)
    matches = list(query.stream())

    if matches:
        # BLOCK — exact match found
        match_data = matches[0].to_dict()
        source_ids = match_data.get("source_report_ids", [])
        return {
            "verdict": "BLOCK",
            "confidence": 1.0,
            "matched_report_id": source_ids[0] if source_ids else matches[0].id,
            "explanation": (
                f"This {identifier_type.replace('_', ' ')} matches a known mule account "
                f"reported {match_data.get('report_count', 1)} time(s). "
                f"First flagged: {match_data.get('first_seen', 'unknown')}. "
                f"Do NOT proceed with this transfer."
            ),
        }

    # Step 3 — No match found → CLEAR
    return {
        "verdict": "CLEAR",
        "confidence": 0.7,  # Not 1.0 — absence from DB is not certainty
        "matched_report_id": None,
        "explanation": (
            f"This {identifier_type.replace('_', ' ')} is not found in the known "
            f"mule account database. This does not guarantee safety — exercise "
            f"caution with unfamiliar recipients."
        ),
    }


def _normalise_identifier(identifier: str, identifier_type: str) -> str:
    """
    Normalise an identifier for consistent matching.
    - Strips whitespace and dashes
    - Standardises phone numbers to +60 format
    - Lowercases e-wallet IDs
    """
    # Remove all whitespace and dashes
    cleaned = re.sub(r"[\s\-]", "", identifier.strip())

    if identifier_type == "phone_number":
        # Convert 01X... to +601X...
        if cleaned.startswith("0") and not cleaned.startswith("+"):
            cleaned = "+6" + cleaned
        # Ensure +60 prefix
        if not cleaned.startswith("+60"):
            cleaned = "+60" + cleaned.lstrip("+")

    elif identifier_type == "ewallet_id":
        cleaned = cleaned.lower()

    return cleaned
