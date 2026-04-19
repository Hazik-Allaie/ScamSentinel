"""
ScamSentinel MY — Application Configuration

Loads settings from environment variables (injected by Secret Manager
on Cloud Run, or from .env locally). All secrets are cached in memory
at import time — never re-fetched per request.
"""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # ── Google Cloud ─────────────────────────────────────────
    GCP_PROJECT: str = os.getenv("GCP_PROJECT", "scamsentinel-my")
    REGION: str = os.getenv("REGION", "asia-southeast1")

    # ── Gemini API ───────────────────────────────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # ── Firebase ─────────────────────────────────────────────
    FIREBASE_SA_PATH: str = os.getenv("FIREBASE_SA_PATH", "")

    # ── Vertex AI Search ─────────────────────────────────────
    VERTEX_SEARCH_DATASTORE_ID: str = os.getenv("VERTEX_SEARCH_DATASTORE_ID", "")

    # ── Frontend CORS ────────────────────────────────────────
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # ── Retry & Timeout Configuration ────────────────────────
    GEMINI_MAX_RETRIES: int = 3
    GEMINI_RETRY_DELAY_SECONDS: float = 1.0
    VERTEX_SEARCH_TIMEOUT_SECONDS: int = 5
    AGENT_PIPELINE_TIMEOUT_SECONDS: int = 10  # Hard ceiling for full scan latency

    # ── Risk Tier Thresholds ─────────────────────────────────
    # These MUST match the frontend VerdictCard thresholds
    HIGH_THRESHOLD: int = int(os.getenv("HIGH_THRESHOLD", "75"))
    MEDIUM_THRESHOLD: int = int(os.getenv("MEDIUM_THRESHOLD", "40"))


# Singleton settings instance — cached at import time
settings = Settings()
