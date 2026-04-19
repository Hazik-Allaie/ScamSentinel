"""
ScamSentinel MY — Voice Agent (Gemini Live WebSocket)

Real-time voice transcription and analysis using Gemini 2.5 Flash Live.
Receives audio chunks from the browser via WebSocket, streams transcription
back in real time, and triggers the full scan pipeline when the user
stops speaking.

Reference: AGENTS_ScamSentinel_MY.md §7
"""

import asyncio
import json
import re
from fastapi import WebSocket, WebSocketDisconnect
from google import genai
from google.genai.types import LiveConnectConfig, Modality

from src.agents.orchestrator import run_orchestrator
from src.models.verdict import ScanRequest
from src.config import settings

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
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

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
            try:
                verdict_response = await run_orchestrator(scan_request)
                await websocket.send_json({
                    "type": "scan_complete",
                    "verdict": verdict_response.model_dump()
                })
            except Exception:
                # WebSocket may already be closed
                pass


def _extract_entities_from_transcript(transcript: str) -> dict:
    """
    Simple regex-based entity extraction from voice transcript.
    Full NER is handled by the Risk Scoring Agent.
    """
    return {
        "phone_numbers": re.findall(r"\b0[1-9]\d{7,9}\b", transcript),
        "urls": re.findall(r"https?://\S+", transcript),
        "account_numbers": re.findall(r"\b\d{10,16}\b", transcript),
        "keywords": [],
    }
