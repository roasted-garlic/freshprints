# Test Report: Pre-Smart-Profiling Print Request & Gang-Sheet Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Status | **passed_with_notes** |
| Production | **NOT AUTHORIZED** |

---

## Focused automated tests (this session)

| Command | Exit | Summary |
|---------|------|---------|
| `npx tsx --test packages/shared/src/utils/portalPrintRequestUnqueue.test.ts` | 0 | 10/10 pass — pending/queued success, blocking states, ADR-FP-071, origin |
| `npx tsx --test packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts` | 0 | 6/6 pass — tiers, mixed line, fractional weight |
| `npx tsx --test packages/shared/src/utils/gangSheetCacheFingerprint.test.ts` | 0 | 11/11 pass — `sectionSummaryVersion`, tier/quantity invalidation, efficiency stable |
| `npx tsx --test packages/shared/src/utils/assistedCreationApprovedProofAddToRequest.test.ts` | 0 | 5/5 pass — `finalSource` when proof purged |
| `npx tsx --test functions/src/lib/customerUploadProcessing.test.ts` | 0 | 25/25 pass incl. `probeAssistedFinalSourceImageBytes` |
| `npx tsx --test apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts` | 0 | 3/3 pass — compositor regression |

---

## Build / typecheck

| Check | Exit | Notes |
|-------|------|-------|
| `cd functions && npm run build` | 0 | **pass** |
| `npm run typecheck --workspace @fresh-prints/portal` | 2 | **partial** — failures in **unrelated** pre-existing working-tree files (`catalogService.ts`, `portalShowDiscoveryContent.ts`); goal-scoped Portal print-request / unqueue files compile clean |

---

## Not run (documented)

| Check | Reason |
|-------|--------|
| Full `npm run lint` | Out of scope for this STOP-before-deploy checkpoint; no new lint config |
| Full `npm run test:rules` | No Firestore/Storage Rules changes in this goal |
| Callable integration tests against emulators | Not present in repo for `unqueuePortalPrintRequestFromShow`; covered by shared eligibility unit tests + functions build |
| Studio full build | WS3 changes are Electron export path; compositor unit tests passed |
| Owner manual DEV QA | **Pending** — required before signoff |

---

## Manual QA checklist (owner)

### WS1
1. Queue a Portal request to a show (`pending` allocation) → open detail → **Remove from Show & Edit** → confirm → request returns to Working/editing; items unchanged.
2. Repeat with `queued` allocation if observable in DEV.
3. With another Working Portal request present → unqueue blocked with collision copy (ADR-FP-071).
4. After successful unqueue → re-queue uses normal cutoff/capacity rules.

### WS2
1. Staff uploads valid Final Image on Assisted Creation → dimensions persisted on `finalSource`.
2. Customer attaches approved final artwork to Working Print Request → `customer_upload` item with production metadata + `assistedFinalSourceId`.
3. Purged proof + valid `finalSource` → CTA still available.

### WS3
1. Export gang sheet **Grouped by Customer** → price/weight line under each request heading.
2. Export **Sheet per Customer** → same line present.
3. Export **Standard/efficiency** → no price/weight line.
4. Mixed $1/$2 sizes and continuation sheets → segment-local totals.

---

## Verdict

**passed_with_notes** — focused automated coverage green; functions build green; full Portal typecheck blocked by unrelated local changes; owner DEV QA outstanding.
