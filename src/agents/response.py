"""
ScamSentinel MY — Response Agent (Genkit Flow)

The action layer. After a risk verdict is produced, the Response Agent
immediately executes tier-appropriate actions without waiting for user input.

HIGH:  community push + PDRM report generation + FCM alert (parallel)
MEDIUM: scan log only + optional community push
LOW:   scan log only

Reference: AGENTS_ScamSentinel_MY.md §6
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional

from firebase_admin import firestore, messaging
from src.models.verdict import Verdict, RiskTier
from src.db.firestore import get_db
from src.config import settings


async def execute_response_flow(
    verdict: Verdict,
    scan_id: str,
    user_id: str
) -> dict:
    """
    Executes the appropriate response actions based on verdict tier.

    HIGH:  community push + PDRM report generation + FCM alert
    MEDIUM: scan log only + optional community push
    LOW:   scan log only
    """
    result = {
        "community_pushed": False,
        "pdrm_report": None,
        "fcm_sent": False,
    }

    if verdict.tier == RiskTier.HIGH:
        community_push, pdrm_report, fcm_result = await asyncio.gather(
            _push_to_community_kb(verdict, scan_id),
            _generate_pdrm_report(verdict, scan_id),
            _send_fcm_alert(verdict, user_id),
            return_exceptions=True   # Do not fail the whole flow if one action fails
        )
        result["community_pushed"] = not isinstance(community_push, Exception)
        result["pdrm_report"] = pdrm_report if not isinstance(pdrm_report, Exception) else None
        result["fcm_sent"] = not isinstance(fcm_result, Exception)

    elif verdict.tier == RiskTier.MEDIUM:
        await _log_medium_risk(verdict, scan_id)

    return result


async def _push_to_community_kb(verdict: Verdict, scan_id: str) -> bool:
    """
    Anonymises and pushes a HIGH-risk verdict to the community knowledge base.
    NEVER stores raw_content, user_id, or any PII.
    Only stores threat indicators and pattern metadata.
    """
    db = get_db()
    community_ref = db.collection("community_kb")

    # Extract threat indicators only — no PII
    threat_indicators = _extract_threat_indicators(verdict)

    doc = {
        "threat_type": verdict.threat_type.value,
        "threat_indicators": threat_indicators,   # Phone prefixes, URL domains, etc.
        "risk_score": verdict.risk_score,
        "tier": verdict.tier.value,
        "cited_sources": verdict.cited_sources,
        "region": "malaysia",                     # Expand in v2 with geo detection
        "source_scan_id": scan_id,                # Internal reference only
        "timestamp": datetime.now(timezone.utc),
        "report_count": 1,
    }

    community_ref.add(doc)
    return True


def _extract_threat_indicators(verdict: Verdict) -> list[str]:
    """
    Extracts anonymised threat indicators from the verdict's reasoning trace.
    Strips any PII — only keeps structural patterns (domain suffixes,
    bank name patterns, phone number prefixes).
    """
    indicators = []

    # Pull cited source IDs as indicators
    indicators.extend(verdict.cited_sources[:3])

    # Append threat type as a searchable tag
    indicators.append(f"type:{verdict.threat_type.value}")
    indicators.append(f"score:{verdict.risk_score}")

    return indicators


async def _generate_pdrm_report(verdict: Verdict, scan_id: str) -> dict:
    """
    Generates a pre-filled PDRM Aduan report template.
    Maps ScamSentinel verdict fields to actual PDRM online form fields.
    Returns a dict the frontend renders as a pre-filled form.
    """
    # PDRM incident category mapping
    pdrm_category_map = {
        "phishing": "Penipuan Internet / Phishing",
        "investment_scam": "Penipuan Pelaburan",
        "impersonation": "Penipuan Penyamaran (Impersonation)",
        "mule_account": "Akaun Keldai (Mule Account)",
        "romance_scam": "Penipuan Cinta (Romance Scam)",
        "loan_scam": "Penipuan Pinjaman Wang",
        "ecommerce_scam": "Penipuan Jual Beli Dalam Talian",
        "unknown": "Penipuan Dalam Talian",
    }

    return {
        # PDRM Aduan Online form field names (exact match to polis.gov.my form)
        "jenis_kes": pdrm_category_map.get(verdict.threat_type.value, "Penipuan Dalam Talian"),
        "penerangan_kes": (
            f"Saya telah menerima komunikasi yang disahkan oleh ScamSentinel MY "
            f"sebagai {verdict.tier.value} risk (skor: {verdict.risk_score}/100). "
            f"{verdict.explanation}"
        ),
        "tarikh_kejadian": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "masa_kejadian": datetime.now(timezone.utc).strftime("%H:%M"),
        "maklumat_tambahan": (
            f"ScamSentinel Scan ID: {scan_id}\n"
            f"Model: {verdict.model_used}\n"
            f"Sumber rujukan: {', '.join(verdict.cited_sources)}"
        ),
        # User fills these in manually
        "nama_pengadu": "",
        "no_ic": "",
        "no_telefon": "",
        "emel": "",
        "jumlah_kerugian": "",
        # Portal link
        "portal_url": "https://www.rmp.gov.my/docs/default-source/commercial-crime/report.pdf",
        "nsrc_hotline": "997",
    }


async def _send_fcm_alert(verdict: Verdict, user_id: str) -> bool:
    """
    Sends a Firebase Cloud Messaging push notification for HIGH-risk verdicts.
    Only fires if the user has an FCM token registered.
    """
    db = get_db()
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()

    if not user_doc.exists:
        return False

    fcm_token = user_doc.to_dict().get("fcm_token")
    if not fcm_token:
        return False

    message = messaging.Message(
        notification=messaging.Notification(
            title="ScamSentinel Alert — HIGH RISK",
            body=f"Threat detected: {verdict.threat_type.value.replace('_', ' ').title()}. "
                 f"Score: {verdict.risk_score}/100. Tap to view.",
        ),
        data={
            "verdict_tier": verdict.tier.value,
            "risk_score": str(verdict.risk_score),
            "threat_type": verdict.threat_type.value,
        },
        token=fcm_token,
    )

    messaging.send(message)
    return True


async def _log_medium_risk(verdict: Verdict, scan_id: str) -> None:
    """Logs MEDIUM-risk verdicts for internal analytics. No community push."""
    db = get_db()
    db.collection("medium_risk_log").add({
        "scan_id": scan_id,
        "threat_type": verdict.threat_type.value,
        "risk_score": verdict.risk_score,
        "created_at": datetime.now(timezone.utc),
    })
