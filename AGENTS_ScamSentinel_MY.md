# Agent Layer Specification
## ScamSentinel MY — AGENTS.md

**Version:** 1.0  
**Date:** April 2026  
**Purpose:** Complete agent layer specification for Antigravity IDE scaffolding.  
**Read alongside:** PRD_ScamSentinel_MY.md · TECHSTACK_ScamSentinel_MY.md  

> This file is the authoritative specification for every AI agent, prompt, tool, flow,
> and schema in ScamSentinel MY. Antigravity must implement these exactly as written.
> Do not deviate from prompt templates, schema field names, tier thresholds, or flow order.

---

## Table of Contents

1. [Agent Overview](#1-agent-overview)
2. [Shared Schemas](#2-shared-schemas)
3. [Orchestrator — Vertex AI Agent Builder](#3-orchestrator--vertex-ai-agent-builder)
4. [Scam Intel Agent — RAG Retrieval](#4-scam-intel-agent--rag-retrieval)
5. [Risk Scoring Agent — Gemini Chain-of-Thought](#5-risk-scoring-agent--gemini-chain-of-thought)
6. [Response Agent — Genkit Flow](#6-response-agent--genkit-flow)
7. [Voice Agent — Gemini Live WebSocket](#7-voice-agent--gemini-live-websocket)
8. [Tool Definitions](#8-tool-definitions)
9. [Error Handling & Fallbacks](#9-error-handling--fallbacks)
10. [Prompt Engineering Rules](#10-prompt-engineering-rules)
11. [Agent Wiring — Full Code](#11-agent-wiring--full-code)

---

## 1. Agent Overview

ScamSentinel uses a four-agent architecture coordinated by an Orchestrator. All agents are
stateless per request. Session context is stored in Vertex AI Agent Engine memory.

```
Incoming scan payload (normalised)
         │
         ▼
┌─────────────────────────────────────┐
│         ORCHESTRATOR                │
│   (Vertex AI Agent Builder)         │
│   Dispatches tools in parallel      │
└────────┬──────────┬─────────────────┘
         │          │
   ┌─────▼──┐  ┌────▼──────────┐
   │ Scam   │  │ Risk Scoring  │
   │ Intel  │  │ Agent         │
   │ Agent  │  │ (Gemini 2.5)  │
   │ (RAG)  │  └────┬──────────┘
   └─────┬──┘       │
         │          │ verdict
         └────┬─────┘
              │ rag_context + verdict
              ▼
     ┌────────────────┐
     │ Response Agent │
     │ (Genkit Flow)  │
     └────────────────┘
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
Firestore   FCM Alert  PDRM Report
Community   (HIGH only) Generator
KB Push
```

### Agent responsibilities

| Agent | Model | Role | Triggers |
|-------|-------|------|---------|
| Orchestrator | Gemini 2.5 Flash | Dispatch + coordinate | Every `/scan` request |
| Scam Intel Agent | Vertex AI Search | RAG retrieval from corpus | Parallel with Risk Scoring |
| Risk Scoring Agent | Gemini 2.5 Flash (Pro fallback) | Verdict generation | Parallel with Scam Intel |
| Response Agent | Genkit flow (no model) | Action execution | After verdict produced |
| Voice Agent | Gemini 2.5 Flash Live | Real-time audio transcription | `/ws/voice` WebSocket only |

---

## 2. Shared Schemas

These Pydantic schemas are shared across all agents and must be imported from
`src/models/verdict.py`. Every agent must produce and consume these exact fields.
Do not add or remove fields without updating all consuming agents.

```python
# src/models/verdict.py

from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class ThreatType(str, Enum):
    PHISHING = "phishing"
    INVESTMENT_SCAM = "investment_scam"
    IMPERSONATION = "impersonation"
    MULE_ACCOUNT = "mule_account"
    ROMANCE_SCAM = "romance_scam"
    LOAN_SCAM = "loan_scam"
    ECOMMERCE_SCAM = "ecommerce_scam"
    UNKNOWN = "unknown"


class RiskTier(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RAGPassage(BaseModel):
    document_id: str
    source: str                    # "pdrm" | "bnm" | "mcmc" | "community"
    passage_text: str
    relevance_score: float         # 0.0 - 1.0


class Verdict(BaseModel):
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
    input_type: Literal["sms_text", "url", "qr_code", "voice_transcript", "payment_link"]
    raw_content: str
    extracted_entities: dict       # Phone numbers, URLs, account numbers found
    metadata: dict                 # Timestamps, user_agent, etc.
    user_id: str                   # Firebase anonymous UID


class ScanResponse(BaseModel):
    scan_id: str                   # Firestore document ID
    verdict: Verdict
    pdrm_report_template: Optional[dict] = None   # Populated for HIGH tier only
    community_pushed: bool = False


class InterceptRequest(BaseModel):
    identifier: str                # Account number, phone, or e-wallet ID
    identifier_type: Literal["bank_account", "phone_number", "ewallet_id"]
    user_id: str


class InterceptVerdict(BaseModel):
    identifier: str
    identifier_type: str
    verdict: Literal["BLOCK", "CLEAR"]
    confidence: float
    matched_report_id: Optional[str] = None
    explanation: str
    processing_ms: int
```

---

## 3. Orchestrator — Vertex AI Agent Builder

### Agent configuration file: `src/agents/orchestrator_config.yaml`

```yaml
display_name: ScamSentinel Orchestrator
description: >
  Coordinates parallel dispatch of RAG retrieval and risk scoring for
  each incoming threat scan. Aggregates results and passes the combined
  rag_context + verdict to the response flow.
model: gemini-2.5-flash-001
region: asia-southeast1

instructions: |
  You are the ScamSentinel Orchestrator for Malaysia's financial fraud
  detection platform. Your job is coordination, not reasoning.

  On receiving a scan_payload, you must:
  1. Call retrieve_scam_patterns(payload) and score_risk(payload)
     IN PARALLEL using asyncio.gather — never call them sequentially.
  2. Wait for both to complete.
  3. Call execute_response(verdict, rag_context) with the combined results.
  4. Return the final ScanResponse to the caller.

  You must never:
  - Attempt to reason about the threat yourself
  - Skip the RAG retrieval step
  - Call execute_response before both parallel calls complete
  - Modify the verdict produced by score_risk

tools:
  - name: retrieve_scam_patterns
    description: Retrieves relevant scam pattern passages from the Malaysian RAG corpus
    input_schema:
      type: object
      properties:
        query:
          type: string
          description: Semantic search query derived from the scan payload
        top_k:
          type: integer
          default: 5
      required: [query]

  - name: score_risk
    description: Runs Gemini chain-of-thought risk scoring on the normalised payload
    input_schema:
      type: object
      properties:
        payload:
          type: object
          description: Normalised ScanRequest payload
        rag_context:
          type: array
          description: List of RAGPassage objects from retrieve_scam_patterns
      required: [payload, rag_context]

  - name: execute_response
    description: Executes the Genkit response flow for the produced verdict
    input_schema:
      type: object
      properties:
        verdict:
          type: object
          description: Verdict object from score_risk
        scan_id:
          type: string
      required: [verdict, scan_id]

memory:
  enabled: true
  session_ttl_seconds: 3600

safety_settings:
  - category: HARM_CATEGORY_HARASSMENT
    threshold: BLOCK_LOW_AND_ABOVE
  - category: HARM_CATEGORY_HATE_SPEECH
    threshold: BLOCK_LOW_AND_ABOVE
  - category: HARM_CATEGORY_DANGEROUS_CONTENT
    threshold: BLOCK_MEDIUM_AND_ABOVE
```

### Orchestrator Python client: `src/agents/orchestrator.py`

```python
import asyncio
import time
import uuid
from typing import Any

import vertexai
from vertexai.preview import reasoning_engines

from src.models.verdict import ScanRequest, ScanResponse, Verdict
from src.agents.scam_intel import retrieve_scam_patterns
from src.agents.risk_scoring import score_risk
from src.agents.response import execute_response_flow
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

    # Parallel dispatch — core agentic behaviour
    rag_passages, raw_verdict = await asyncio.gather(
        retrieve_scam_patterns(query=query, top_k=5),
        score_risk(payload=request, rag_context=[])  # Initial pass without RAG
    )

    # Re-score with full RAG context if initial confidence < 0.6
    if raw_verdict.confidence < 0.6 and rag_passages:
        raw_verdict = await score_risk(
            payload=request,
            rag_context=rag_passages
        )

    # Add processing time
    raw_verdict.processing_ms = int(time.time() * 1000) - start_ms
    raw_verdict.model_used = "gemini-2.5-flash"

    # Write audit log to Firestore before triggering response
    await write_scan_log(scan_id=scan_id, request=request, verdict=raw_verdict)

    # Execute response flow
    response_result = await execute_response_flow(
        verdict=raw_verdict,
        scan_id=scan_id,
        user_id=request.user_id
    )

    return ScanResponse(
        scan_id=scan_id,
        verdict=raw_verdict,
        pdrm_report_template=response_result.get("pdrm_report"),
        community_pushed=response_result.get("community_pushed", False)
    )


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
```

---

## 4. Scam Intel Agent — RAG Retrieval

### File: `src/agents/scam_intel.py`

```python
import os
from google.cloud import discoveryengine_v1 as discoveryengine
from src.models.verdict import RAGPassage
from src.config import settings


async def retrieve_scam_patterns(query: str, top_k: int = 5) -> list[RAGPassage]:
    """
    Queries the Vertex AI Search data store with a semantic query.
    Returns top_k passage objects with source attribution.

    Data store contains: PDRM reports, BNM advisories, MCMC bulletins,
    community-confirmed scam reports (anonymised).
    """
    client = discoveryengine.SearchServiceClient()

    serving_config = (
        f"projects/{settings.GCP_PROJECT}/locations/global"
        f"/collections/default_collection"
        f"/dataStores/{settings.VERTEX_SEARCH_DATASTORE_ID}"
        f"/servingConfigs/default_serving_config"
    )

    request = discoveryengine.SearchRequest(
        serving_config=serving_config,
        query=query,
        page_size=top_k,
        content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
            snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
                return_snippet=True,
                max_snippet_count=3,
            ),
            extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
                max_extractive_answer_count=1,
                max_extractive_segment_count=3,
            ),
        ),
    )

    response = client.search(request)
    passages = []

    for result in response.results:
        doc = result.document
        doc_data = dict(doc.struct_data)

        # Extract source type from document metadata
        source = doc_data.get("source", "unknown")
        if "pdrm" in doc.name.lower():
            source = "pdrm"
        elif "bnm" in doc.name.lower():
            source = "bnm"
        elif "mcmc" in doc.name.lower():
            source = "mcmc"
        elif "community" in doc.name.lower():
            source = "community"

        # Get passage text from extractive segments or snippets
        passage_text = ""
        if result.document.derived_struct_data:
            derived = dict(result.document.derived_struct_data)
            segments = derived.get("extractive_segments", [])
            if segments:
                passage_text = segments[0].get("content", "")
            if not passage_text:
                snippets = derived.get("snippets", [])
                if snippets:
                    passage_text = snippets[0].get("snippet", "")

        if passage_text:
            passages.append(RAGPassage(
                document_id=doc.id,
                source=source,
                passage_text=passage_text[:1000],  # Truncate for prompt safety
                relevance_score=result.relevance_score or 0.5,
            ))

    return passages


def format_rag_context(passages: list[RAGPassage]) -> str:
    """
    Formats RAG passages into a structured string for the Gemini system prompt.
    Each passage is labelled with its source authority.
    """
    if not passages:
        return "No matching patterns found in the Malaysian scam intelligence corpus."

    formatted = ["=== Malaysian Scam Intelligence Context ===\n"]
    source_labels = {
        "pdrm": "PDRM Commercial Crime Division",
        "bnm": "Bank Negara Malaysia",
        "mcmc": "MCMC Scam Alert",
        "community": "Community Confirmed Report",
        "unknown": "Verified Source",
    }

    for i, p in enumerate(passages, 1):
        label = source_labels.get(p.source, "Verified Source")
        formatted.append(
            f"[{i}] Source: {label} (ID: {p.document_id})\n"
            f"    Relevance: {p.relevance_score:.2f}\n"
            f"    Content: {p.passage_text}\n"
        )

    return "\n".join(formatted)
```

---

## 5. Risk Scoring Agent — Gemini Chain-of-Thought

### File: `src/agents/risk_scoring.py`

This is the most critical agent. The system prompt must be used EXACTLY as written.
Any modification to the prompt structure, JSON schema, or tier thresholds will break
the frontend verdict card renderer.

```python
import json
import time
import google.generativeai as genai
from src.models.verdict import (
    ScanRequest, Verdict, RiskTier, ThreatType, RAGPassage
)
from src.agents.scam_intel import format_rag_context
from src.config import settings

# Configure Gemini client
genai.configure(api_key=settings.GEMINI_API_KEY)


# ─────────────────────────────────────────────────────────────────
# SYSTEM PROMPT — DO NOT MODIFY WITHOUT UPDATING VERDICT SCHEMA
# ─────────────────────────────────────────────────────────────────
RISK_SCORING_SYSTEM_PROMPT = """
You are ScamSentinel Risk Analyst, an AI agent protecting Malaysian citizens from
financial fraud. You work for the public good, aligned with PDRM and Bank Negara
Malaysia's anti-scam mission.

TASK:
Analyse the submitted threat payload using the provided Malaysian scam intelligence
context and produce a structured risk verdict.

CHAIN OF THOUGHT — follow these steps IN ORDER:

Step 1 — CLASSIFY:
Identify which threat type best matches the payload:
  - phishing: fake login pages, credential harvesting, spoofed banks/government
  - investment_scam: fake ROI, unlicensed schemes, crypto/forex scams
  - impersonation: fake PDRM, LHDN, MBPJ, bank officer, courier calls
  - mule_account: account used to receive and transfer scam proceeds
  - romance_scam: emotional manipulation leading to money requests
  - loan_scam: fake fast-approval loans requiring upfront fees
  - ecommerce_scam: fake sellers, non-delivery, fake receipts
  - unknown: does not clearly fit any category

Step 2 — MATCH INTELLIGENCE:
Review the Malaysian scam intelligence context provided.
Note which passages, if any, match patterns in the payload.
Record the document IDs of matching passages.
If no passages match, note this explicitly.

Step 3 — SCORE:
Assign a risk score from 0 to 100 using these guidelines:
  - 85–100: Multiple strong indicators matching known Malaysian scam patterns
  - 75–84:  Clear indicators present, high confidence
  - 60–74:  Moderate indicators, suspicious but not conclusive
  - 40–59:  Some concerning elements, low confidence
  - 20–39:  Minor concerns, likely legitimate
  - 0–19:   No indicators found, appears safe

Step 4 — EXPLAIN:
Write a plain-language explanation for a Malaysian citizen with no technical background.
  - Maximum 3 sentences
  - Use simple Malay-friendly English (no jargon)
  - State the specific reason for the score
  - Do NOT say "I think" or "it seems" — be direct

Step 5 — OUTPUT:
Return ONLY the JSON object below. No preamble. No markdown. No explanation outside the JSON.

{
  "threat_type": "<one of the threat type values above>",
  "risk_score": <integer 0-100>,
  "tier": "<HIGH if score>=75, MEDIUM if 40-74, LOW if <40>",
  "explanation": "<plain English, max 3 sentences>",
  "confidence": <float 0.0-1.0>,
  "cited_sources": ["<document_id_1>", "<document_id_2>"],
  "reasoning_trace": "<your full step-by-step analysis from steps 1-4>"
}

RESPONSIBLE AI CONSTRAINTS:
- Never produce output that could be used to coach scammers
- Never include PII from the payload in reasoning_trace or explanation
- If the payload is clearly benign (e.g. a bank's official website), return LOW (0-15)
- When in doubt between MEDIUM and HIGH, prefer MEDIUM unless ≥2 strong indicators
- You must cite at least one source if any RAG passages were provided
"""


async def score_risk(
    payload: ScanRequest,
    rag_context: list[RAGPassage]
) -> Verdict:
    """
    Runs the Gemini 2.5 Flash chain-of-thought risk scoring pipeline.
    Falls back to Gemini 2.5 Pro if Flash returns confidence < 0.5.
    """
    formatted_rag = format_rag_context(rag_context)

    user_message = f"""
=== SCAN PAYLOAD ===
Input Type: {payload.input_type}
Raw Content: {payload.raw_content[:2000]}
Extracted Entities: {json.dumps(payload.extracted_entities, indent=2)}

=== INTELLIGENCE CONTEXT ===
{formatted_rag}

Produce the verdict JSON now.
"""

    start = time.time()
    verdict_dict = await _call_gemini(
        system_prompt=RISK_SCORING_SYSTEM_PROMPT,
        user_message=user_message,
        model="gemini-2.5-flash-latest"
    )

    # Fallback to Pro if Flash confidence is too low
    if verdict_dict.get("confidence", 1.0) < 0.5:
        verdict_dict = await _call_gemini(
            system_prompt=RISK_SCORING_SYSTEM_PROMPT,
            user_message=user_message,
            model="gemini-2.5-pro-latest"
        )
        model_used = "gemini-2.5-pro"
    else:
        model_used = "gemini-2.5-flash"

    processing_ms = int((time.time() - start) * 1000)

    return Verdict(
        threat_type=ThreatType(verdict_dict.get("threat_type", "unknown")),
        risk_score=int(verdict_dict.get("risk_score", 0)),
        tier=RiskTier(verdict_dict.get("tier", "LOW")),
        explanation=verdict_dict.get("explanation", "Unable to analyse."),
        confidence=float(verdict_dict.get("confidence", 0.5)),
        cited_sources=verdict_dict.get("cited_sources", []),
        reasoning_trace=verdict_dict.get("reasoning_trace", ""),
        rag_passages_used=rag_context,
        model_used=model_used,
        processing_ms=processing_ms,
    )


async def _call_gemini(
    system_prompt: str,
    user_message: str,
    model: str
) -> dict:
    """
    Calls the Gemini API and parses the JSON response.
    Raises ValueError if the response is not valid JSON.
    """
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,        # Low temperature for consistent JSON output
            top_p=0.8,
            max_output_tokens=2048,
            response_mime_type="application/json",  # Force JSON output
        ),
    )

    response = await gemini_model.generate_content_async(user_message)

    try:
        raw_text = response.text.strip()
        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        return json.loads(raw_text)
    except (json.JSONDecodeError, IndexError) as e:
        raise ValueError(
            f"Gemini returned non-JSON response: {response.text[:200]}"
        ) from e
```

---

## 6. Response Agent — Genkit Flow

### File: `src/agents/response.py`

```python
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
        "created_at": datetime.now(timezone.utc),
        "report_count": 1,
    }

    community_ref.add(doc)
    return True


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
```

---

## 7. Voice Agent — Gemini Live WebSocket

### File: `src/agents/voice_agent.py`

```python
import asyncio
import json
from fastapi import WebSocket, WebSocketDisconnect
import google.generativeai as genai
from google.generativeai.types import LiveConnectConfig, Modality

from src.agents.orchestrator import run_orchestrator
from src.models.verdict import ScanRequest
from src.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

VOICE_SYSTEM_PROMPT = """
You are a real-time voice transcription agent for ScamSentinel MY.
Your ONLY job is to accurately transcribe Malaysian-accented English, 
Bahasa Malaysia, Mandarin, and Tamil speech into text.

Rules:
- Transcribe exactly what is said, do not interpret or summarise
- Preserve phone numbers, account numbers, and URLs exactly as spoken
- Output format: {"transcript": "<text>", "is_final": <bool>, "confidence": <float>}
- Do not add punctuation beyond what is clearly spoken
- If speech is unclear, output: {"transcript": "", "is_final": false, "confidence": 0.0}
"""


async def handle_voice_websocket(websocket: WebSocket, user_id: str):
    """
    WebSocket handler for real-time voice scanning.
    Receives audio chunks, streams transcription back, and
    triggers the scan pipeline when the user stops speaking.
    """
    await websocket.accept()
    full_transcript = []

    try:
        client = genai.Client()

        async with client.aio.live.connect(
            model="gemini-2.5-flash-live-001",
            config=LiveConnectConfig(
                response_modalities=[Modality.TEXT],
                system_instruction=VOICE_SYSTEM_PROMPT,
            ),
        ) as session:

            async def send_audio():
                """Receive audio chunks from browser and forward to Gemini Live."""
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    if audio_chunk == b"END_OF_SPEECH":
                        await session.send(input={"end_of_turn": True})
                        break
                    await session.send(
                        input={"data": audio_chunk, "mime_type": "audio/pcm;rate=16000"}
                    )

            async def receive_transcription():
                """Stream transcription chunks back to the frontend."""
                async for response in session.receive():
                    if response.text:
                        chunk_data = json.loads(response.text)
                        await websocket.send_json(chunk_data)
                        if chunk_data.get("is_final") and chunk_data.get("transcript"):
                            full_transcript.append(chunk_data["transcript"])

            # Run both directions concurrently
            await asyncio.gather(send_audio(), receive_transcription())

    except WebSocketDisconnect:
        pass
    finally:
        # Once voice session ends, trigger the scan pipeline on the full transcript
        if full_transcript:
            combined_transcript = " ".join(full_transcript)
            scan_request = ScanRequest(
                input_type="voice_transcript",
                raw_content=combined_transcript,
                extracted_entities=_extract_entities_from_transcript(combined_transcript),
                metadata={"source": "voice_websocket"},
                user_id=user_id,
            )
            verdict_response = await run_orchestrator(scan_request)
            await websocket.send_json({
                "type": "scan_complete",
                "verdict": verdict_response.model_dump()
            })


def _extract_entities_from_transcript(transcript: str) -> dict:
    """
    Simple regex-based entity extraction from voice transcript.
    Full NER is handled by the Risk Scoring Agent.
    """
    import re
    return {
        "phone_numbers": re.findall(r"\b0[1-9]\d{7,9}\b", transcript),
        "urls": re.findall(r"https?://\S+", transcript),
        "account_numbers": re.findall(r"\b\d{10,16}\b", transcript),
        "keywords": [],
    }
```

---

## 8. Tool Definitions

### File: `src/agents/tools.py`

These are the callable tool functions registered with Vertex AI Agent Builder.
They wrap the agent functions so Agent Builder can call them via its tool dispatcher.

```python
from vertexai.preview.reasoning_engines import AdkApp
from src.agents.scam_intel import retrieve_scam_patterns
from src.agents.risk_scoring import score_risk
from src.agents.response import execute_response_flow


def get_tools() -> list:
    """Returns the list of tool functions for Agent Builder registration."""

    async def retrieve_scam_patterns_tool(query: str, top_k: int = 5) -> dict:
        """
        Retrieve relevant scam pattern passages from the Malaysian RAG corpus.
        Use this to ground risk scoring in verified PDRM, BNM, and MCMC data.

        Args:
            query: Semantic search query derived from the scan payload
            top_k: Number of passages to retrieve (default 5, max 10)

        Returns:
            List of RAGPassage objects with source attribution
        """
        passages = await retrieve_scam_patterns(query=query, top_k=top_k)
        return {"passages": [p.model_dump() for p in passages]}

    async def score_risk_tool(payload: dict, rag_context: list) -> dict:
        """
        Run Gemini chain-of-thought risk scoring on the normalised scan payload.
        Always call retrieve_scam_patterns_tool first and pass results here.

        Args:
            payload: Normalised ScanRequest dict
            rag_context: List of RAGPassage dicts from retrieve_scam_patterns_tool

        Returns:
            Verdict dict with risk_score, tier, explanation, and reasoning_trace
        """
        from src.models.verdict import ScanRequest, RAGPassage
        req = ScanRequest(**payload)
        passages = [RAGPassage(**p) for p in rag_context]
        verdict = await score_risk(payload=req, rag_context=passages)
        return verdict.model_dump()

    async def execute_response_tool(verdict: dict, scan_id: str) -> dict:
        """
        Execute the response flow for the produced verdict.
        Call this AFTER both retrieve_scam_patterns_tool and score_risk_tool complete.

        Args:
            verdict: Verdict dict from score_risk_tool
            scan_id: UUID of the current scan session

        Returns:
            dict with community_pushed, pdrm_report, fcm_sent status
        """
        from src.models.verdict import Verdict
        v = Verdict(**verdict)
        return await execute_response_flow(
            verdict=v,
            scan_id=scan_id,
            user_id=verdict.get("user_id", "anonymous")
        )

    return [
        retrieve_scam_patterns_tool,
        score_risk_tool,
        execute_response_tool,
    ]
```

---

## 9. Error Handling & Fallbacks

### File: `src/agents/fallbacks.py`

```python
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
    from datetime import datetime, timezone

    db = get_db()
    db.collection("failed_community_pushes").add({
        "scan_id": scan_id,
        "error": str(error),
        "created_at": datetime.now(timezone.utc),
        "retry_count": 0,
    })
```

### Retry configuration: `src/config.py` additions

```python
# Add to existing config.py

GEMINI_MAX_RETRIES: int = 3
GEMINI_RETRY_DELAY_SECONDS: float = 1.0
VERTEX_SEARCH_TIMEOUT_SECONDS: int = 5
AGENT_PIPELINE_TIMEOUT_SECONDS: int = 10  # Hard ceiling for full scan latency
```

---

## 10. Prompt Engineering Rules

These rules apply to ALL future prompt modifications. Violating them will cause
the frontend verdict card to break or the judging criteria to fail.

### Rule 1 — Always enforce JSON output
Use `response_mime_type="application/json"` in the Gemini generation config.
Never rely on the model formatting JSON correctly without this enforcement.

### Rule 2 — Temperature must stay at 0.1
Risk scoring is not a creative task. Temperature 0.1 produces consistent,
deterministic verdicts. Do not raise it above 0.2 under any circumstances.

### Rule 3 — Tier thresholds are fixed
```
HIGH   = risk_score >= 75
MEDIUM = risk_score >= 40 and < 75
LOW    = risk_score < 40
```
These values are hardcoded in the frontend VerdictCard component.
If you change them in the prompt, the frontend UI will be wrong.

### Rule 4 — Explanation must be ≤ 3 sentences
The frontend verdict card has a fixed height that fits exactly 3 sentences.
Longer explanations will be truncated by the UI.

### Rule 5 — Never include PII in reasoning_trace
The reasoning_trace is stored in Firestore and visible to judges during demo.
Strip phone numbers, account numbers, names, and addresses before storing.
Use `src/utils/anonymiser.py` for this.

### Rule 6 — RAG context always goes in the user message, not the system prompt
The system prompt is cached by Gemini. The RAG context changes per request.
Putting dynamic content in the system prompt breaks caching and increases cost.

### Rule 7 — Cite at least one source when RAG passages are provided
If rag_passages is non-empty, the model must include at least one document_id
in cited_sources. A verdict with zero citations from a non-empty RAG context
indicates retrieval failure — trigger the fallback.

---

## 11. Agent Wiring — Full Code

### File: `src/main.py` — FastAPI app with all agents wired

```python
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

from src.config import settings
from src.models.verdict import ScanRequest, ScanResponse, InterceptRequest, InterceptVerdict
from src.agents.orchestrator import run_orchestrator
from src.agents.voice_agent import handle_voice_websocket
from src.db.firestore import get_db, init_firestore
from src.db.community import get_community_feed, check_mule_account
from src.agents.fallbacks import gemini_rate_limit_fallback


# ── App lifecycle ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise all Google Cloud clients at startup. Cache secrets in memory."""
    # Init Firebase Admin
    cred = credentials.Certificate(settings.FIREBASE_SA_PATH)
    firebase_admin.initialize_app(cred)

    # Init Firestore
    init_firestore()

    yield  # App runs

    # Cleanup on shutdown (nothing required for stateless Cloud Run)


app = FastAPI(
    title="ScamSentinel MY API",
    version="1.0.0",
    description="Real-time financial fraud detection for Malaysian citizens",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Tighten to frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# ── Auth dependency ──────────────────────────────────────────────
async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Validates Firebase ID token. Returns user_id. Anonymous auth accepted."""
    if not credentials:
        return "anonymous"
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded["uid"]
    except Exception:
        return "anonymous"


# ── Routes ───────────────────────────────────────────────────────
@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "ScamSentinel MY", "version": "1.0.0"}


@app.post("/api/v1/scan", response_model=ScanResponse)
async def scan(
    request: ScanRequest,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Unified threat scan endpoint.
    Accepts all 5 input types, runs the full agent pipeline,
    returns a structured verdict with optional PDRM report.
    """
    request.user_id = user_id
    try:
        return await asyncio.wait_for(
            run_orchestrator(request),
            timeout=settings.AGENT_PIPELINE_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Analysis timed out. Please try again."
        )
    except Exception as e:
        # Check if it's a rate limit error
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            from src.models.verdict import ScanResponse
            fallback_verdict = gemini_rate_limit_fallback(e)
            return ScanResponse(
                scan_id="rate-limit-fallback",
                verdict=fallback_verdict,
            )
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/intercept", response_model=InterceptVerdict)
async def intercept(
    request: InterceptRequest,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Transaction intercept endpoint.
    Checks recipient identifier against mule account index.
    """
    import time
    start = time.time()

    result = await check_mule_account(
        identifier=request.identifier,
        identifier_type=request.identifier_type
    )

    processing_ms = int((time.time() - start) * 1000)

    return InterceptVerdict(
        identifier=request.identifier,
        identifier_type=request.identifier_type,
        verdict=result["verdict"],
        confidence=result["confidence"],
        matched_report_id=result.get("matched_report_id"),
        explanation=result["explanation"],
        processing_ms=processing_ms,
    )


@app.get("/api/v1/feed")
async def feed(
    limit: int = 20,
    threat_type: str = None,
    region: str = None,
):
    """
    Community scam feed endpoint (REST fallback).
    Primary feed uses Firestore real-time listeners on the frontend.
    """
    return await get_community_feed(
        limit=limit,
        threat_type=threat_type,
        region=region
    )


@app.websocket("/api/v1/ws/voice")
async def voice_websocket(
    websocket: WebSocket,
    token: str = None
):
    """
    WebSocket endpoint for real-time voice analysis.
    Streams transcription and triggers scan pipeline at end of speech.
    """
    user_id = "anonymous"
    if token:
        try:
            decoded = firebase_auth.verify_id_token(token)
            user_id = decoded["uid"]
        except Exception:
            pass

    await handle_voice_websocket(websocket=websocket, user_id=user_id)
```

---

## Quick Reference — Agent Call Chain

```
POST /api/v1/scan
  └── run_orchestrator(request)
        ├── _build_rag_query(request)           → query string
        ├── asyncio.gather(
        │     retrieve_scam_patterns(query),     → list[RAGPassage]
        │     score_risk(payload, [])            → Verdict (initial pass)
        │   )
        ├── [if confidence < 0.6]
        │   └── score_risk(payload, rag_passages) → Verdict (re-score with RAG)
        ├── write_scan_log(scan_id, request, verdict)
        └── execute_response_flow(verdict, scan_id, user_id)
              ├── [HIGH] _push_to_community_kb(verdict, scan_id)
              ├── [HIGH] _generate_pdrm_report(verdict, scan_id)
              └── [HIGH] _send_fcm_alert(verdict, user_id)

POST /api/v1/intercept
  └── check_mule_account(identifier, identifier_type)
        ├── Firestore exact match (mule_accounts collection)
        ├── [no match] Vertex AI Search semantic query
        └── Return BLOCK | CLEAR with confidence

WS /api/v1/ws/voice
  └── handle_voice_websocket(websocket, user_id)
        ├── Gemini Flash Live → stream transcript chunks → send to frontend
        └── [on disconnect] run_orchestrator(ScanRequest from transcript)
```

---

*AGENTS.md v1.0 — ScamSentinel MY*  
*Must be read alongside PRD_ScamSentinel_MY.md and TECHSTACK_ScamSentinel_MY.md*  
*All three files together constitute the complete Antigravity build specification.*
