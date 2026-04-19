"""
ScamSentinel MY — Agent Builder Tool Definitions

Callable tool functions registered with Vertex AI Agent Builder.
They wrap the agent functions so Agent Builder can call them
via its tool dispatcher.

Reference: AGENTS_ScamSentinel_MY.md §8
"""

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
