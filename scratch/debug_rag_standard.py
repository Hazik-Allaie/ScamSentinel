import asyncio
import os
from google.cloud import discoveryengine_v1 as discoveryengine
from pydantic import BaseModel

class RAGPassage(BaseModel):
    document_id: str
    source: str
    passage_text: str
    relevance_score: float

async def test_rag():
    project_id = "scamsentinel-my"
    datastore_id = "scamsentinel-corpus"
    location = "global"
    
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\ALLAIE HAZU\OneDrive\Documents\Scamsentinel\ScamSentinel\service_account_key.json"
    
    client = discoveryengine.SearchServiceAsyncClient()
    
    serving_config = (
        f"projects/{project_id}/locations/{location}"
        f"/collections/default_collection"
        f"/dataStores/{datastore_id}"
        f"/servingConfigs/default_serving_config"
    )
    
    query = "Maybank account suspended phishing"
    print(f"Querying: {query}")
    
    # Try WITHOUT extractive_content_spec (Standard Edition features only)
    request = discoveryengine.SearchRequest(
        serving_config=serving_config,
        query=query,
        page_size=5,
        content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
            snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
                return_snippet=True,
                max_snippet_count=3,
            ),
        ),
    )
    
    try:
        response = await client.search(request)
        print("Response received.")
        count = 0
        async for result in response:
            count += 1
            print(f"\nResult {count}:")
            doc = result.document
            print(f"  Doc ID: {doc.id}")
            if doc.derived_struct_data:
                derived = dict(doc.derived_struct_data)
                snippets = derived.get("snippets", [])
                if snippets:
                    print(f"  Snippet: {snippets[0].get('snippet')}")
        
        if count == 0:
            print("No results found.")
            
    except Exception as e:
        print(f"Error during search: {e}")

if __name__ == "__main__":
    asyncio.run(test_rag())
