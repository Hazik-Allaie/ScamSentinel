"""
ScamSentinel MY — Shared Pydantic Schemas

These schemas are shared across all agents and must be imported from
this module. Every agent must produce and consume these exact fields.
Do not add or remove fields without updating all consuming agents.

Reference: AGENTS_ScamSentinel_MY.md §2 — Shared Schemas
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class ThreatType(str, Enum):
    """Classification of threat types detected by the Risk Scoring Agent."""
    PHISHING = "phishing"
    INVESTMENT_SCAM = "investment_scam"
    IMPERSONATION = "impersonation"
    MULE_ACCOUNT = "mule_account"
    ROMANCE_SCAM = "romance_scam"
    LOAN_SCAM = "loan_scam"
    ECOMMERCE_SCAM = "ecommerce_scam"
    UNKNOWN = "unknown"


class RiskTier(str, Enum):
    """
    Risk tier derived from risk_score.
    Thresholds (MUST match frontend VerdictCard):
        HIGH   = risk_score >= 75
        MEDIUM = risk_score >= 40 and < 75
        LOW    = risk_score < 40
    """
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RAGPassage(BaseModel):
    """A single passage retrieved from the Vertex AI Search scam corpus."""
    document_id: str
    source: str                    # "pdrm" | "bnm" | "mcmc" | "community"
    passage_text: str
    relevance_score: float         # 0.0 - 1.0


class Verdict(BaseModel):
    """
    The core verdict object produced by the Risk Scoring Agent.
    Consumed by the Response Agent and returned to the frontend.
    """
    threat_type: ThreatType
    risk_score: int = Field(ge=0, le=100)
    tier: RiskTier
    explanation: str               # Plain English, max 3 sentences
    confidence: float = Field(ge=0.0, le=1.0)
    cited_sources: list[str]       # List of document_ids from RAG passages
    reasoning_trace: str           # Full chain-of-thought for audit log
    rag_passages_used: list[RAGPassage]
    model_used: str                # "gemini-2.5-flash" | "gemini-2.5-pro"
    processing_ms: int             # End-to-end latency in milliseconds


class ScanRequest(BaseModel):
    """Normalised input payload for the /api/v1/scan endpoint."""
    input_type: Literal["sms_text", "url", "qr_code", "voice_transcript", "payment_link"]
    raw_content: str
    extracted_entities: dict       # Phone numbers, URLs, account numbers found
    metadata: dict                 # Timestamps, user_agent, etc.
    user_id: str                   # Firebase anonymous UID


class ScanResponse(BaseModel):
    """Response returned by the /api/v1/scan endpoint after full pipeline."""
    scan_id: str                   # Firestore document ID
    verdict: Verdict
    pdrm_report_template: Optional[dict] = None   # Populated for HIGH tier only
    community_pushed: bool = False


class InterceptRequest(BaseModel):
    """Input payload for the /api/v1/intercept endpoint."""
    identifier: str                # Account number, phone, or e-wallet ID
    identifier_type: Literal["bank_account", "phone_number", "ewallet_id"]
    user_id: str


class InterceptVerdict(BaseModel):
    """Response returned by the /api/v1/intercept endpoint."""
    identifier: str
    identifier_type: str
    verdict: Literal["BLOCK", "CLEAR"]
    confidence: float
    matched_report_id: Optional[str] = None
    explanation: str
    processing_ms: int
