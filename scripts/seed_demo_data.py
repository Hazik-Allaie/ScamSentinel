"""
ScamSentinel MY — Demo Seeding Script
Seeds Firestore with sample mule accounts and recent scam reports for the demo.
"""

import os
from datetime import datetime, timedelta, timezone
import firebase_admin
from firebase_admin import credentials, firestore

def seed_data():
    # 1. Initialize Firebase (expects GOOGLE_APPLICATION_CREDENTIALS or default)
    try:
        firebase_admin.initialize_app()
    except Exception:
        print("Using default credentials...")
        firebase_admin.initialize_app()
        
    db = firestore.client()

    # 2. Seed Mule Accounts
    mule_accounts = [
        {
            "identifier": "1234567890",
            "identifier_type": "bank_account",
            "risk_score": 100,
            "reports_count": 5,
            "status": "active_mule",
            "last_seen": datetime.now(timezone.utc)
        },
        {
            "identifier": "0123456789",
            "identifier_type": "phone_number",
            "risk_score": 95,
            "reports_count": 3,
            "status": "active_mule",
            "last_seen": datetime.now(timezone.utc)
        }
    ]
    
    for account in mule_accounts:
        db.collection("mule_accounts").document(account["identifier"]).set(account)
        print(f"Seeded mule account: {account['identifier']}")

    # 3. Seed Recent Reports (for Feed)
    threats = ["phishing", "investment_scam", "impersonation"]
    regions = ["Kuala Lumpur", "Selangor", "Johor", "Penang"]
    
    for i in range(10):
        report = {
            "threat_type": threats[i % 3],
            "risk_score": 80 + i,
            "tier": "HIGH",
            "region": regions[i % 4],
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=i*2),
            "indicators": [f"domain:scam-site-{i}.com"],
            "score": 80 + i
        }
        db.collection("community_kb").add(report)
        print(f"Seeded report {i}")

if __name__ == "__main__":
    seed_data()
