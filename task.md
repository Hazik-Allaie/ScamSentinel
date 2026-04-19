# ScamSentinel MY — Project Todo List

**Deadline:** 21 April 2026 at 11:59 PM  
**Track:** Project 2030 — Track 5: Secure Digital (FinTech & Security)  
**Source docs:** PRD v1.0 · TechStack v1.0 · AGENTS v1.0  

> [!IMPORTANT]
> Each task is **atomic** — one deliverable per task.  
> Tasks are **sequentially ordered** — complete top-to-bottom, no skipping.  
> A task may only begin after all preceding tasks are done.

---

## Phase 1 — GCP Project & Infrastructure Setup

- [x] **1.1** Create GCP project `scamsentinel-my` and enable billing with available credits
- [x] **1.2** Enable required GCP APIs: Cloud Run, Artifact Registry, Secret Manager, Firestore, Cloud Storage, Vertex AI, Discovery Engine (Vertex AI Search)
- [x] **1.3** Set default region to `asia-southeast1` for all services (`gcloud config set compute/region asia-southeast1`)
- [x] **1.4** Create Artifact Registry Docker repository `scamsentinel-repo` in `asia-southeast1`
- [x] **1.5** Create Cloud Storage bucket `gs://scamsentinel-corpus` in `asia-southeast1` with standard storage class
- [x] **1.6** Create Firestore database in **Native mode** in `asia-southeast1`
- [x] **1.7** Create Firebase project linked to the GCP project; enable Anonymous Authentication
- [x] **1.8** Generate Firebase Admin SDK service account JSON key and store in Secret Manager as `firebase-service-account`
- [x] **1.9** Generate Gemini Developer API key and store in Secret Manager as `gemini-api-key`
- [x] **1.10** Create Vertex AI service account and store JSON key in Secret Manager as `vertex-service-account`
- [x] **1.11** Store GCP project ID in Secret Manager as `firestore-project-id`

---

## Phase 2 — Repository & Backend Scaffolding

- [x] **2.1** Initialise Git repository with `.gitignore` (Python, Node, `.env`, `__pycache__`, `node_modules`, `dist/`)
- [x] **2.2** Create backend directory structure:
  ```
  src/
    agents/
    rag/
    models/
    utils/
    db/
    tests/
  ```
- [x] **2.3** Create `requirements.txt` with all backend dependencies
- [x] **2.4** Create `.env.example` with placeholder environment variables (`GEMINI_API_KEY`, `FIREBASE_SA_PATH`, `GCP_PROJECT`, `REGION`, `VERTEX_SEARCH_DATASTORE_ID`)
- [x] **2.5** Create `src/config.py` — load settings from environment variables / Secret Manager, including retry/timeout constants (`GEMINI_MAX_RETRIES`, `GEMINI_RETRY_DELAY_SECONDS`, `VERTEX_SEARCH_TIMEOUT_SECONDS`, `AGENT_PIPELINE_TIMEOUT_SECONDS`)
- [x] **2.6** Create `Dockerfile` using `python:3.12-slim` base image, `COPY requirements.txt`, `pip install`, `COPY src/`, expose port 8080, `CMD uvicorn src.main:app --host 0.0.0.0 --port 8080 --workers 1`:

---

## Phase 3 — Shared Pydantic Schemas

- [x] **3.1** Create `src/models/__init__.py`
- [x] **3.2** Create `src/models/verdict.py` — define all shared schemas exactly as specified in AGENTS.md §2:
  - `ThreatType` enum (8 values)
  - `RiskTier` enum (HIGH / MEDIUM / LOW)
  - `RAGPassage` model
  - `Verdict` model
  - `ScanRequest` model
  - `ScanResponse` model
  - `InterceptRequest` model
  - `InterceptVerdict` model

---

## Phase 4 — Database Layer

- [x] **4.1** Create `src/db/__init__.py`
- [x] **4.2** Create `src/db/firestore.py` — Firestore client singleton (`init_firestore()`, `get_db()`), and `write_scan_log()` function that writes scan_id, request summary, and full verdict + reasoning trace to `/scans/{scanId}`
- [x] **4.3** Create `src/db/community.py`:
  - `get_community_feed(limit, threat_type, region)` — paginated query on `/community_kb` collection with optional filters
  - `check_mule_account(identifier, identifier_type)` — exact match lookup on `/mule_accounts` collection, return BLOCK or CLEAR verdict with confidence
- [x] **4.4** Deploy Firestore security rules (community_kb: public read / authenticated write; scans: owner-only read/write; mule_accounts: public read / service-account-only write)

---

## Phase 5 — Backend Utility Modules

