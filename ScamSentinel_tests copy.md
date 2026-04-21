# ScamSentinel MY — Testing Playbook v1.0

> Run all tests before recording demo video.

---

## F1 — Scan API Core

Verify the `/api/v1/scan` endpoint accepts all input types and returns a valid verdict.

### Test 1A — HIGH risk SMS scam

```bash
curl -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "sms_text",
    "raw_content": "URGENT: Your Maybank account has been suspended. Click http://maybank-secure-login.xyz/verify to reactivate within 24 hours or lose access permanently.",
    "extracted_entities": {
      "phone_numbers": [],
      "urls": ["http://maybank-secure-login.xyz/verify"],
      "account_numbers": [],
      "keywords": ["suspended", "urgent", "verify"]
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
  }'
```

**Expected:** `tier: HIGH`, `risk_score >= 75`, `pdrm_report_template` is populated, `threat_type: phishing`

---

### Test 1B — LOW risk legitimate message

```bash
curl -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "sms_text",
    "raw_content": "Hi, your Grab food order #12345 has been picked up and is on the way. Estimated delivery: 20 minutes.",
    "extracted_entities": {
      "phone_numbers": [],
      "urls": [],
      "account_numbers": [],
      "keywords": []
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
  }'
```

**Expected:** `tier: LOW`, `risk_score < 40`

---

### Test 1C — Investment scam SMS

```bash
curl -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "sms_text",
    "raw_content": "Guaranteed 40% monthly return. Join our exclusive investment group. WhatsApp +60123456789 now. Limited slots!",
    "extracted_entities": {
      "phone_numbers": ["+60123456789"],
      "urls": [],
      "account_numbers": [],
      "keywords": ["guaranteed", "return", "investment", "exclusive"]
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
  }'
```

**Expected:** `threat_type: investment_scam`

---

### Test 1D — Impersonation scam URL

```bash
curl -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "url",
    "raw_content": "http://maybank-customer-support-malaysia.blogspot.com/login",
    "extracted_entities": {
      "phone_numbers": [],
      "urls": ["http://maybank-customer-support-malaysia.blogspot.com/login"],
      "account_numbers": [],
      "keywords": []
    },
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
  }'
```

**Expected:** `tier: MEDIUM` or `HIGH`. Risk score between 40–85 depending on RAG corpus.

---

### F1 Pass Criteria Checklist

- [ ] Test 1A returns `tier: HIGH` with `pdrm_report_template` populated
- [ ] Test 1B returns `tier: LOW` with `risk_score` below 40
- [ ] Test 1C returns `threat_type: investment_scam`
- [ ] Test 1D returns `threat_type: impersonation`
- [ ] All responses return within 5 seconds
- [ ] All responses contain non-empty `reasoning_trace`

---

## F2 — Risk Scoring Engine

Verify the verdict schema is complete and the reasoning trace is stored in Firestore.

### Test 2A — Verify all verdict fields are present

Run Test 1A from above, then check the response contains every field:

```bash
curl -s -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{ ...Test 1A payload... }' | python3 -c "
import json, sys
r = json.load(sys.stdin)
required = ['verdict_id','risk_score','tier','threat_type','explanation','cited_sources','rag_passages_used','pdrm_report_template','reasoning_trace','processing_ms','created_at']
missing = [f for f in required if f not in r]
print('MISSING:', missing) if missing else print('PASS: All fields present')
"
```

**Expected:** `PASS: All fields present`

---

### Test 2B — Verify Firestore storage

After running Test 1A, check Firestore for the stored verdict:

```bash
python3 -c "
from google.cloud import firestore
db = firestore.Client()
docs = db.collection('scans').order_by('created_at', direction=firestore.Query.DESCENDING).limit(1).stream()
for doc in docs:
    data = doc.to_dict()
    print('verdict_id:', data.get('verdict_id'))
    print('reasoning_trace length:', len(data.get('reasoning_trace', '')))
    print('processing_ms:', data.get('processing_ms'))
    print('created_at:', data.get('created_at'))
"
```

