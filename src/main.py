"""
ScamSentinel MY — FastAPI Application

Main application entry point. Wires all agents, routes, and middleware.
Runs on Cloud Run at port 8080 with a single uvicorn worker.

Routes:
    GET   /api/v1/health      — Health check
    POST  /api/v1/scan        — Unified threat scan (all 5 input types)
    POST  /api/v1/intercept   — Transaction recipient screening
    GET   /api/v1/feed        — Community scam feed (REST fallback)
    POST  /api/v1/report      — Manual PDRM report submission
    WS    /api/v1/ws/voice    — Real-time voice analysis

Reference: AGENTS_ScamSentinel_MY.md §11
"""

import asyncio
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException, Depends, UploadFile, File
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
    try:
        if settings.FIREBASE_SA_PATH:
            cred = credentials.Certificate(settings.FIREBASE_SA_PATH)
            firebase_admin.initialize_app(cred)
        else:
            # Use Application Default Credentials on Cloud Run
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"[WARN] Firebase Admin init skipped (expected in local dev without credentials): {e}")

    # Init Firestore
    try:
        init_firestore()
    except Exception as e:
        print(f"[WARN] Firestore init skipped (expected in local dev without credentials): {e}")

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
    """Health check endpoint for Cloud Run."""
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
    start = time.time()
    request.user_id = user_id

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


@app.post("/api/v1/report")
async def submit_report(
    report_data: dict,
    user_id: str = Depends(verify_firebase_token)
):
    """
    Manual PDRM report submission endpoint.
    Stores the report details in Firestore for reference.
    """
    db = get_db()
    from datetime import datetime, timezone

    doc = {
        **report_data,
        "user_id": user_id,
        "submitted_at": datetime.now(timezone.utc),
        "status": "submitted",
    }

    doc_ref = db.collection("pdrm_reports").add(doc)
    return {
        "status": "submitted",
        "report_id": doc_ref[1].id,
        "message": "Report submitted successfully. You can also file directly at the PDRM portal.",
        "portal_url": "https://www.rmp.gov.my/docs/default-source/commercial-crime/report.pdf",
        "nsrc_hotline": "997",
    }


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