- [x] **5.1** Create `src/utils/__init__.py`
- [x] **5.2** Create `src/utils/url_resolver.py` — async URL unshortener using `httpx` that follows ≥3 redirect hops, returns final URL + basic DOM content via `httpx.get`
- [x] **5.3** Create `src/utils/qr_decoder.py` — decode QR code from uploaded image bytes using `Pillow` + `pyzbar` (or `qreader`), support standard QR and DuitNow QR format, return decoded string (URL or payment payload)
- [x] **5.4** Create `src/utils/anonymiser.py` — PII stripping function that removes phone numbers, IC numbers, names, addresses from a string using regex; used before storing reasoning_trace and community KB entries

---

## Phase 6 — Agent Layer (Bottom-Up)

### 6A — Scam Intel Agent (RAG Retrieval)

- [x] **6.1** Create `src/agents/__init__.py`
- [x] **6.2** Create `src/agents/scam_intel.py` — implement `retrieve_scam_patterns(query, top_k)` using `discoveryengine_v1.SearchServiceClient`, query the Vertex AI Search data store, return `list[RAGPassage]` with source attribution (pdrm / bnm / mcmc / community)
- [x] **6.3** Implement `format_rag_context(passages)` in `scam_intel.py` — format RAG passages into labelled structured string for Gemini user message context

### 6B — Risk Scoring Agent (Gemini Chain-of-Thought)

- [x] **6.4** Create `src/agents/risk_scoring.py` — define `RISK_SCORING_SYSTEM_PROMPT` exactly as specified in AGENTS.md §5 (5-step chain-of-thought, JSON output schema, responsible AI constraints)
- [x] **6.5** Implement `score_risk(payload, rag_context)` — call Gemini 2.5 Flash with `response_mime_type="application/json"`, temperature 0.1; parse JSON response into `Verdict` object
- [x] **6.6** Implement Pro fallback in `score_risk()` — if Flash confidence < 0.5, re-call with `gemini-2.5-pro-latest`
- [x] **6.7** Implement `_call_gemini(system_prompt, user_message, model)` helper — handles Gemini API call, JSON parsing, markdown fence stripping

### 6C — Response Agent (Genkit Flow)

- [x] **6.8** Create `src/agents/response.py` — implement `execute_response_flow(verdict, scan_id, user_id)` with tier-based branching (HIGH → parallel community push + PDRM report + FCM; MEDIUM → log only; LOW → no action)
- [x] **6.9** Implement `_push_to_community_kb(verdict, scan_id)` — anonymise and write to Firestore `/community_kb` collection; never store raw_content or user_id
- [x] **6.10** Implement `_extract_threat_indicators(verdict)` — extract anonymised threat indicators (cited source IDs, threat type tag, score tag) for community KB entries
- [x] **6.11** Implement `_generate_pdrm_report(verdict, scan_id)` — generate pre-filled PDRM Aduan template dict mapping ScamSentinel fields to actual polis.gov.my form fields (jenis_kes, penerangan_kes, tarikh_kejadian, masa_kejadian, maklumat_tambahan, portal_url, nsrc_hotline)
- [x] **6.12** Implement `_send_fcm_alert(verdict, user_id)` — send Firebase Cloud Messaging push notification for HIGH-risk verdicts; gracefully skip if user has no FCM token
- [x] **6.13** Implement `_log_medium_risk(verdict, scan_id)` — write MEDIUM-risk verdicts to `/medium_risk_log` collection for internal analytics

### 6D — Error Handling & Fallbacks

- [x] **6.14** Create `src/agents/fallbacks.py`:
  - `gemini_rate_limit_fallback(error)` — return safe MEDIUM verdict (score 50, confidence 0.0) on 429 errors
  - `vertex_search_unavailable_fallback()` — return empty passage list
  - `community_push_failure_handler(error, scan_id)` — log failed pushes to `/failed_community_pushes` for retry

### 6E — Voice Agent (Gemini Live WebSocket)

- [x] **6.15** Create `src/agents/voice_agent.py` — define `VOICE_SYSTEM_PROMPT` for real-time transcription (Malaysian-accented English, BM, Mandarin, Tamil)
- [x] **6.16** Implement `handle_voice_websocket(websocket, user_id)` — accept WebSocket connection, create Gemini Live session (`gemini-2.5-flash-live-001`), run concurrent send_audio/receive_transcription tasks
- [x] **6.17** Implement `_extract_entities_from_transcript(transcript)` — regex-based extraction of phone numbers (01X format), URLs, account numbers from transcript text

### 6F — Orchestrator