**Fields to verify in Firestore:**
- `verdict_id`
- `risk_score`
- `tier`
- `threat_type`
- `reasoning_trace` (the full chain-of-thought from the AI)
- `created_at` — timestamp

> **This is important for the demo** — open the Firestore console during your demo recording to show judges the audit trail.

---

### Test 2C — Verify tier thresholds

```bash
# Quick threshold verification — paste 3 requests and check tiers
# HIGH threshold test (should score >= 75)
# Use Test 1A payload

# MEDIUM threshold test
curl -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "input_type": "sms_text",
    "raw_content": "Hi, I found your number online. I have a business proposal that could earn you RM5000/month. Interested?",
    "extracted_entities": {"phone_numbers":[],"urls":[],"account_numbers":[],"keywords":["business","proposal","earn"]},
    "metadata": {"source": "test"},
    "user_id": "test-user-001"
  }' | python3 -c "import json,sys; r=json.load(sys.stdin); print('tier:', r['verdict']['tier'], '| score:', r['verdict']['risk_score'])"
```

---

### F2 Pass Criteria Checklist

- [ ] All verdict fields present in response (Test 2A)
- [ ] `processing_ms` is below 5000
- [ ] Firestore `scans` collection contains the reasoning trace (Test 2B)
- [ ] HIGH input scores ≥ 75, LOW input scores < 40 (Test 2C)
- [ ] `explanation` is readable plain English, not technical jargon

---

## F3 — RAG Knowledge Base

Verify that verdicts are grounded in the corpus, not hallucinated.

### Test 3A — Verify `cited_sources` is non-empty for HIGH risk

```bash
curl -s -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{ ...Test 1A payload... }' | python3 -c "
import json, sys
r = json.load(sys.stdin)
v = r['verdict']
print('cited_sources:', v.get('cited_sources'))
print('rag_passages_used count:', len(v.get('rag_passages_used', [])))
for p in v.get('rag_passages_used', []):
    print(' - source:', p.get('source'), '| doc_id:', p.get('doc_id'))
"
```

**Expected:** `cited_sources` is non-empty, `rag_passages_used` has at least 3 passages, each with a `source` field showing "pdrm", "bnm", or "mcmc".

---

### Test 3B — Verify different threat types cite different documents

Run two scans on different threat types and compare `cited_sources` — they should reference different documents:

```bash
# Scan 1: Phishing
SCAN1=$(curl -s -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{"input_type":"sms_text","raw_content":"Your Maybank account is suspended. Click http://maybank-secure.xyz to verify.", ...}')

# Scan 2: Investment scam
SCAN2=$(curl -s -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{"input_type":"sms_text","raw_content":"Guaranteed 40% monthly return. Join our exclusive investment group.", ...}')

echo "Scan 1 sources:" $(echo $SCAN1 | python3 -c "import json,sys; print(json.load(sys.stdin)['verdict']['cited_sources'])")
echo "Scan 2 sources:" $(echo $SCAN2 | python3 -c "import json,sys; print(json.load(sys.stdin)['verdict']['cited_sources'])")
```

**Expected:** The two scans cite different document IDs, proving the RAG is context-sensitive.

---

### F3 Pass Criteria Checklist

- [ ] `cited_sources` is non-empty for all HIGH-risk scans
- [ ] `rag_passages_used` contains at least 3 passages
- [ ] Passage `source` field shows "pdrm", "bnm", or "mcmc" (not "unknown")
- [ ] Different threat types cite different source documents
- [ ] Vertex AI Search datastore has ≥ 30 documents indexed

---

## F4 — Autonomous Response Agent

Test all three tier actions: HIGH alert + PDRM report, MEDIUM warning, LOW clear.

### Test 4A — HIGH tier triggers all three actions

> This test must be run in the **browser**, not curl, to verify the UI behaviour.

