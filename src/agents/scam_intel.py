"""
ScamSentinel MY — Scam Intel Agent (RAG Retrieval)

Queries the Vertex AI Search data store with a semantic query.
Returns top-k passage objects with source attribution from:
- PDRM Commercial Crime Division reports
- Bank Negara Malaysia fraud advisories
- MCMC scam alert bulletins
- Community-confirmed scam reports (anonymised)

Reference: AGENTS_ScamSentinel_MY.md §4
"""

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

    IMPORTANT (AGENTS.md Rule 6): RAG context goes in the USER message,
    not the system prompt — system prompt is cached by Gemini.
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
