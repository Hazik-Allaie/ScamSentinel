import os
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

def check_firestore():
    project_id = os.getenv('GCP_PROJECT')
    print(f"Checking Firestore project: {project_id}")
    
    # Use the service account key if path is provided
    sa_path = os.getenv('FIREBASE_SA_PATH')
    if sa_path:
        db = firestore.Client.from_service_account_json(sa_path)
    else:
        db = firestore.Client(project=project_id)
        
    docs = db.collection('scans').order_by('created_at', direction=firestore.Query.DESCENDING).limit(1).stream()
    
    found = False
    for doc in docs:
        found = True
        data = doc.to_dict()
        verdict = data.get('verdict', {})
        print(f"Scan ID: {doc.id}")
        print(f"Verdict Tier: {verdict.get('tier')}")
        print(f"Risk Score: {verdict.get('risk_score')}")
        print(f"Threat Type: {verdict.get('threat_type')}")
        print(f"Reasoning Trace Length: {len(verdict.get('reasoning_trace', ''))}")
        print(f"Created At: {data.get('created_at')}")
        
    if not found:
        print("No scans found in Firestore.")

if __name__ == "__main__":
    check_firestore()
