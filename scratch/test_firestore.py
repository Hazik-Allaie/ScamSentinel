from google.cloud import firestore
import os

# Set environment variable for service account if not already set
# But since the .env is already loaded by the backend, I should make sure I can access it here.
# I'll just use the path from .env directly.
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\ALLAIE HAZU\OneDrive\Documents\Scamsentinel\ScamSentinel\service_account_key.json"

def test_firestore():
    print("--- Running Test 2B - Verify Firestore storage ---")
    try:
        db = firestore.Client(project="scamsentinel-my")
        docs = db.collection('scans').order_by('created_at', direction=firestore.Query.DESCENDING).limit(1).stream()
        found = False
        for doc in docs:
            found = True
            data = doc.to_dict()
            print(f"Document ID: {doc.id}")
            print(f"verdict_id: {data.get('verdict_id')}")
            print(f"scan_id: {data.get('scan_id')}")
            print(f"risk_score: {data.get('risk_score')}")
            print(f"tier: {data.get('tier')}")
            print(f"reasoning_trace length: {len(str(data.get('reasoning_trace', '')))}")
            print(f"created_at: {data.get('created_at')}")
        
        if not found:
            print("No documents found in 'scans' collection.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_firestore()