- [x] **6.18** Create `src/agents/orchestrator.py` — implement `run_orchestrator(request)` as the main scan pipeline entry point
- [x] **6.19** Implement `_build_rag_query(request)` — convert normalised `ScanRequest` into enriched semantic search query (truncate to 1000 chars, append extracted entities)
- [x] **6.20** Wire parallel dispatch in `run_orchestrator()` — `asyncio.gather(retrieve_scam_patterns, score_risk)`, re-score with RAG context if initial confidence < 0.6, write audit log, execute response flow, return `ScanResponse`

### 6G — Agent Builder Tool Registration

- [x] **6.21** Create `src/agents/tools.py` — define `get_tools()` returning wrapped tool functions (`retrieve_scam_patterns_tool`, `score_risk_tool`, `execute_response_tool`) for Vertex AI Agent Builder registration
- [x] **6.22** Create `src/agents/orchestrator_config.yaml` — Agent Builder configuration (display_name, model, region, instructions, tool definitions, memory settings, safety settings) as specified in AGENTS.md §3

---

## Phase 7 — FastAPI Application & API Routes

- [x] **7.1** Create `src/main.py` — FastAPI app with lifespan handler (init Firebase Admin, init Firestore at startup), CORS middleware (allow all origins for MVP)
- [x] **7.2** Implement `verify_firebase_token()` dependency — validate Firebase ID token from `Authorization: Bearer` header; return uid or "anonymous"
- [x] **7.3** Implement `GET /api/v1/health` — return `{"status": "ok", "service": "ScamSentinel MY", "version": "1.0.0"}`
- [x] **7.4** Implement `POST /api/v1/scan` — accept `ScanRequest`, inject user_id, call `run_orchestrator()` with `asyncio.wait_for(timeout)`, handle timeout (504) and rate-limit (429 fallback) errors
- [x] **7.5** Implement `POST /api/v1/intercept` — accept `InterceptRequest`, call `check_mule_account()`, return `InterceptVerdict` with processing_ms
- [x] **7.6** Implement `GET /api/v1/feed` — accept query params (limit, threat_type, region), call `get_community_feed()`, return paginated results
- [x] **7.7** Implement `WS /api/v1/ws/voice` — accept WebSocket with optional token query param, verify token, call `handle_voice_websocket()`
- [x] **7.8** Verify backend starts locally with `uvicorn src.main:app --reload --port 8080` and `/health` returns 200

---

## Phase 8 — RAG Corpus Seeding

- [x] **8.1** Create corpus directory structure in Cloud Storage bucket:
  ```
  gs://scamsentinel-corpus/
    pdrm/commercial_crime_reports/
    bnm/fraud_advisories/
    mcmc/scam_bulletins/
    community/confirmed_reports/
  ```
- [x] **8.2** Collect and upload minimum 10 PDRM public scam reports (PDF/JSON) to `pdrm/` folder
- [x] **8.3** Collect and upload minimum 10 BNM fraud advisories to `bnm/` folder
- [x] **8.4** Collect and upload minimum 10 MCMC scam alert bulletins to `mcmc/` folder
- [x] **8.5** Create Vertex AI Search data store, link to `gs://scamsentinel-corpus`, configure chunking and embedding
- [x] **8.6** Store the Vertex AI Search data store ID in Secret Manager as `vertex-search-id`
- [x] **8.7** Verify RAG retrieval works — run a test query against the data store and confirm relevant passages are returned for at least 4/5 known scam types

---

## Phase 9 — Frontend (React 19 + Vite + Tailwind v4)

### 9A — Frontend Scaffolding

- [ ] **9.1** Scaffold Vite + React 19 project in `frontend/` directory (`npx -y create-vite@latest ./frontend -- --template react`)
- [ ] **9.2** Install frontend dependencies: `tailwindcss@4`, `firebase@11`, `chart.js@4`, `react-chartjs-2`
- [ ] **9.3** Configure Tailwind CSS v4 with `@theme` directive — define design tokens for risk tier colours (HIGH: red, MEDIUM: amber, LOW: green), dark mode palette, typography scale
- [ ] **9.4** Create `src/lib/firebase.js` — Firebase app initialisation (apiKey, authDomain, projectId), anonymous auth auto-sign-in, Firestore client export
- [ ] **9.5** Create `src/lib/api.js` — FastAPI client wrapper (fetch-based) with Firebase ID token injection in `Authorization: Bearer` header; base URL configurable via env var

### 9B — Hooks

