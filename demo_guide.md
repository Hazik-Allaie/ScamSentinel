# ScamSentinel MY — Demo Guide

Welcome to the ScamSentinel MY Demo! This guide outlines the key features to showcase during the presentation.

## Prerequisites
1. Backend running on `http://localhost:8080` (or Cloud Run).
2. Frontend running on `http://localhost:5173`.
3. Firestore seeded with sample data (`python scripts/seed_demo_data.py`).

## Demo Flow

### 1. Scenario: Phishing SMS Analysis
- **Action**: Go to the **Scan Threat** tab.
- **Input**: Paste the following text: 
  > "RM0.00: TAHNIAH! Anda telah memenangi hadiah cabutan bertuah RM1,000 dari TNG eWallet. Sila tebus di: http://tng-rewards-claim.com"
- **Observation**:
  - The system detects **HIGH RISK**.
  - A red verdict card appears with specific reasoning (Impersonation of TNG, suspicious URL).
  - A **PDRM Report Template** is automatically generated below the card.

### 2. Scenario: Mule Account Verification
- **Action**: Go to the **Verify Payment** tab.
- **Input**: Enter Account Number `1234567890`.
- **Observation**:
  - The system returns a **BLOCK** verdict.
  - Shows that this account has 5 previous reports in the database.
  - Provides a warning to the user to halt the transaction.

### 3. Scenario: Community Intelligence
- **Action**: Go to the **Live Feed** tab.
- **Observation**:
  - Real-time updates showing recent scams reported by other users.
  - A trend chart showing scam activity over the last 7 days.
  - Filters to see scams specific to a region (e.g., Selangor).

### 4. Scenario: Voice Intercept (Optional)
- **Action**: Use the **Voice** tab in Scan Threat.
- **Action**: Click the microphone and say:
  > "Hello, this is from the bank. We need your TAC number to verify your account."
- **Observation**:
  - Real-time transcription shows on screen.
  - Analysis flags "TAC number request" as a high-risk indicator.
