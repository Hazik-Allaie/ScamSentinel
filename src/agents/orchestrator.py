"""
ScamSentinel MY — Orchestrator (Vertex AI Agent Builder)

Main entry point for the scan pipeline. Dispatches RAG retrieval and
risk scoring in parallel, then triggers the response flow.

The Orchestrator coordinates — it does NOT reason about threats itself.
All reasoning is delegated to the Risk Scoring Agent.

Reference: AGENTS_ScamSentinel_MY.md §3
"""

import asyncio
import time
import uuid
from typing import Any

from src.models.verdict import ScanRequest, ScanResponse, Verdict
from src.agents.scam_intel import retrieve_scam_patterns
from src.agents.risk_scoring import score_risk
from src.agents.response import execute_response_flow
from src.agents.fallbacks import vertex_search_unavailable_fallback
from src.db.firestore import write_scan_log
from src.config import settings


async def run_orchestrator(request: ScanRequest) -> ScanResponse:
    """
    Main entry point for the scan pipeline.
    Dispatches RAG retrieval and risk scoring in parallel,
    then triggers the response flow.
    """
    start_ms = int(time.time() * 1000)
    scan_id = str(uuid.uuid4())

    # Derive semantic query from normalised payload
    query = _build_rag_query(request)

    # Retrieval and Scoring
    # We now wait for RAG first to ensure the model can cite sources in the reasoning_trace
    try:
        rag_passages = await _safe_retrieve(query=query, top_k=5)
        raw_verdict = await score_risk(payload=request, rag_context=rag_passages)
    except Exception as e:
        # If retrieval fails, let the error propagate or fallback
        raise


    # Add processing time
    raw_verdict.processing_ms = int(time.time() * 1000) - start_ms
    raw_verdict.model_used = raw_verdict.model_used or "gemini-2.5-flash"

    # Write audit log to Firestore before triggering response
    try:
        await write_scan_log(scan_id=scan_id, request=request, verdict=raw_verdict)
    except Exception as e:
        print(f"[WARN] Firestore write_scan_log failed (continuing without): {e}")

    # Execute response flow
    response_result = {"community_pushed": False, "pdrm_report": None}
    try:
        response_result = await execute_response_flow(
            verdict=raw_verdict,
            scan_id=scan_id,
            user_id=request.user_id
        )
    except Exception as e:
        print(f"[WARN] Response flow failed (continuing without): {e}")

    return ScanResponse(
        scan_id=scan_id,
        verdict=raw_verdict,
        pdrm_report_template=response_result.get("pdrm_report"),
        community_pushed=response_result.get("community_pushed", False)
    )


async def _safe_retrieve(query: str, top_k: int) -> list:
    """
    Wraps RAG retrieval with graceful fallback.
    If Vertex AI Search is unavailable, returns empty list
    so the pipeline continues with model-only reasoning.
    """
    try:
        return await asyncio.wait_for(
            retrieve_scam_patterns(query=query, top_k=top_k),
            timeout=settings.VERTEX_SEARCH_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        return vertex_search_unavailable_fallback()
    except Exception:
        return vertex_search_unavailable_fallback()


def _build_rag_query(request: ScanRequest) -> str:
    """
    Converts normalised scan payload into a semantic search query
    optimised for the PDRM/BNM/MCMC corpus.
    """
    base = request.raw_content[:500]  # Truncate to 500 chars

    # Enrich query with extracted entities
    entities = request.extracted_entities
    enrichments = []

    if entities.get("phone_numbers"):
        enrichments.append(f"phone {' '.join(entities['phone_numbers'][:2])}")
    if entities.get("urls"):
        enrichments.append(f"website {' '.join(entities['urls'][:2])}")
    if entities.get("account_numbers"):
        enrichments.append(f"account {' '.join(entities['account_numbers'][:2])}")
    if entities.get("keywords"):
        enrichments.append(' '.join(entities['keywords'][:5]))

    query = f"{base} {' '.join(enrichments)}".strip()
    return query[:1000]  # Vertex AI Search query max length
