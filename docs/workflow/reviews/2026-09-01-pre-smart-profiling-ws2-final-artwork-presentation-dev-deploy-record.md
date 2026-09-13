# DEV Deploy Record — WS2 Final Artwork Presentation Corrective

**Date:** 2026-09-01  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Owner authorization:** WS2 Final Artwork presentation/download corrective DEV deploy approved (production NOT authorized)

---

## Git Checkpoint

| Field | Value |
|-------|-------|
| Corrective SHA | `001d76642c396dfd7e42f8f9dde6e12bf62cf606` |
| `git rev-parse HEAD` | `001d76642c396dfd7e42f8f9dde6e12bf62cf606` |
| `git rev-parse origin/development` | `001d76642c396dfd7e42f8f9dde6e12bf62cf606` |
| Local == origin | **PASS** |
| Commit subject | `fix: Final Artwork history, preview, and explicit download targets` |

---

## Pre-Deploy Verification

| Check | Result |
|-------|--------|
| WS2 presentation/download focused tests | **13/13 PASS** |
| Functions build (`npm --prefix functions run build`) | **PASS** (exit 0) |
| Migration | **none** |
| Firestore Rules | **not changed / not deployed** |
| Storage Rules | **not changed / not deployed** |
| Indexes | **not changed / not deployed** |
| Hosting / App Hosting | **not deployed** |

### Focused test command

```bash
npx tsx --test \
  packages/shared/src/utils/assistedCreationArtworkHistory.test.ts \
  apps/portal/features/assisted-creation/utils/assistedCreationFinalArtworkPresentation.contract.test.ts \
  apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts \
  functions/src/lib/assistedFinalSourceAttachReuse.test.ts
```

---

## Firebase Deploy — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Project | `fresh-prints-dev` |
| Env | `FUNCTIONS_DISCOVERY_TIMEOUT=120` |
| Command | `firebase deploy --only functions:customerGetAssistedCreationApprovedProofDownloadUrl,functions:customerGetAssistedCreationApprovedProofFile --project fresh-prints-dev` |
| Exit code | **0** |
| Result | **Deploy complete** |

### Functions deployed

| Function | Operation |
|----------|-----------|
| `customerGetAssistedCreationApprovedProofDownloadUrl` (us-central1) | **update** |
| `customerGetAssistedCreationApprovedProofFile` (us-central1) | **update** |

### Not deployed

| Surface | Status |
|---------|--------|
| `customerAddAssistedApprovedProofToPrintRequest` | **not redeployed** (attach path unchanged) |
| Other Functions | **not deployed** |
| Firestore Rules | **not deployed** |
| Storage Rules | **not deployed** |
| Firestore indexes | **not deployed** |
| Hosting / App Hosting | **not deployed** |
| Production (`fresh-prints`) | **untouched** |

---

## Local Dev Restart

| App | Requirement |
|-----|-------------|
| Portal (`npm run dev:portal`, port 3100) | **restart required** — client history + download routing |
| Studio (`npm run dev:studio`) | **restart required** — pre-upload preview + history row |
| App Hosting | **not deployed** |
| Studio release | **not deployed** |

---

## Owner DEV QA

**WS2 PASS** — see `2026-09-01-pre-smart-profiling-ws2-owner-dev-qa-pass.md`.

| Workstream | Status |
|------------|--------|
| WS1 | **PASS** |
| WS2 | **PASS** |
| WS3 | **PASS** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |

---

## Production

**Untouched.**
