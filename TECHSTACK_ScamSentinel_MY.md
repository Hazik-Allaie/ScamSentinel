# Tech Stack
## ScamSentinel MY — 2026 Recommended Stack

**Version:** 1.0  
**Date:** April 2026  
**Based on:** PRD_ScamSentinel_MY v1.0  

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Frontend](#2-frontend)
3. [Backend](#3-backend)
4. [AI & Agent Layer](#4-ai--agent-layer)
5. [Authentication](#5-authentication)
6. [Database & Storage](#6-database--storage)
7. [Deployment & Infrastructure](#7-deployment--infrastructure)
8. [Development Environment](#8-development-environment)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Dependency Map](#10-dependency-map)
11. [Cost Profile](#11-cost-profile)

---

## 1. Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend          React 19 + Vite + Tailwind CSS       │
│  Auth              Firebase Authentication               │
│  Backend           FastAPI (Python 3.12)                 │
│  Agent Layer       Vertex AI Agent Builder + Genkit      │
│  AI Brain          Gemini 2.5 Flash / Pro                │
│  RAG               Vertex AI Search                      │
│  Database          Firestore (Native mode)               │
│  Storage           GCP Cloud Storage                     │
│  Secrets           Secret Manager                        │
│  Container         Docker + Artifact Registry            │
│  Deployment        Cloud Run (asia-southeast1)           │
│  CI/CD             GitHub Actions                        │
│  IDE               Google Antigravity                    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Frontend

### Choice: React 19 + Vite + Tailwind CSS v4

```
react@19
vite@6
tailwindcss@4
firebase@11 (client SDK)
chart.js@4
```

### Justification

**React 19** is chosen over Next.js, SvelteKit, or Vue for three reasons specific to this project:

1. **Actions API (React 19 new feature):** React 19's native async Actions replace the boilerplate of `useEffect` + `useState` for the scan submit flow. The entire "submit → wait → show verdict" cycle becomes a single async action with built-in pending/error states — exactly what the scan UX needs.

2. **No SSR overhead needed:** ScamSentinel is a utility app, not a content site. There is no SEO requirement and no benefit to server-side rendering. Vite's single-page app output deploys to any static host in seconds and loads instantly from CDN.

3. **Team familiarity:** React remains the most widely understood frontend framework in Malaysia's university ecosystem. During a 2-day hackathon, choosing a framework everyone on the team can debug matters more than marginal performance gains from alternatives.

**Vite 6** replaces Create React App (deprecated) and webpack for development. Cold start under 300ms, hot module replacement under 50ms. Non-negotiable in a hackathon where you rebuild the UI constantly.

**Tailwind CSS v4** is chosen over plain CSS or styled-components because:
- The Oxide engine (Rust-based, new in v4) compiles CSS 5× faster than v3
- Utility classes eliminate the context-switching between JS and CSS files during rapid prototyping
- The `@theme` directive in v4 makes the high-contrast colour scheme for risk tiers (RED/AMBER/GREEN) trivially configurable as design tokens

**Firebase Client SDK v11** handles real-time Firestore listeners in the browser directly — no backend polling endpoint needed. The analytics feed's cross-tab live updates run entirely on the client SDK.

**Chart.js v4** handles the 7-day trend chart in the analytics feed. Chosen over Recharts (heavier) or D3 (too low-level for a chart that needs to be built in hours).

### Key frontend files

```
src/
  components/
    ScanInput.jsx          — unified five-mode input component
    VerdictCard.jsx        — HIGH/MEDIUM/LOW alert renderer
    InterceptForm.jsx      — transaction intercept UI
    AnalyticsFeed.jsx      — real-time Firestore feed + chart
    PdrumReport.jsx        — pre-filled PDRM report generator
  hooks/
    useScan.js             — wraps POST /api/v1/scan with React 19 action
    useIntercept.js        — wraps POST /api/v1/intercept
    useFeed.js             — Firestore onSnapshot listener
  pages/
    Scan.jsx               — main scan page
    Intercept.jsx          — transaction intercept page
    Feed.jsx               — analytics feed page
  lib/
    firebase.js            — Firebase app init
    api.js                 — FastAPI client (fetch wrapper)
```

### Why not Next.js?

Next.js adds SSR, file-based routing, and a Node.js server layer that ScamSentinel does not need. It would double the deployment surface (a Next.js server + Cloud Run for FastAPI) and add complexity with no benefit. For a pure SPA utility app, Vite + React is the correct tool.

### Why not SvelteKit?

SvelteKit is excellent but the ecosystem tooling for Firebase + real-time listeners is less mature in Svelte than React. During a 2-day sprint, the React community's volume of copy-paste examples for Firebase + Firestore is a practical advantage.

---

## 3. Backend

### Choice: FastAPI (Python 3.12)

```
fastapi@0.115
uvicorn[standard]@0.32
pydantic@2.9
google-cloud-aiplatform@1.70
google-cloud-firestore@2.19
google-cloud-secret-manager@2.21
vertexai@1.70
firebase-admin@6.6
python-multipart           — file uploads (QR, audio)
httpx                      — async URL pre-fetching
pillow                     — QR image decode
```

### Justification

**FastAPI** is the correct backend choice for ScamSentinel in 2026 for the following reasons:

**1. You have direct LexiLens experience with this exact stack.** The FastAPI + Cloud Run + WebSocket pattern is already proven from your LexiLens project. Using a different backend (Express/Node, Django, Flask) introduces risk during a 48-hour build window with no benefit.

**2. Native async for concurrent agent calls.** FastAPI's async/await model means the three sub-agent calls (Scam Intel, Risk Scoring, Response) can run concurrently rather than sequentially. A synchronous framework like Flask would block on each Vertex AI API call, pushing total latency to 9+ seconds. With FastAPI's async endpoints, concurrent calls bring this to ~3 seconds.

**3. Pydantic v2 for input validation.** All five input types from the `/scan` endpoint are validated and normalised by Pydantic models before reaching the agent layer. This eliminates a whole class of runtime errors and produces clean error messages for the frontend.

**4. Python 3.12 for Google Cloud SDK compatibility.** All Google Cloud client libraries (Vertex AI, Firestore, Secret Manager) have first-class Python support. The SDK is maintained by Google; it is always current and has the best examples.

**Python 3.12 specifically** (not 3.11 or 3.13) because:
- 3.12 is the current Google Cloud Run recommended runtime
- google-cloud-aiplatform 1.70 is tested against 3.12
- 3.12's improved asyncio performance reduces context switching overhead in concurrent agent calls

### API route structure

```
POST  /api/v1/scan          — unified threat scan (all 5 input types)
POST  /api/v1/intercept     — transaction recipient screening
GET   /api/v1/feed          — paginated community feed (fallback)
POST  /api/v1/report        — manual PDRM report submission
GET   /api/v1/health        — Cloud Run health check endpoint
WS    /api/v1/ws/voice      — WebSocket endpoint for live voice analysis
```

### Project structure

```
src/
  main.py                   — FastAPI app, router registration, lifespan handler
  config.py                 — settings loaded from environment (Secret Manager)
  agents/
    orchestrator.py         — Vertex AI Agent Builder client wrapper
    scam_intel.py           — RAG retrieval agent
    risk_scoring.py         — Gemini chain-of-thought agent
    response.py             — Genkit action flow trigger
  rag/
    indexer.py              — corpus document loader + Vertex AI Search index
    retriever.py            — semantic query + passage retrieval
  models/
    scan.py                 — Pydantic models for scan request/response
    intercept.py            — Pydantic models for intercept request/response
    verdict.py              — shared verdict schema
  utils/
    url_resolver.py         — URL unshortening + DOM fetch
    qr_decoder.py           — Pillow-based QR decode
    anonymiser.py           — PII stripping for community push
  db/
    firestore.py            — Firestore client singleton
    community.py            — community KB read/write operations
Dockerfile
requirements.txt
.env.example
```

### Why not Node.js/Express?

The entire Google Cloud AI SDK ecosystem is Python-first. Vertex AI's Agent Builder, Genkit (which has a Python SDK), and all official Google AI code samples are Python. Using Node.js would mean translating every example and fighting SDK version mismatches. No justification for that overhead.

### Why not Django?

Django's ORM, admin panel, and synchronous architecture are designed for database-heavy web applications. ScamSentinel's backend does almost no direct database work — it orchestrates API calls. Django's overhead is unnecessary and its synchronous default would hurt agent call concurrency.

---

## 4. AI & Agent Layer

### Choice: Vertex AI Agent Builder + Firebase Genkit + Gemini 2.5

```
google-cloud-aiplatform[agent_builder]@1.70
firebase-genkit@0.9           — Python SDK
google-generativeai@0.8       — Gemini Developer API (fallback)
```

### Model selection

| Role | Model | Why |
|------|-------|-----|
| Risk Scoring Agent | Gemini 2.5 Flash | 10 RPM free tier, best speed/accuracy balance for chain-of-thought reasoning on structured threat data |
| Voice transcription | Gemini 2.5 Flash Live | Real-time audio streaming via WebSocket, same model family for consistent behaviour |
| Scam Intel RAG retrieval | Vertex AI Search | Purpose-built semantic retrieval, not a general LLM task |
| Complex ambiguous inputs | Gemini 2.5 Pro | 5 RPM / 100 RPD — reserved for cases where Flash returns confidence < 40% on an unclear input |

> **Note on Gemini versioning:** Gemini 2.0 Flash was deprecated in February 2026 and retired March 3, 2026. All references to "Gemini 2.0" in the hackathon handbook should be interpreted as Gemini 2.5 (the current equivalent). Gemini 3 Pro (Antigravity's internal model) requires paid Vertex AI — unlock with GCP credits.

### Vertex AI Agent Builder

The Orchestrator is built on Vertex AI Agent Builder's Agent Engine. It:
- Maintains session state across multi-turn interactions
- Dispatches sub-agent calls in parallel (asyncio.gather)
- Handles retry logic and fallback on Gemini 429 errors
- Stores session context in Agent Engine's built-in memory (enabled November 2025)

**Why Agent Builder over building agents from scratch?**

For a hackathon, Agent Builder's no-code agent designer eliminates the scaffolding work of building a reasoning loop, tool dispatcher, and memory manager from scratch. The trade-off is less flexibility — but ScamSentinel's agent logic is well within Agent Builder's capability. Custom code agents belong in the v2 roadmap when the reasoning requirements outgrow the no-code builder.

### Firebase Genkit (Python)

Genkit orchestrates the Response Agent's action flow — the sequence of steps that follow a verdict:

```python
@flow
async def response_flow(verdict: Verdict) -> ResponseResult:
    if verdict.tier == "HIGH":
        await asyncio.gather(
            render_alert(verdict),
            push_to_community_kb(verdict),
            generate_pdrm_report(verdict),
            send_fcm_notification(verdict)
        )
    elif verdict.tier == "MEDIUM":
        await render_warning_card(verdict)
    else:
        await render_clear_card(verdict)
```

Genkit's flow abstraction makes this sequence testable, observable (flow traces visible in the Genkit Dev UI), and reusable across input types.

### RAG pipeline (Vertex AI Search)

```
Corpus documents (Cloud Storage)
         │
         ▼
Vertex AI Search — index with chunking + embedding
         │
         ▼
Semantic query from Risk Scoring Agent
         │
         ▼
Top-5 passages returned with source document ID
         │
         ▼
Included in Gemini system prompt as grounding context
```

**Why Vertex AI Search over a custom vector database (Pinecone, Weaviate)?**

1. Managed — no infrastructure to maintain during a hackathon
2. 10,000 free queries/month — sufficient for demo and early growth
3. Native Google Cloud integration — no cross-cloud authentication complexity
4. Supports both semantic search and keyword fallback in one call

---

## 5. Authentication

### Choice: Firebase Authentication

```
firebase-admin@6.6           — backend SDK
firebase@11                  — client SDK
```

### Justification

Firebase Authentication handles user identity for the ScamSentinel citizen interface with zero backend auth code. The community KB write permission is gated by Firebase Auth — only authenticated users can push reports. The analytics feed is public read.

**Anonymous authentication** is enabled as the default flow. Citizens do not need to create an account to scan — they get an anonymous Firebase UID that persists their session. This removes the sign-up friction that would reduce demo engagement. Users who want to receive FCM notifications or submit PDRM reports are prompted to link an email or Google account.

**Why Firebase Auth over Supabase Auth, Auth0, or custom JWT?**

- Firebase Auth is already in the stack for Firestore and FCM — no additional service to manage
- Anonymous auth → linked account upgrade is a Firebase Auth first-class feature with one SDK call
- The Firebase Admin SDK on the backend validates ID tokens with a single `firebase_admin.auth.verify_id_token()` call — no custom middleware needed

**Auth flow:**

```
User opens app
    │
    ▼
Firebase Anonymous Auth (auto)
    │
    ▼
User scans / intercepts (no sign-in required)
    │
    ▼
[Optional] Link Google/email account
    │  — required for FCM alerts
    │  — required for PDRM report submission
    ▼
Firebase ID token sent with all API requests
(Authorization: Bearer <token>)
    │
    ▼
FastAPI middleware validates token via firebase_admin
```

---

## 6. Database & Storage

### Choice: Firestore (Native mode) + GCP Cloud Storage

```
google-cloud-firestore@2.19
google-cloud-storage@2.19
```

### Firestore — Justification

**Always-free tier:** 50,000 reads/day, 20,000 writes/day, 1 GiB storage. ScamSentinel's MVP traffic will use less than 1% of this.

**Real-time listeners** are the key capability. Firestore's `onSnapshot` enables the analytics feed's cross-tab live update without a WebSocket server or polling loop. This is the demo's most visually compelling moment and it comes for free with Firestore.

**Schema design:**

```
/scans/{scanId}
  input_type: string
  raw_content: string (truncated/hashed for PII)
  verdict: { tier, score, explanation, reasoning_trace }
  created_at: timestamp
  user_id: string (anonymous Firebase UID)

/community_kb/{reportId}
  threat_type: string
  threat_indicators: string[]  — phone numbers, URLs, account numbers (no PII)
  region: string
  risk_score: number
  source_scan_id: string
  created_at: timestamp

/mule_accounts/{accountId}
  identifier: string           — normalised account/phone/ewallet ID
  identifier_type: string      — "bank_account" | "phone" | "ewallet"
  report_count: number
  first_seen: timestamp
  last_seen: timestamp
  source_report_ids: string[]

/intercept_logs/{logId}
  identifier_queried: string (hashed)
  verdict: string
  confidence: number
  matched_report_id: string | null
  created_at: timestamp
  user_id: string
```

**Security rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Community KB — authenticated write, public read
    match /community_kb/{doc} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid != null;
    }
    // Scan logs — owner only
    match /scans/{doc} {
      allow read, write: if request.auth != null
                         && request.auth.uid == resource.data.user_id;
    }
    // Mule account index — service account write, public read
    match /mule_accounts/{doc} {
      allow read: if true;
      allow write: if false; // service account only via Admin SDK
    }
  }
}
```

### GCP Cloud Storage — Justification

**Why GCP Cloud Storage instead of Firebase Storage?**

Firebase Storage now requires the Blaze (pay-as-you-go) plan to provision new buckets. GCP Cloud Storage's always-free tier provides 5 GB at no cost and integrates directly with Vertex AI Search for corpus indexing. Use `gs://scamsentinel-corpus` as the bucket for all RAG documents.

**Corpus organisation:**

```
gs://scamsentinel-corpus/
  pdrm/
    commercial_crime_reports/   — PDRM public reports (PDF/JSON)
  bnm/
    fraud_advisories/           — BNM MO alerts and advisories
  mcmc/
    scam_bulletins/             — MCMC public scam alerts
  community/
    confirmed_reports/          — Auto-pushed HIGH-risk anonymised reports
```

---

## 7. Deployment & Infrastructure

### Choice: Cloud Run + GitHub Actions + Artifact Registry

```
Google Cloud Run (asia-southeast1)
Google Artifact Registry (asia-southeast1)
GitHub Actions
Docker (python:3.12-slim base image)
```

### Cloud Run — Justification

**Scale-to-zero:** The container scales down to zero instances when idle. For a hackathon project that gets used intermittently, this means zero cost during development downtime. The first request cold-starts a new container (~2 seconds for a Python FastAPI app), which is acceptable for demo use.

**No infrastructure management:** No Kubernetes, no VM sizing, no load balancer configuration. `gcloud run deploy` is one command. This is the correct operational model for a 2-day hackathon build.

**Region `asia-southeast1` (Singapore):** Closest Google Cloud region to Malaysia. Minimises API call latency to Vertex AI, Firestore, and Secret Manager — all of which are also in the same region. Co-locating all services in one region eliminates cross-region data transfer costs (which are not free).

**Dockerfile:**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
```

> Use `--workers 1` on Cloud Run — multiple workers on a single Cloud Run instance compete for the same CPU allocation and can cause OOM errors. Cloud Run handles concurrency through multiple instances, not multiple workers per instance.

### GitHub Actions CI/CD — Justification

**Free for public repos** (unlimited minutes). The workflow runs automatically on every push to `main`, ensuring the deployed URL is always current.

**Workflow: `.github/workflows/deploy.yml`**

```yaml
name: Deploy ScamSentinel MY

on:
  push:
    branches: [main]

env:
  PROJECT_ID: scamsentinel-my
  REGION: asia-southeast1
  REPOSITORY: scamsentinel-repo
  IMAGE: scamsentinel-api
  SERVICE: scamsentinel-api

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest src/tests/ -v

  deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Build and push Docker image
        run: |
          gcloud builds submit \
            --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE:$GITHUB_SHA

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy $SERVICE \
            --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE:$GITHUB_SHA \
            --region $REGION \
            --platform managed \
            --allow-unauthenticated \
            --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
            --set-secrets="FIREBASE_SA=firebase-service-account:latest" \
            --set-secrets="VERTEX_SA=vertex-service-account:latest" \
            --set-env-vars="GCP_PROJECT=$PROJECT_ID,REGION=$REGION" \
            --min-instances=0 \
            --max-instances=3 \
            --memory=1Gi \
            --cpu=1
```

### Secret Manager setup

| Secret name | Contents | Free tier impact |
|------------|---------|-----------------|
| `gemini-api-key` | Gemini Developer API key | 1 of 6 free versions |
| `firebase-service-account` | Firebase Admin SDK JSON | 1 of 6 free versions |
| `vertex-service-account` | Vertex AI service account JSON | 1 of 6 free versions |
| `vertex-search-id` | Vertex AI Search data store ID | 1 of 6 free versions |
| `firestore-project-id` | GCP project ID | 1 of 6 free versions |

5 secrets total — within the 6-version always-free limit. Cache all secrets in memory at app startup — do not re-fetch on every request (would exhaust the 10,000 free access operations/month).

---

## 8. Development Environment

### Choice: Google Antigravity IDE

**Primary IDE for the hackathon build.** Use the Mission Controller (Manager Surface) to issue high-level directives and let agents scaffold:

```
Antigravity directive examples:

"Scaffold a FastAPI project with routes for /scan, /intercept, 
/feed, and /health. Add Pydantic models for each. Include a 
Dockerfile using python:3.12-slim. Add a .env.example with 
placeholders for GEMINI_API_KEY, FIREBASE_SA, and VERTEX_SA."

"Wire the Vertex AI Agent Builder client to the /scan endpoint. 
The orchestrator should call three sub-agents in parallel: 
scam_intel (RAG retrieval), risk_scoring (Gemini chain-of-thought), 
and response (Genkit flow). Return a verdict JSON."

"Write pytest tests for the /intercept endpoint covering: 
exact mule account match, no match (CLEAR), invalid input format, 
and missing required fields."
```

**Antigravity Agent Engine** handles the boilerplate, runs the tests, and presents screenshots of the running app. You review Artifacts, leave feedback on anything that needs adjustment, and continue building at the architecture level.

**Local development fallback:**

```bash
# Run FastAPI locally
uvicorn src.main:app --reload --port 8080

# Run Vite dev server
cd frontend && npm run dev

# Run tests
pytest src/tests/ -v --tb=short
```

---

## 9. Monitoring & Observability

### Cloud Run built-in logging

All `print()` and Python `logging` output from FastAPI is automatically captured in **Cloud Logging** with no configuration. During the demo, open the Cloud Run logs panel in the GCP console to show judges the live request flow — this doubles as proof that the backend is receiving and processing scans in real time.

### Firestore audit trail

Every scan request writes a reasoning trace document to Firestore. During judging, open the Firestore console to show the audit log — demonstrating explainable AI and data persistence. This is a significant judging differentiator.

### Genkit Dev UI (local only)

```bash
genkit start
```

The Genkit Dev UI runs locally at `http://localhost:4000` and shows the full execution trace of every Genkit flow — inputs, outputs, sub-steps, latency per step. Use this during development to debug the Response Agent flow. Do not expose in production.

---

## 10. Dependency Map

```
React 19 (frontend)
    └── firebase@11 (Firestore onSnapshot, FCM, Auth)
    └── chart.js@4 (trend chart)
    └── FastAPI /api/v1/* (scan, intercept, feed)

FastAPI (backend)
    └── Vertex AI Agent Builder (orchestrator)
         ├── Scam Intel Agent → Vertex AI Search (RAG)
         ├── Risk Scoring Agent → Gemini 2.5 Flash/Pro
         └── Response Agent → Firebase Genkit
              ├── Firestore (community KB write)
              └── FCM (push notification)
    └── Secret Manager (startup: all credentials)
    └── Firestore Admin SDK (scan logs, mule index)
    └── Cloud Storage (corpus documents)

Deployment
    └── Docker image → Artifact Registry → Cloud Run
    └── GitHub Actions (build trigger on push to main)
```

---

## 11. Cost Profile

### Hackathon period (MVP, ~30 days)

| Service | Est. usage | Cost |
|---------|-----------|------|
| Cloud Run | ~500 demo requests | Free (within 2M/month) |
| Gemini 2.5 Flash | ~200 scan requests | Free (within 250 RPD) |
| Gemini 2.5 Pro | ~20 complex scans | Free (within 100 RPD) |
| Vertex AI Agent Builder | ~200 agent sessions | ~$0.50 (covered by GCP credits) |
| Vertex AI Search | ~200 RAG queries | Free (within 10K/month) |
| Firestore | ~1,000 reads/writes | Free (within 50K reads/day) |
| Secret Manager | 5 secrets, ~50 reads | Free (within 10K ops/month) |
| Artifact Registry | 1 image, ~300 MB | Free (within 500 MB/month) |
| Cloud Storage | ~50 MB corpus | Free (within 5 GB) |
| FCM | ~50 notifications | Free (always free) |
| GitHub Actions | ~20 workflow runs | Free (public repo) |
| **Total estimated cost** | | **~$0–2 (covered by GCP credits)** |

### Post-hackathon (1,000 users/month)

| Service | Est. usage | Monthly cost |
|---------|-----------|-------------|
| Cloud Run | 30,000 requests | ~$3 |
| Gemini 2.5 Flash | 30,000 requests (paid tier) | ~$15–30 |
| Vertex AI Agent Builder | 30,000 agent sessions | ~$15 |
| Vertex AI Search | 30,000 RAG queries | ~$0 (within free tier) |
| Firestore | 300,000 reads/writes | ~$5 |
| **Total (1K users)** | | **~$38–53/month** |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | April 2026 | Initial stack document for hackathon MVP submission |

---

*Tech stack maintained by ScamSentinel MY team.*  
*Aligned with PRD_ScamSentinel_MY v1.0.*  
*For queries: myaifuturehackathon@gmail.com*
