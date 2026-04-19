# Product Requirements Document
## ScamSentinel MY — Real-Time Financial Fraud Detection Platform

**Version:** 1.0  
**Date:** April 2026  
**Track:** Project 2030 — Track 5: Secure Digital (FinTech & Security)  
**Hackathon:** MyAI Future Hackathon — Build with Google AI  
**Organised by:** GDG On Campus UTM  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goal Stories](#3-goal-stories)
4. [Scope](#4-scope)
5. [Feature List](#5-feature-list)
6. [User Stories](#6-user-stories)
7. [System Architecture Overview](#7-system-architecture-overview)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Success Matrix](#9-success-matrix)
10. [Constraints & Assumptions](#10-constraints--assumptions)
11. [Out of Scope (MVP)](#11-out-of-scope-mvp)

---

## 1. Executive Summary

ScamSentinel MY is a multi-agent, real-time financial fraud detection and interception platform built for Malaysian citizens. It enables users to scan suspicious communications — voice calls, SMS messages, URLs, QR codes, and payment requests — before acting on them. Powered by Google's AI ecosystem (Gemini 2.5, Vertex AI Agent Builder, Vertex AI Search), it returns a risk verdict with plain-language explanation in under three seconds, and autonomously takes protective action on HIGH-risk detections.

The system transitions from passive detection (report after loss) to proactive interception (flag before loss), directly addressing Malaysia's RM 2.77 billion financial scam losses recorded in 2025.

---

## 2. Problem Statement

### Scale of the crisis

- Malaysia recorded **RM 2.77 billion** in financial scam losses in 2025 — a 76% increase from 2024
- Total losses across 2023–2025 reached **RM 5.62 billion**
- Only **RM 34 million** was recovered; only **RM 6.7 million** returned to victims
- Recovery rate: effectively **<1%** of losses
- The Cyber999 Incident Response Centre recorded 2,020 incidents in Q3 2025 alone, with phishing and online fraud accounting for 75% of cases

### Root cause of failure

Existing anti-scam systems are **reactive** — they log incidents after money has already been transferred. Citizens have no real-time tool to verify a suspicious communication before they act. PDRM and BNM rely on manual reporting pipelines that are too slow to intercept funds before they pass through mule account chains.

### Opportunity

A proactive, AI-powered interception layer that operates at the moment of decision — before the user clicks, scans, or transfers — can prevent losses at source rather than attempting recovery after the fact.

---

## 3. Goal Stories

Goal stories describe the high-level outcomes each stakeholder wants to achieve, independent of how the system delivers them.

### G1 — Citizen Protection
> **As a Malaysian citizen**, I want to instantly know whether a message, call, link, or payment request is a scam **before I act on it**, so that I can protect my money without needing specialist knowledge about fraud patterns.

### G2 — Transaction Safety
> **As a user about to make a financial transfer**, I want to verify a recipient account number or e-wallet ID against known fraud records **before sending money**, so that I can be confident I am not paying into a mule account.

### G3 — Community Self-Defence
> **As a community of users**, we want every confirmed scam reported by one member to **automatically protect all other members** in real time, so that the platform becomes smarter and more protective the more people use it.

### G4 — National Intelligence Contribution
> **As a citizen or PDRM**, I want confirmed scam reports to be structured and preserved in a format that supports law enforcement investigation, so that ScamSentinel contributes to prosecution and syndicate disruption — not just individual awareness.

### G5 — Accessible Protection for All Malaysians
> **As a user with limited digital literacy or language barriers**, I want the platform to communicate risk clearly and simply — in plain language, in my language — so that vulnerable groups are not excluded from protection.

---

## 4. Scope

### In scope (MVP — submission by 21 April 2026)

| ID | Feature | Priority |
|----|---------|----------|
| F1 | Multi-modal threat scan | P0 — Must have |
| F2 | Real-time risk scoring engine | P0 — Must have |
| F3 | RAG scam knowledge base | P0 — Must have |
| F4 | Autonomous response agent | P0 — Must have |
| F5 | Transaction intercept shield | P1 — Should have |
| F6 | Scam analytics feed | P1 — Should have |

### Post-hackathon roadmap (v2, 1–3 months)

Screenshot/image scan, deepfake voice detection, investment scheme verification (SC Malaysia register), scam heatmap, multi-language support (BM, Mandarin, Tamil), syndicate pattern linking.

### Enterprise roadmap (3–12 months)

Bank API integration (BNM Open Finance), e-wallet SDK (TnG, GrabPay, MAE), PDRM investigator portal, BNM automated reporting pipeline, telco pre-call screening API, predictive scam ML model.

---

## 5. Feature List

### F1 — Multi-Modal Threat Scan

**Description:** A single unified input interface that accepts five threat input types and normalises them into a standard payload for the downstream agent pipeline.

**Input types supported:**
- Voice/call audio — transcribed in real time via Gemini 2.5 Flash Live over WebSocket
- SMS/WhatsApp text — pasted as plain text, parsed for embedded URLs and phone numbers
- URLs — unshortened, pre-fetched, DOM-screened for phishing indicators
- QR codes — decoded to destination URL or payment payload via image upload
- Payment link metadata — beneficiary account number, phone, e-wallet ID parsed from pasted transfer details

**Output:** Normalised JSON payload `{ input_type, raw_content, extracted_entities, metadata }` passed to orchestrator.

**Acceptance criteria:**
- All five input types return a normalised payload within 1 second of submission
- Voice transcription latency ≤ 500ms from audio receipt
- URL unshortening handles ≥3 redirect hops
- QR decode supports standard QR and DuitNow QR format

---

### F2 — Real-Time Risk Scoring Engine

**Description:** The core AI reasoning layer. The Orchestrator (Vertex AI Agent Builder) dispatches a Risk Scoring Agent powered by Gemini 2.5 Flash (or Pro for complex inputs). The agent executes a structured chain-of-thought:

1. Classify threat type (phishing / investment scam / impersonation / mule account / unknown)
2. Retrieve top-k matching patterns from the RAG knowledge base
3. Assign confidence-weighted risk score (0–100)
4. Generate plain-language verdict and explanation
5. Write full reasoning trace to Firestore audit log

**Risk tiers:**

| Score | Tier | Label | UI treatment |
|-------|------|-------|-------------|
| 75–100 | HIGH | Likely scam | Full-screen red blocking alert |
| 40–74 | MEDIUM | Suspicious | Warning card with report option |
| 0–39 | LOW | Likely safe | Green clear card with confidence |

**Acceptance criteria:**
- End-to-end verdict returned within 3 seconds for text inputs
- Voice verdict returned within 5 seconds of audio upload
- Reasoning trace written to Firestore for every request
- Risk tier threshold configurable via environment variable

---

### F3 — RAG Scam Knowledge Base

**Description:** A retrieval-augmented generation knowledge base indexed in Vertex AI Search, grounding every verdict in verified Malaysian scam data rather than model-generated patterns.

**Corpus sources:**
- PDRM Commercial Crime Division public scam reports
- Bank Negara Malaysia fraud advisories and MO alerts
- MCMC scam alert bulletins
- Community-submitted confirmed HIGH-risk reports (anonymised)

**RAG pipeline:**
1. Documents stored in Cloud Storage (GCP) as structured JSON and PDF
2. Indexed in Vertex AI Search with chunking and embedding
3. Risk Scoring Agent sends semantic query → retrieves top-5 matching passages
4. Retrieved passages included in Gemini prompt as grounding context
5. Verdict cites source document ID for auditability

**Acceptance criteria:**
- Index seeded with minimum 30 real scam records before submission
- Retrieval returns relevant results for 4/5 known scam types in test cases
- Every verdict includes at least one source citation
- Community HIGH reports appended to corpus and re-indexed within 60 seconds

---

### F4 — Autonomous Response Agent

**Description:** The action layer. After a risk verdict is produced, the Response Agent (Firebase Genkit flow) immediately executes tier-appropriate actions without waiting for user input.

**Actions by tier:**

**HIGH risk:**
- Render full-screen blocking alert with risk score and plain-language explanation
- Disable any share/pay/confirm button on the page
- Generate pre-filled PDRM Aduan online report (matched to actual form fields: description, contact details, loss amount placeholder, incident type)
- Anonymise submission and push to community KB
- Trigger FCM push notification to user's linked devices

**MEDIUM risk:**
- Render warning card with verdict and explanation
- Show one-tap "Report to PDRM" option
- Optionally push to community KB if user confirms

**LOW risk:**
- Render green clear card with confidence percentage
- Show "Still suspicious? Report anyway" link

**Acceptance criteria:**
- HIGH alert renders within 200ms of verdict receipt
- PDRM report template pre-fills incident type and description automatically
- Community push completes within 2 seconds of HIGH verdict
- FCM notification delivered in background for linked device alerts

---

### F5 — Transaction Intercept Shield

**Description:** A pre-transfer screening endpoint. Before making any financial transfer, users submit the recipient's account number, phone number, or e-wallet ID. The agent cross-references it against the mule account index and returns a BLOCK or CLEAR verdict.

**Lookup chain:**
1. Normalise identifier (strip spaces, standardise format)
2. Exact match against Firestore mule account collection
3. Fuzzy/partial match against community-reported beneficiaries
4. Semantic similarity query against Vertex AI Search scam corpus
5. Return BLOCK (with source report) or CLEAR (with confidence %)

**Acceptance criteria:**
- Lookup returns verdict within 2 seconds
- Exact mule account match returns BLOCK with 100% confidence and source report ID
- No-match returns CLEAR with confidence level (not a false certainty)
- Endpoint accessible at `POST /api/v1/intercept`
- Input accepts account number, phone number (+60 format), and e-wallet ID formats

---

### F6 — Scam Analytics Feed

**Description:** A live, public, read-only board displaying anonymised scam activity from the community KB in real time. Demonstrates the hive intelligence architecture and provides citizens with situational awareness about active scam campaigns.

**Features:**
- Real-time updates via Firestore onSnapshot listeners (no polling)
- Filter by scam type: investment, e-commerce, impersonation, romance, loan, phishing
- Filter by Malaysian state/region
- Trend chart showing report volume over last 7 days (Chart.js)
- Each feed entry shows: scam type, region, risk score, timestamp, extracted threat indicators (no PII)

**Acceptance criteria:**
- Feed update appears within 1 second of a HIGH-risk community push
- Filters work without page reload
- No personally identifiable information visible in any feed entry
- Cross-tab live update demonstrable in demo video (two browser tabs)

---

## 6. User Stories

### Epic 1: Threat Scanning

**US-001 — Scan a suspicious SMS**
> As a citizen who received a suspicious WhatsApp message offering a loan,  
> I want to paste the message text into ScamSentinel and get an instant risk verdict,  
> So that I know whether to ignore it or report it before responding.

**Acceptance criteria:**
- User pastes text, selects "SMS/Text" input type, taps Scan
- Verdict card appears within 3 seconds
- Card shows risk tier (HIGH/MEDIUM/LOW), score, and plain-language explanation
- If HIGH, PDRM report template is pre-filled and one-tap submit is visible

---

**US-002 — Scan a suspicious URL**
> As a citizen who received a link claiming to be from Maybank,  
> I want to paste the URL and have ScamSentinel check it before I click,  
> So that I don't accidentally enter my banking credentials into a phishing page.

**Acceptance criteria:**
- Shortened URLs are automatically unshortened and resolved
- DOM content of the destination page is screened for phishing indicators
- Verdict references specific indicators found (e.g. "domain registered 3 days ago", "login form collecting banking credentials")

---

**US-003 — Scan a QR code**
> As a citizen at a roadside stall who received a QR code via WhatsApp to "claim a prize",  
> I want to upload a screenshot of the QR code to ScamSentinel,  
> So that I can verify the payment destination before scanning it with my e-wallet.

**Acceptance criteria:**
- QR image upload decodes successfully for standard QR and DuitNow QR
- Decoded destination URL or account is passed to the risk scoring pipeline
- Result card clearly shows the decoded destination so user can see what the QR actually points to

---

**US-004 — Screen a voice call**
> As a citizen who received a suspicious call from someone claiming to be PDRM,  
> I want to record or upload the call audio to ScamSentinel after hanging up,  
> So that I can confirm whether it was a Macau scam before calling back.

**Acceptance criteria:**
- Audio upload or live WebSocket stream accepted
- Gemini 2.5 Flash Live transcribes and analyses in real time
- Verdict identifies impersonation patterns and named authority figures used as social engineering hooks

---

### Epic 2: Transaction Interception

**US-005 — Check a recipient before transferring**
> As a citizen who was asked to transfer money to a stranger's account number for an "e-commerce purchase",  
> I want to paste the account number into ScamSentinel before confirming the transfer,  
> So that I can verify it is not a known mule account.

**Acceptance criteria:**
- User pastes account number in `POST /api/v1/intercept`
- Response returns within 2 seconds
- BLOCK verdict includes the community report that flagged this account
- CLEAR verdict shows confidence percentage and "Not in known mule database" explanation

---

**US-006 — Check an e-wallet number before sending**
> As a Grab user asked to send money to a GrabPay ID I don't recognise,  
> I want to enter the phone number or GrabPay ID into ScamSentinel,  
> So that I know if other users have reported it as fraudulent.

**Acceptance criteria:**
- Phone number accepts +60 and 01X formats
- E-wallet ID accepts standard Malaysian mobile number format used by TnG/GrabPay/MAE

---

### Epic 3: Community Intelligence

**US-007 — Report a confirmed scam to protect others**
> As a citizen who confirmed they received a scam call,  
> I want my report to be automatically anonymised and added to the community knowledge base,  
> So that the next person who encounters the same scammer gets protected immediately.

**Acceptance criteria:**
- HIGH-risk verdicts automatically trigger community push (no extra user action required)
- User has option to add additional details (e.g. scammer's number, bank used)
- No PII from user's submission is stored in community KB
- Push completes and is visible in analytics feed within 2 seconds

---

**US-008 — See what scams are active in my area**
> As a citizen in Kuala Lumpur concerned about current scam campaigns,  
> I want to see a live feed of recent scam reports filtered by my state,  
> So that I know what tactics are currently being used and can warn family members.

**Acceptance criteria:**
- Analytics feed filterable by state without page reload
- Each entry shows scam type, region, and key threat indicators
- Feed refreshes in real time — reports appear within 1 second of submission
- Zero PII visible in any feed entry

---

### Epic 4: Reporting & Evidence

**US-009 — Submit a pre-filled PDRM report**
> As a citizen who was targeted by a scam,  
> I want ScamSentinel to generate a pre-filled PDRM Aduan report from my scan,  
> So that I can report the incident quickly without having to manually fill in complex forms.

**Acceptance criteria:**
- PDRM report template auto-fills: incident type, description of threat, scammer identifiers extracted from scan, timestamp
- User fills in personal details and loss amount (if any) before submitting
- Report can be downloaded as PDF or submitted via the PDRM online portal link
- Report generation adds no extra steps to the HIGH-risk flow — it is presented automatically

---

## 7. System Architecture Overview

```
User Interface (React SPA / Mobile Web)
         │
         ▼
FastAPI Backend (Cloud Run — asia-southeast1)
         │
   ┌─────┴──────────────────────────────────┐
   │         Orchestrator                    │
   │   (Vertex AI Agent Builder)             │
   └─────┬──────────┬──────────┬────────────┘
         │          │          │
         ▼          ▼          ▼
   Scam Intel    Risk Score   Response
     Agent         Agent       Agent
  (RAG query)  (Gemini 2.5) (Genkit flow)
         │          │          │
         ▼          ▼          ▼
  Vertex AI      Firestore    FCM +
   Search        (audit log)  Community KB
  (corpus)
         │
  Cloud Storage
  (PDRM / BNM docs)
```

**Key design principles:**
- Agent-first: every decision passes through a reasoned chain-of-thought, not a rules engine
- Grounded: all verdicts cite a real Malaysian data source from the RAG corpus
- Auditable: full reasoning trace stored per request in Firestore
- Privacy-first: no PII stored in community KB — only threat identifiers and scam patterns

---

## 8. Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| Text/URL scan end-to-end latency | ≤ 3 seconds |
| Transaction intercept lookup | ≤ 2 seconds |
| Voice analysis verdict | ≤ 5 seconds |
| Community push to feed visible | ≤ 2 seconds |
| HIGH alert render after verdict | ≤ 200ms |

### Reliability
- Cloud Run auto-scales; scale-to-zero when idle
- Firestore real-time listeners reconnect automatically on disconnect
- Graceful degradation: if Vertex AI Search is unavailable, Risk Scoring Agent falls back to model-only reasoning with reduced confidence

### Security
- All API keys and service account credentials stored in Secret Manager — never hardcoded
- Secrets injected as environment variables at Cloud Run startup
- Secrets cached in memory — not re-fetched per request
- No PII stored in the community knowledge base
- Firestore security rules restrict community KB to append-only from authenticated service account
- HTTPS enforced across all endpoints (Cloud Run provides TLS termination)

### Compliance
- Aligned with PDPA (Personal Data Protection Act) Malaysia 2010 — no personal data stored without explicit consent
- Responsible AI: all Gemini prompts include explicit bias mitigation and responsible use instructions
- Reasoning traces stored for auditability and model improvement

### Accessibility
- High-contrast colour scheme for risk tiers (not colour-only — icons + text labels used)
- Minimum 16px body text throughout
- Screen reader compatible alert announcements for HIGH-risk results
- Mobile-first responsive layout

---

## 9. Success Matrix

### Hackathon judging metrics

| Judging category | Max marks | Target score | How ScamSentinel achieves it |
|-----------------|-----------|-------------|------------------------------|
| AI Implementation & Technical Execution | 25 | 22–25 | Vertex AI Agent Builder orchestrator + 3 sub-agents + RAG + Gemini chain-of-thought satisfies all four sub-categories |
| Innovation & Creativity | 20 | 16–20 | Hive intelligence network (community KB auto-updates) is the unexpected AI application; pre-filled PDRM report generation is the "wow factor" |
| Impact & Problem Relevance | 20 | 18–20 | RM 2.77B loss data + BNM/PDRM alignment + "technology creator" narrative = near-maximum national relevance marks |
| UI/UX & Product Experience | 10 | 8–10 | Single-page scan flow, tiered alert design, high-contrast accessible UI, real-time feed |
| Code Quality | 15 | 13–15 | Secret Manager (no hardcoded keys), modular FastAPI structure, full README, reasoning trace as built-in documentation |
| Pitch / Demo | 10 | 8–10 | Cross-tab live demo of community push; PDRM report pre-fill; RM 2.77B opening statistic |
| **Total** | **100** | **85–100** | |

### Product success metrics (post-hackathon)

| Metric | MVP target | 3-month target | 12-month target |
|--------|-----------|----------------|-----------------|
| Scan requests per day | 50 (demo) | 500 | 10,000 |
| Community KB records | 30 (seeded) | 500 | 10,000 |
| Transaction intercept lookups/day | 10 (demo) | 200 | 5,000 |
| Average verdict latency | ≤ 3s | ≤ 2s | ≤ 1s |
| HIGH-risk correct detection rate | Qualitative | ≥ 80% | ≥ 90% |
| PDRM reports generated | 5 (demo) | 100 | 2,000 |
| User reported scams prevented | Unmeasurable at MVP | Qualitative | RM value tracked |

### Demo success criteria (judging video)

- [ ] User pastes a scam SMS → HIGH verdict + PDRM report generated in ≤ 3 seconds
- [ ] User pastes a clean URL → LOW verdict with confidence score
- [ ] User enters a mule account number → BLOCK verdict with source report cited
- [ ] Tab A submits HIGH-risk report → Tab B analytics feed updates in real time (≤ 2 seconds)
- [ ] Reasoning trace visible in Firestore console (demonstrating auditability)
- [ ] Cloud Run URL accessible without login (judges can test live)

---

## 10. Constraints & Assumptions

### Constraints
- **Submission deadline:** 21 April 2026 at 11:59 PM — hard stop
- **Build window:** 15 March – 21 April 2026 (hackathon period only)
- **Gemini API free tier:** 250 RPD (2.5 Flash) and 100 RPD (2.5 Pro) — adequate for demo; use GCP credits for higher limits
- **Gemini 2.0 Flash deprecated:** February 2026 — use Gemini 2.5 Flash as direct replacement
- **Team size:** Solo or up to 4 members; all code must be defensible during judging
- **AI-generated code:** Must be disclosed in README; team must explain every section

### Assumptions
- Participant has active Google Cloud account with available credits
- PDRM public scam report data is available for corpus seeding (publicly published)
- BNM fraud advisories are publicly accessible on the BNM website
- Demo will be recorded as a video (max 3 minutes) and submitted alongside a live URL
- Judges will test the live app — it must remain accessible through 16–17 May 2026 Demo Day

---

## 11. Out of Scope (MVP)

The following features are explicitly excluded from the MVP submission and belong in the v2 or enterprise roadmap:

- Screenshot and image scan (fake apps, forged receipts) — requires Gemini Vision multimodal
- Deepfake voice detection — requires custom audio classifier training
- Investment scheme verification against SC Malaysia register — requires SC API access
- Geographic scam heatmap — requires Google Maps Platform integration
- Multi-language UI (BM, Mandarin, Tamil) — design ready but not implemented
- Syndicate pattern linking — requires vector similarity at scale
- Bank API integration — requires financial institution partnership
- E-wallet SDK — requires TnG/GrabPay/MAE partnership
- PDRM investigator portal — requires authenticated government access
- Mobile native app (iOS/Android) — web-first for MVP

---

*Document maintained by ScamSentinel MY team. Last updated: April 2026.*  
*For hackathon queries: myaifuturehackathon@gmail.com | Discord: https://discord.gg/H7AKRXSY2B*
