# Test Report: Assisted Creation proof preview hang

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-21-assisted-creation-proof-preview-hang-plan.md |
| Implementation | session hotfix (Studio + Portal clients) |
| Overall | **passed** — owner manual PASS 2026-07-21 |

---

## Summary

Client fix implemented: signed download URL first with 12s timeout; getBytes fallback with timeout; Studio proofs settle per-item with 28s safety; Portal status no longer conflates null URL with eternal Loading. Automated: Portal `tsc --noEmit` passed. Studio `tsc` blocked by pre-existing `tsconfig` `ignoreDeprecations` issue (unrelated). Soft-deploy not required. Owner manual QA **PASS** 2026-07-21.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck (Portal) | `npm run typecheck` in `apps/portal` | 0 | pass | |
| Typecheck (Studio) | `npx tsc --noEmit -p tsconfig.json` in `apps/studio` | 2 | skip/fail pre-existing | `TS5103: Invalid value for '--ignoreDeprecations'` — not introduced by this change |
| Lint | — | — | skip | Not run (narrow hotfix) |
| Unit tests | — | — | skip | No new pure helpers extracted for unit test |
| Build | — | — | skip | Manual UI verify preferred |
| Backend/rules | read `storage.rules` | — | pass (inspect) | Customer + staff read on `…/proofs/{fileId}` already present |

---

## Soft-deploy

**Not required for this hang.** Client-only. If owner later wants durable ref promote Functions:

```bash
# Only if separately approved — not for this proof-preview fix
firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest --project fresh-prints-dev
```

Storage rules soft-deploy only if rules file drifted from deployed:

```bash
firebase deploy --only storage --project fresh-prints-dev
```

Reply **APPROVE SOFT-DEPLOY** only if you want those; not needed to fix proof thumbs.

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Studio proof thumb after submit | **PASS** | Owner 2026-07-21 |
| Studio no false “File removed” | **PASS** | Owner 2026-07-21 |
| Portal status proof image | **PASS** | Owner 2026-07-21 |
| Portal settle to unavailable on failure | not separately reported | covered under PASS |

### Manual Test Checkpoint

**Feature / area:** Assisted Creation proof previews (Studio + Portal)  
**Why automated tests are insufficient:** Electron Storage + Firebase signed URL / getBytes behavior; visual thumbs  
**Environment:** local Studio + Portal against `fresh-prints-dev`  
**Prerequisites:** Staff account; customer with open Assisted Creation request; ability to upload a proof PNG

#### Steps
1. **Restart Studio** and hard-refresh Portal so client fix loads.
2. Studio → Assisted Creation → open a request → submit a proof image.  
   → **Expected:** Proofs tab shows a real thumb within a few seconds (not forever gray / Loading). Status can be Proof ready.
3. Open the proof row / modal.  
   → **Expected:** Image visible. Meta must **not** say “File removed” unless the file was actually purged.
4. Portal (customer) → Assisted Creation status while `proof_ready`.  
   → **Expected:** Proof image loads; Approve / Request revisions usable. Must **not** stay on “Loading proof image…” forever.
5. (Optional) If load fails: within ~12–28s see “Preview unavailable”, not infinite Loading.

#### Pass criteria
- [x] Studio thumb appears promptly after proof submit
- [x] Studio does not show false “File removed” on live proof
- [x] Portal shows proof image (not eternal Loading)
- [x] Approve/revisions UI remains usable with image

#### Owner result
**PASS** (2026-07-21)
---

## Risks / Residual

- Signed URL in `<img src>` exposes Firebase token-bearing URL briefly (TTL); opaque object names retained (ADR-FP-112).
- Studio full `tsc` still broken by unrelated tsconfig deprecation flag.
