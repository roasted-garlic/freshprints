# Test Report: Portal Customer Artwork Upload — Sub-phase B

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Plan | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-subphase-b-plan.md` |
| Status | **passed_with_notes** |

---

## Commands run (pre-deploy)

| Check | Command | Result |
|-------|---------|--------|
| Unit | `npx tsx --test functions/src/lib/customerUpload*.test.ts packages/shared/src/constants/storageRulesAlignment.test.ts` | **PASS** 25/25 |
| Functions build | `npm --prefix functions run build` | **PASS** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **PASS** |
| Lint (full repo) | `npm run lint` | **FAIL** — pre-existing only (see notes) |
| Lint (Functions B surface) | `npx eslint functions/src --ext ts --max-warnings 0` | **PASS** (after B fixes) |

---

## Deploy evidence (`fresh-prints-dev`)

| Step | Result |
|------|--------|
| Initial deploy | **PASS** — Functions `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip` + Firestore rules + Storage rules + indexes (owner-run / terminal exit 0) |
| Indexes | Customer-upload composites present via `firebase firestore:indexes --project fresh-prints-dev` (no CREATING state observed) |
| Corrective redeploy | **PASS** — `firebase deploy --only functions:finalizeCustomerUpload --project fresh-prints-dev` after transaction read/write order fix |

### Defect found in smoke → fixed

- **Symptom:** `finalizeCustomerUpload` returned `functions/internal`
- **Cause:** Firestore transaction read-after-write when bumping batch `readyCount` / `failedCount`
- **Fix:** Read upload + batch docs before writes in `finalizeCustomerUpload.ts` (success path + `markFailed`)
- **Redeploy:** `finalizeCustomerUpload` only (within approved corrective scope)

---

## Backend smoke (`fresh-prints-dev`)

Harness: `functions/scripts/smoke-customer-upload-subphase-b.mjs` (temporary; uses Firebase CLI OAuth + ephemeral smoke customers; no secrets printed)

Command:

```bash
node functions/scripts/smoke-customer-upload-subphase-b.mjs
```

Final run id: `mrhb5zwp` — **passed=15 failed=0**

| # | Check | Result |
|---|-------|--------|
| 1 | Create direct-image batch | PASS |
| 2 | Upload transparent PNG to canonical `source` | PASS |
| 3 | `finalizeCustomerUpload` success | PASS (`ready`, `alreadyReady=false`) |
| 4 | `technicalStatus: ready` | PASS |
| 5 | production.png / preview.webp / thumbnail.webp | PASS |
| 6 | Opaque PNG → “Background is not transparent.” | PASS |
| 7 | JPEG rejected (Storage rules unauthorized for non-png/webp) | PASS |
| 8 | Re-finalize ready → `alreadyReady=true`, paths stable | PASS |
| 9 | ZIP with 2 PNGs → 2 ready uploads | PASS |
| 10 | Nested ZIP rejected | PASS |
| 11 | Second customer cannot read first’s Firestore/Storage | PASS |
| 12 | 11th batch create same UID/UTC day rejected | PASS |
| 13 | Portal has no upload CTA / customer-upload UI | PASS (repo scan) |

---

## Unit coverage (B)

- `customerUploadValidation`, `customerUploadStatus`, `customerUploadRateLimitHelpers`
- `customerUploadZip`, `customerUploadProcessing`, `storageRulesAlignment`

---

## Notes

- Full-repo lint still fails on pre-existing Portal/Studio issues only.
- Studio tsc baseline failures remain out of scope.
- Smoke is **backend-only**; no Portal UI manual test required for Sub-phase B.
- JPEG rejection verified at Storage rule boundary (contentType allowlist); finalize also rejects non-PNG/WebP if bytes slip through.

---

## Signoff readiness

Deploy + automated backend smoke: **PASS**. Sub-phase B ready for deploy/smoke signoff. Sub-phase C (Portal UI) may be planned next; do not enable UI until that phase.