1. Open `http://localhost:5173`
2. Paste the Test 1A SMS text into the scan input
3. Select input type "SMS/Text"
4. Click "Scan"

**Verify in the browser:**
- [ ] Full-screen red blocking alert appears (not just a small card)
- [ ] Alert shows risk score as a number (e.g. "87/100")
- [ ] Alert shows `threat_type` in readable format (e.g. "Phishing")
- [ ] Alert shows the `explanation` text from the verdict
- [ ] "Report to PDRM" button is visible and clickable
- [ ] Clicking "Report to PDRM" opens a pre-filled form with `jenis_kes` and `penerangan_kes` populated
- [ ] PDRM hotline number "997" is displayed

**Verify in Firestore:**
- Open Firebase Console → Firestore → `community_kb` collection
- A new document should appear within 2 seconds of the HIGH verdict
- Document should contain `threat_type`, `risk_score`, `tier: "HIGH"`, `threat_indicators`
- Document must NOT contain the original SMS text or any phone numbers (PII check)

---

### Test 4B — MEDIUM tier shows warning card (not full-screen block)

1. In the browser, paste this text:
   > "Hi I am selling my iPhone 14 Pro for RM1500. Very good condition. Interested? WhatsApp me."
2. Scan it
3. **Expected:** Yellow/amber warning card appears — NOT a full-screen block
4. "Report anyway" option is visible
5. No PDRM report is auto-generated (it should only appear if user taps "Report anyway")

---

### Test 4C — LOW tier shows green clear card

1. Paste: `https://www.bnm.gov.my/financial-consumer-alerts`
2. Scan it
3. **Expected:** Green clear card with confidence percentage
4. No PDRM report, no alert, no community push

---

### Test 4D — Community push fires for HIGH but not LOW

```bash
# Check community_kb collection count before test
BEFORE=$(curl -s http://localhost:8080/api/v1/feed | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
echo "Community KB records before: $BEFORE"

# Run HIGH-risk scan
curl -s -X POST http://localhost:8080/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{ ... Test 1A payload with unique content ... }'

sleep 3

# Check count again — should be BEFORE + 1
AFTER=$(curl -s http://localhost:8080/api/v1/feed | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
echo "Community KB records after: $AFTER"
echo "New records added: $((AFTER - BEFORE)) (expected: 1)"
```

---

### F4 Pass Criteria Checklist

- [ ] HIGH scan renders full-screen blocking alert in browser
- [ ] PDRM report template is pre-filled (not blank)
- [ ] PDRM report contains `nsrc_hotline: "997"`
- [ ] MEDIUM scan renders warning card (not full-screen)
- [ ] LOW scan renders green clear card
- [ ] HIGH scan pushes 1 document to `community_kb` in Firestore
- [ ] Community KB document contains NO raw SMS text or user PII

---

## F5 — Transaction Intercept Shield

Test BLOCK for known mule accounts and CLEAR for clean identifiers.

### Setup — Seed a test mule account

First, add a test mule account to Firestore so you have something to test against:

```bash
python3 -c "
from google.cloud import firestore
db = firestore.Client()
db.collection('mule_accounts').document('test-mule-001').set({
    'account_number': '1234567890',
    'bank': 'test_bank',
    'report_id': 'PDRM-TEST-2024-001',
    'confidence': 1.0,
    'added_at': firestore.SERVER_TIMESTAMP
})
print('Test mule account seeded')
"
```

### Test 5A — API check known mule account

```bash
# Check known mule account
curl -s "http://localhost:8080/api/v1/check-account?account_number=1234567890&bank=test_bank" | python3 -c "
import json, sys
r = json.load(sys.stdin)
print('verdict:', r.get('verdict'))
print('confidence:', r.get('confidence'))
print('matched_report_id:', r.get('matched_report_id'))
print('processing_ms:', r.get('processing_ms'))
"
```

