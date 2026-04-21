import asyncio
from datetime import datetime
from src.db.firestore import init_firestore, get_db

def check_db():
    init_firestore()
    db = get_db()
    
    print("=== RECENT SCANS (All risk levels) ===")
    scans_ref = db.collection("scans").order_by("created_at", direction="DESCENDING").limit(5)
    scans = list(scans_ref.stream())
    if not scans:
        print("No scans found.")
    for doc in scans:
        data = doc.to_dict()
        tier = data.get("verdict", {}).get("tier", "UNKNOWN")
        threat = data.get("verdict", {}).get("threat_type", "UNKNOWN")
        print(f"ID: {doc.id} | Tier: {tier} | Type: {threat} | Time: {data.get('created_at')}")
        
    print("\n=== RECENT COMMUNITY KB (High risk pushed to feed) ===")
    kb_ref = db.collection("community_kb").order_by("timestamp", direction="DESCENDING").limit(5)
    kb = list(kb_ref.stream())
    if not kb:
        print("No community KB entries found.")
    for doc in kb:
        data = doc.to_dict()
        print(f"ID: {doc.id} | Tier: {data.get('tier')} | Type: {data.get('threat_type')} | Time: {data.get('timestamp')}")
        
if __name__ == "__main__":
    check_db()
