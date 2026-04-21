"""
ScamSentinel MY — Risk Scoring Agent (Gemini Chain-of-Thought)

The most critical agent. Runs a structured 5-step chain-of-thought
analysis using Gemini 2.5 Flash (with Pro fallback) to produce a
risk verdict for any scanned threat payload.

IMPORTANT: The system prompt must be used EXACTLY as written.
Any modification to the prompt structure, JSON schema, or tier
thresholds will break the frontend verdict card renderer.

Reference: AGENTS_ScamSentinel_MY.md §5
"""

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
        model="gemini-2.5-flash"
    )

    # Fallback to Pro if Flash confidence is too low
    if verdict_dict.get("confidence", 1.0) < 0.5:
        verdict_dict = await _call_gemini(
            system_prompt=RISK_SCORING_SYSTEM_PROMPT,
            user_message=user_message,
            model="gemini-2.5-pro"
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

    Rules enforced (AGENTS.md §10):
    - response_mime_type="application/json" (Rule 1)
    - temperature=0.1 (Rule 2)
    """
    gemini_model = genai.GenerativeModel(
        model_name=model,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,        # Low temperature for consistent JSON output
            top_p=0.8,
            max_output_tokens=8192,
            response_mime_type="application/json",  # Force JSON output
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "threat_type": {"type": "STRING"},
                    "risk_score": {"type": "INTEGER"},
                    "tier": {"type": "STRING"},
                    "explanation": {"type": "STRING"},
                    "confidence": {"type": "NUMBER"},
                    "cited_sources": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "reasoning_trace": {"type": "STRING"}
                },
                "required": ["threat_type", "risk_score", "tier", "explanation", "confidence", "cited_sources", "reasoning_trace"]
            }
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