**Expected:** `verdict: "BLOCK"`, `confidence: 1.0`

```bash
# Check unknown/clean account
curl -s "http://localhost:8080/api/v1/check-account?account_number=9876543210&bank=test_bank" | python3 -c "
import json, sys
r = json.load(sys.stdin)
print('verdict:', r.get('verdict'))
print('matched_report_id:', r.get('matched_report_id'))
"
```

**Expected:** `verdict: "CLEAR"`, `matched_report_id: null`

---

### Test 5B — Browser UI check

1. Open `http://localhost:5173`
2. Type `1234567890` in the account number field
3. Click "Check Account"
4. **Expected:** Red BLOCK card appears with explanation and report reference
5. Type `9876543210`
6. Click "Check Account"
7. **Expected:** Green CLEAR card with confidence percentage

---

### F5 Pass Criteria Checklist

- [ ] Known mule account returns `verdict: "BLOCK"` with `confidence: 1.0`
- [ ] Unknown account returns `verdict: "CLEAR"` with `matched_report_id: null`
- [ ] Both return within 2 seconds (`processing_ms` < 2000)
- [ ] Phone number format (`0123456789`) accepted without validation error
- [ ] BLOCK card renders in browser UI with red styling
- [ ] CLEAR card renders in browser UI with green styling

---

## F6 — Scam Analytics Feed

This is the most important test for the demo video. Two browser tabs, live update.

### Test 6A — REST feed endpoint works

```bash
curl http://localhost:8080/api/v1/feed
```

**Expected:** JSON array of community KB records. If empty, the Firestore query is working but has no data — run Test 4A first to seed data.

```bash
# With filters
curl "http://localhost:8080/api/v1/feed?threat_type=phishing&limit=5"
curl "http://localhost:8080/api/v1/feed?region=malaysia&limit=10"
```

Both should return filtered results without error.

---

### Test 6B — Real-time Firestore listener (THE DEMO TEST)

> This is the cross-tab live update test. Run this carefully — this is what you record for the demo video.

1. Open Chrome
2. Open Tab A: `http://localhost:5173` (scan page)
3. Open Tab B: `http://localhost:5173/feed` (analytics feed page)
4. Position both tabs side by side (split screen)

**Execute:**
1. On Tab B, observe the current state of the feed (note the latest entry)
2. On Tab A, paste the Test 1A SMS scam text and click Scan
3. Watch Tab B — **a new entry should appear within 1–2 seconds**

**Verify the new feed entry contains:**
- [ ] Correct `threat_type` (phishing)
- [ ] `risk_score` matching the scan verdict
- [ ] `tier: "HIGH"`
- [ ] A timestamp (very recent)
- [ ] NO raw SMS text, NO phone numbers (PII check)

**If the update does not appear:**
1. Check browser console on Tab B for Firestore listener errors
2. Verify Firestore security rules allow public read on `community_kb`
3. Check that `firebase.js` initialises the app correctly
4. Run `db.collection("community_kb").onSnapshot(...)` in browser console to debug

---

### Test 6C — Filter functionality

1. On the feed page, apply filter "Investment Scam"
2. Only entries with `threat_type: investment_scam` should appear
3. Clear filter — all entries should reappear
4. Apply region filter "Malaysia" — all entries should show (since all are tagged "malaysia")

---

### Test 6D — Feed shows no PII

```bash
# Check all community_kb documents for PII
python3 - <<'EOF'
from google.cloud import firestore
import re

db = firestore.Client()
docs = db.collection("community_kb").stream()

pii_found = False
for doc in docs:
    data = doc.to_dict()
    # Check no full phone numbers
    text = str(data)
    phone_pattern = r'\b01[0-9]{8,9}\b'
    if re.search(phone_pattern, text):
        print(f"WARNING: Phone number found in doc {doc.id}")
        pii_found = True
    # Check no IC numbers
    ic_pattern = r'\b\d{6}-\d{2}-\d{4}\b'
    if re.search(ic_pattern, text):
        print(f"WARNING: IC number found in doc {doc.id}")
        pii_found = True

if not pii_found:
    print("PASS: No PII found in community_kb collection")
EOF
```

