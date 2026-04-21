from google.cloud import firestore
import os
import json

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\ALLAIE HAZU\OneDrive\Documents\Scamsentinel\ScamSentinel\service_account_key.json"

def inspect_firestore():
    db = firestore.Client(project="scamsentinel-my")
    docs = db.collection('scans').order_by('created_at', direction=firestore.Query.DESCENDING).limit(1).stream()
    for doc in docs:
        print(f"Document ID: {doc.id}")
        data = doc.to_dict()
        # Convert datetime objects to string for printing
        for k, v in data.items():
            if hasattr(v, 'isoformat'):
                data[k] = v.isoformat()
        print(json.dumps(data, indent=2))

if __name__ == "__main__":
    inspect_firestore()