- [ ] **9.6** Create `src/hooks/useScan.js` — React 19 async action wrapping `POST /api/v1/scan`; manages pending/error/success state
- [ ] **9.7** Create `src/hooks/useIntercept.js` — React 19 async action wrapping `POST /api/v1/intercept`
- [ ] **9.8** Create `src/hooks/useFeed.js` — Firestore `onSnapshot` real-time listener on `/community_kb` collection with filter params (threat_type, region)

### 9C — Components

- [ ] **9.9** Create `ScanInput.jsx` — unified five-mode input component with tab selector (SMS/Text, URL, QR Code, Voice, Payment Link); handles text paste, file upload (QR image, audio), and WebSocket connection (voice)
- [ ] **9.10** Create `VerdictCard.jsx` — risk verdict display component with tier-based styling:
  - HIGH: full-screen red blocking alert with risk score and explanation
  - MEDIUM: amber warning card with report option
  - LOW: green clear card with confidence percentage
  - All tiers show cited sources and reasoning summary
- [ ] **9.11** Create `InterceptForm.jsx` — transaction intercept UI: input field for account number / phone / e-wallet ID, type selector, submit button, BLOCK/CLEAR result display
- [ ] **9.12** Create `PdrmReport.jsx` — pre-filled PDRM report generator component; renders the report template from the scan response, allows user to fill personal fields, provides download-as-PDF and portal-link buttons
- [ ] **9.13** Create `AnalyticsFeed.jsx` — real-time community feed component:
  - List of anonymised scam reports (threat type, region, risk score, timestamp, indicators)
  - Filter dropdowns for scam type and Malaysian state
  - 7-day trend chart using Chart.js
  - Firestore real-time updates via `useFeed` hook
- [ ] **9.14** Create voice recording UI within `ScanInput.jsx` — microphone button, audio level visualiser, real-time transcript display, stop button that triggers scan

### 9D — Pages & Routing

- [ ] **9.15** Create `src/pages/Scan.jsx` — main scan page composing `ScanInput` + `VerdictCard` + conditional `PdrmReport`
- [ ] **9.16** Create `src/pages/Intercept.jsx` — transaction intercept page composing `InterceptForm`
- [ ] **9.17** Create `src/pages/Feed.jsx` — analytics feed page composing `AnalyticsFeed`
- [ ] **9.18** Create `src/App.jsx` — root app with navigation bar (Scan / Intercept / Feed tabs), responsive layout, dark mode support
- [ ] **9.19** Add client-side routing (React Router or simple state-based tab switching) between Scan, Intercept, and Feed pages

### 9E — UI Polish & Accessibility

- [ ] **9.20** Implement high-contrast colour scheme for risk tiers — not colour-only (add icons + text labels for each tier)
- [ ] **9.21** Set minimum 16px body text throughout; use Google Font (Inter or Outfit)
- [ ] **9.22** Add screen reader compatible `aria-live` announcements for HIGH-risk verdict alerts
- [ ] **9.23** Ensure mobile-first responsive layout across all pages (test at 375px, 768px, 1024px breakpoints)
- [ ] **9.24** Add micro-animations: verdict card entrance, scan loading spinner, feed item slide-in, risk score counter animation
- [ ] **9.25** Verify frontend runs locally with `npm run dev` and all pages render correctly

---

## Phase 10 — Deployment Pipeline

### 10A — Backend Deployment

- [ ] **10.1** Build Docker image locally and verify it starts: `docker build -t scamsentinel-api . && docker run -p 8080:8080 scamsentinel-api`
- [ ] **10.2** Push Docker image to Artifact Registry: `gcloud builds submit --tag asia-southeast1-docker.pkg.dev/scamsentinel-my/scamsentinel-repo/scamsentinel-api:v1`
- [ ] **10.3** Deploy backend to Cloud Run with Secret Manager bindings (`--set-secrets` for gemini-api-key, firebase-service-account, vertex-service-account), `--min-instances=0 --max-instances=3 --memory=1Gi --cpu=1 --allow-unauthenticated`
- [ ] **10.4** Verify Cloud Run `/api/v1/health` endpoint returns 200 from the deployed URL

### 10B — Frontend Deployment

- [ ] **10.5** Build frontend production bundle: `npm run build`
- [ ] **10.6** Deploy frontend to hosting (Firebase Hosting, GitHub Pages, or Vercel) — configure API base URL to point to the Cloud Run backend URL
- [ ] **10.7** Verify deployed frontend loads and connects to the backend

### 10C — CI/CD Pipeline

- [ ] **10.8** Create `.github/workflows/deploy.yml` — workflow triggered on push to `main`:
  - Job 1 (`test`): checkout, setup Python 3.12, install deps, run `pytest src/tests/ -v`
  - Job 2 (`deploy`): needs test, authenticate via Workload Identity Federation, `gcloud builds submit`, `gcloud run deploy`