---

### F6 Pass Criteria Checklist

- [ ] REST `/api/v1/feed` returns JSON array without error
- [ ] Filter by `threat_type` returns only matching records
- [ ] Firestore real-time listener fires within 2 seconds of HIGH scan (Tab B update)
- [ ] Feed entries contain `threat_type`, `risk_score`, `tier`, `created_at`
- [ ] Feed entries contain NO phone numbers, SMS text, or any PII
- [ ] Trend chart renders on the feed page (if implemented)

---

## End-to-End Demo Flow Test

> Run this as your final check before recording the demo video. This is exactly what judges will see.

1. Open browser at `http://localhost:5173`
2. Open second tab at `http://localhost:5173/feed`
3. Position side-by-side
4. In Tab A, paste Test 1A scam SMS → click Scan
5. Verify: Full-screen HIGH alert appears with risk score, explanation, PDRM button
6. Click "Report to PDRM" → verify pre-filled form with hotline 997
7. Watch Tab B → new feed entry appears within 2 seconds
8. In Tab A, paste Test 1B legitimate message → click Scan
9. Verify: Green LOW card appears, no alert, no community push
10. Navigate to account check → enter `1234567890` → verify BLOCK card
11. Enter `9876543210` → verify CLEAR card

---

## Common Issues & Fixes

### Issue: Response agent not generating PDRM report
**Cause:** `pdrm_report_template` key missing from verdict schema.  
**Fix:** Check that the response agent reads `threat_type` and `risk_score` from the verdict and maps them to `jenis_kes` field in the PDRM template.

```bash
# Check Cloud Run logs for response agent errors
gcloud run services logs read scamsentinel-api \
  --region=asia-southeast1 \
  --limit=50 \
  | grep "pdrm\|response_flow\|ERROR"
```

### Issue: Community KB push stores raw SMS content (PII leak)
**Cause:** `_extract_threat_indicators` function is not properly anonymising.  
**Fix:** Never store `request.raw_content` in `community_kb`. Only store:
- `threat_type`
- `risk_score`
- `tier`
- `cited_sources`
- `threat_indicators` (structural patterns only, not raw content)

---

## Submission Verification Checklist

Run through this in order before submitting.

### Code quality (15 marks)

- [ ] No API keys in source code — grep check:
  ```bash
  grep -r "AIza\|ya29\|eyJ" src/ frontend/src/
  # Should return nothing
  ```
- [ ] `.env.example` has all variable names with placeholder values (not real keys)
- [ ] `README.md` exists and has setup instructions, feature list, tech stack, architecture overview
- [ ] AI-generated code is disclosed in README
- [ ] `requirements.txt` is up to date:
  ```bash
  pip freeze > requirements.txt
  ```

### Deployment (for judges to access live)

- [ ] Cloud Run URL is live and accessible without login
- [ ] `GET https://your-cloud-run-url/api/v1/health` returns 200
- [ ] Frontend is deployed (GitHub Pages, Firebase Hosting, or Vercel)
- [ ] Frontend can reach the Cloud Run backend (no CORS errors in browser console)

### Submission package (per handbook)

- [ ] GitHub repository is PUBLIC
- [ ] README has setup instructions and architectural overview
- [ ] Video demo is uploaded to YouTube or Google Drive (public/unlisted), max 3 minutes
- [ ] Google Slides deck is ready (max 15 slides, covers problem / solution / tech stack / impact / business model)
- [ ] Live app URL is accessible without login (or test credentials provided)
- [ ] Submission form filled at the Google Forms link before **21 April 2026 11:59 PM**

---

*Testing playbook v1.0 — ScamSentinel MY*  
*Run all tests before recording demo video.*
