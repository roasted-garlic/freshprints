# DEV Deploy Record — WS2 Corrective (Assisted Final Image)

**Date:** 2026-09-01  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Owner authorization:** WS2 corrective DEV deploy approved (production NOT authorized)

---

## Git Checkpoint

| Field | Value |
|-------|-------|
| Corrective SHA | `b861a047bbc61ab7d9739c3163d72102f945c446` |
| `git rev-parse HEAD` | `b861a047bbc61ab7d9739c3163d72102f945c446` |
| `git rev-parse origin/development` | `b861a047bbc61ab7d9739c3163d72102f945c446` |
| Local == origin | **PASS** |
| Commit subject | `fix: reuse assisted final artwork and support large downloads` |

---

## Pre-Deploy Verification

| Check | Result |
|-------|--------|
| WS2 corrective focused tests | **11/11 PASS** |
| Reuse unit tests | **5/5 PASS** (included in focused suite) |
| `customerUploadProcessing` + eligibility regressions | **30/30 PASS** |
| Functions build (`npm --prefix functions run build`) | **PASS** (exit 0) |
| Migration | **none** |
| Firestore Rules | **not changed / not deployed** |
| Storage Rules | **not changed / not deployed** |
| Indexes | **not changed / not deployed** |

---

## Download URL Callable Availability (`fresh-prints-dev`)

| Function | Status |
|----------|--------|
| `customerGetAssistedCreationApprovedProofDownloadUrl` | **deployed** (v2 callable, us-central1) — verified via `firebase functions:list` |
| Redeploy required for download fix | **no** — Portal client change only |

---

## Firebase Deploy — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Project | `fresh-prints-dev` |
| Env | `FUNCTIONS_DISCOVERY_TIMEOUT=120` |
| Command | `firebase deploy --only functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev` |
| Exit code | **0** |
| Result | **Deploy complete** |

### Functions deployed

| Function | Operation |
|----------|-----------|
| `customerAddAssistedApprovedProofToPrintRequest` (us-central1) | **update** |

### Not deployed

- Other Functions
- Firestore Rules
- Storage Rules
- Firestore indexes
- Hosting / App Hosting
- Production (`fresh-prints`)

---

## Portal

- **Mode:** local dev (`npm run dev:portal`, port 3100)
- **Requirement:** **restart** after pull/checkout of `b861a047` for signed-URL download + progress UX
- **App Hosting:** not deployed

---

## Owner DEV QA

**WS2 re-test in progress** — see owner checklist in workflow state.

| Workstream | Status |
|------------|--------|
| WS1 | **PASS** |
| WS2 | **FAIL → corrective deployed — owner re-test pending** |
| WS3 | **PENDING** |

---

## Production

**Untouched.**