- [ ] **10.9** Configure GitHub repository secrets: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`
- [ ] **10.10** Set up Workload Identity Federation between GitHub Actions and GCP project
- [ ] **10.11** Push to `main` and verify the full CI/CD pipeline runs successfully

---

## Phase 11 — Integration Testing & Verification

- [ ] **11.1** Write `src/tests/test_models.py` — unit tests for all Pydantic schemas (valid inputs, invalid inputs, edge cases for risk_score bounds, tier enum values)
- [ ] **11.2** Write `src/tests/test_scan.py` — integration test for `POST /api/v1/scan` with a known scam SMS text; assert verdict tier is HIGH and response includes PDRM report template
- [ ] **11.3** Write `src/tests/test_intercept.py` — integration test for `POST /api/v1/intercept`:
  - Seed a mule account in Firestore → assert BLOCK verdict with 100% confidence
  - Query a clean identifier → assert CLEAR verdict
  - Test invalid input format → assert 422 error
- [ ] **11.4** Write `src/tests/test_url_resolver.py` — test URL unshortening with a known shortened URL, verify ≥3 redirect hops handled
- [ ] **11.5** Write `src/tests/test_anonymiser.py` — test PII stripping: verify phone numbers, IC numbers, names are removed from sample text
- [ ] **11.6** End-to-end test: paste scam SMS in frontend → verify HIGH verdict card appears within 3 seconds → verify PDRM report template is populated
- [ ] **11.7** End-to-end test: paste clean URL in frontend → verify LOW verdict card with confidence score
- [ ] **11.8** End-to-end test: enter mule account number in intercept form → verify BLOCK verdict with source report
- [ ] **11.9** Cross-tab test: open two browser tabs on Feed page → submit HIGH-risk scan in Tab A → verify feed updates in Tab B within 2 seconds
- [ ] **11.10** Verify Firestore audit log: open Firestore console → confirm reasoning trace is written for every scan request

---

## Phase 12 — Demo Preparation & Submission

- [ ] **12.1** Seed Firestore `/mule_accounts` collection with at least 5 sample mule account records for demo
- [ ] **12.2** Verify Cloud Run URL is accessible without login (judges can test live)
- [ ] **12.3** Write `README.md`:
  - Project description and motivation (RM 2.77B statistic)
  - Architecture diagram
  - Tech stack list
  - Setup instructions (local + cloud)
  - API documentation (all endpoints)
  - AI-generated code disclosure
  - Team member details
- [ ] **12.4** Record demo video (max 3 minutes) covering all demo success criteria:
  - [ ] Scam SMS → HIGH verdict + PDRM report in ≤ 3s
  - [ ] Clean URL → LOW verdict with confidence
  - [ ] Mule account number → BLOCK verdict with source report
  - [ ] Cross-tab live feed update in ≤ 2s
  - [ ] Firestore reasoning trace visible in console
- [ ] **12.5** Final check: ensure all secrets are in Secret Manager (not hardcoded), CORS is correctly configured, and the app remains accessible through 16–17 May 2026 Demo Day
- [ ] **12.6** Submit project (video + live URL + repository link) before 21 April 2026 11:59 PM

---

## Summary

| Phase | Tasks | Description | Status |
|-------|-------|-------------|--------|
| 1 | 1.1 – 1.11 | GCP project & infrastructure | ✅ Done |
| 2 | 2.1 – 2.6 | Repository & backend scaffolding | ✅ Done |
| 3 | 3.1 – 3.2 | Shared Pydantic schemas | ✅ Done |
| 4 | 4.1 – 4.4 | Database layer (Firestore) | ✅ Done |
| 5 | 5.1 – 5.4 | Backend utility modules | ✅ Done |
| 6 | 6.1 – 6.22 | Agent layer (all 5 agents + fallbacks + tools) | ✅ Done |
| 7 | 7.1 – 7.8 | FastAPI app & API routes | ✅ Done |
| 8 | 8.1 – 8.7 | RAG corpus seeding | ✅ Done |
| 9 | 9.1 – 9.25 | Frontend (React 19 + Vite + Tailwind v4) | ⬜ Pending |
| 10 | 10.1 – 10.11 | Deployment pipeline (Docker + Cloud Run + CI/CD) | ⬜ Pending |
| 11 | 11.1 – 11.10 | Integration testing & verification | ⬜ Pending |
| 12 | 12.1 – 12.6 | Demo preparation & submission | ⬜ Pending |
| **Total** | **86 tasks** | **55 done · 31 remaining** | |
