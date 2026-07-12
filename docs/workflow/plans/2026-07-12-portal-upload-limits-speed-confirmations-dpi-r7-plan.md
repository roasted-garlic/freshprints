# Plan: Portal customer upload limits, speed, confirmations, and DPI UX (r7)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase (remediation r7 under portal-customer-artwork-upload) |
| Related | r6 manual checkpoint feedback; parent portal-customer-artwork-upload |

---

## Goal

Raise customer-upload capacity and file-size limits, speed up processing toward Studio-feel parallelism, soften confirmation copy (ownership required; library permission optional and default-on), and align Portal print-size defaults + DPI feedback with Studio without redesigning request-item layout.

## Background

During r6 manual testing the owner reported:

1. Need more than ~3 images → **100 files**
2. “image exceeds size limit” → allow **≤ 100 MB** per image
3. Processing feels slow vs Studio
4. Confirmations are too process-technical; want permission wording, library opt-in default-checked and **not required**
5. Uploads should default like Studio (**10″ wide**, keep pixels so DPI rises when shrinking from a larger native print size); show DPI for library + uploads without layout churn; warn when size push drops DPI too low

### Current facts (code)

| Limit | Today |
|-------|-------|
| Files per batch | **25** (`CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH`) |
| Concurrent finalize | **3** (client + server lease) — this is why only ~3 feel “active” |
| Single image | **25 MB** |
| Batch uncompressed total | **100 MB** |
| ZIP compressed / decompressed | **50 / 200 MB** |
| Daily finalize images | **50** / UTC day |
| Attach confirmations | both checkboxes **required** server-side |
| Attach print size | uses `upload.printWidthInches` from finalize (native @ target DPI), **not** `resolveInitialPrintRequestItemSize` (10″ cap) |
| Portal item card | size inputs + hard errors only; **no DPI / soft warning** (Studio shows both) |

---

## Scope

### In Scope

1. **Limits** — shared constants, Storage rules, Functions validation, Portal classify messages, alignment tests
2. **Speed** — raise finalize concurrency; profile/trim obvious customer-upload pipeline stalls vs Studio import (same Sharp family); update UI copy (“up to N”)
3. **Confirmations** — reword UI; ownership required; library permission default **checked**, **not** required to attach; terms version bump; server validation + types
4. **Print size / DPI** — on attach, set item size via `resolveInitialPrintRequestItemSize` (10″ cap, aspect lock, keep pixels); Portal card shows compact DPI + soft warning/error using existing `assessPrintRequestItemSize` without changing card structure
5. Docs: BACKEND / FIREBASE limits, TESTING notes, DECISIONS if terms/catalog semantics change
6. Deploy affected Functions + Storage rules to **fresh-prints-dev only**

### Out of Scope

- Always-in-selection redesign
- Matching Studio **local** wall-clock for huge PNGs (Cloud Functions cannot equal Electron local disk)
- Changing Studio import limits (150 MB staff path stays)
- Production deploy
- Redesigning Portal request-item layout (no new rows/sections beyond a compact DPI cue in the existing size area)
- Raising daily create-batch count unless needed for smoke (separate abuse knob)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts`
- `packages/shared/src/types/customerUpload/*` (terms version, confirm request types)
- `packages/shared/src/constants/storageRulesAlignment.test.ts` (+ related)
- `storage.rules`
- `functions/src/lib/customerUploadValidation.ts`, `customerUploadRateLimit.ts`, `confirmCustomerUploadValidation.ts`, `customerUploadProcessing.ts` (perf if needed)
- `functions/src/confirmCustomerUploadsAndAttachToRequest.ts` (optional catalog flag + initial size)
- `apps/portal/features/customer-uploads/**`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` + `requests.css` (compact DPI)
- Docs under `docs/architecture/`, `docs/project/DECISIONS.md` as needed

### Architecture Impact
- [x] Details: limits + confirm semantics change; attach sizing uses shared Studio/Portal helper

### Security Impact
- [x] Details: higher abuse surface (100 MB × 100 files). Mitigate with batch uncompressed cap, daily finalize cap bump (bounded), concurrency lease, existing auth. Catalog permission becomes optional boolean persisted as chosen (default true in UI).

### Data Model Impact
- [x] Details: `catalogUseAcknowledged` may be `false` on confirmed attaches; `termsVersion` → `customer-upload-terms-v2`. No new collections.

### Backend Impact
- [x] Details: Storage rules size; create/finalize/confirm validation; rate limits; possibly function memory/timeout if 100 MB images

### UI / UX Impact
- [x] Details: upload modal limits copy; confirmation copy; request item compact DPI + soft warning

### Migration Impact
- [x] None for existing docs (new uploads only). Old terms version rejected until client ships v2.

---

## Approach

### 1. Limits (proposed values — confirm in Open Questions)

| Constant | Proposed |
|----------|----------|
| `CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES` | **100 MB** |
| `CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH` | **100** |
| `CUSTOMER_UPLOAD_MAX_BATCH_UNCOMPRESSED_BYTES` | **2 GB** (allows many large files without unbounded 10 GB batches) |
| `CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES` | **500 MB** |
| `CUSTOMER_UPLOAD_MAX_ZIP_DECOMPRESSED_BYTES` | **2 GB** |
| `CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES` | already **100** — keep |
| `CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT` | **200** (so a 100-file day is possible) |
| `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE` | **8** (see speed) |

Update `storage.rules` single-image + ZIP size checks to match. Update client reject messages to include the limit (e.g. “exceeds 100 MB size limit”).

### 2. Processing speed

Reality check: Portal finalize runs in **Cloud Functions**; Studio import runs **locally**. Goal is **same pipeline quality + much better perceived throughput**, not identical seconds.

Concrete steps:

1. Raise concurrent finalize lease + client `runWithConcurrency` to **8** (configurable constant).
2. Measure stage timing in `processCustomerUploadImageBytes` (decode / transparency / trim / upscale / derivatives / Storage). Optimize the worst safe win first — likely full-pixel transparency scan or sequential Storage writes — without weakening transparency gate.
3. Ensure 100 MB images still finish within function timeout/memory; bump finalize `memory`/`timeout` only if smoke proves needed.
4. ZIP path: keep entry limit 100; document that ZIP finalize remains more sequential than multi-image parallel callables (optional follow-up: chunk ZIP work — **out of scope** unless quick).

### 3. Confirmation copy (proposed)

**Help (short):**  
“Confirm you have the right to print this artwork. You can also allow Fresh Prints to consider it for our shared design library.”

**Required checkbox:**  
“I own this artwork or have permission to print it.”

**Optional checkbox (default checked):**  
“Fresh Prints may use this artwork in our design library for other customers.”

Rules:

- Ownership must be checked to enable **Add to my print request**
- Library permission may be unchecked; attach still allowed
- Persist actual `catalogUseAcknowledged` boolean
- Bump `CUSTOMER_UPLOAD_TERMS_VERSION` → `customer-upload-terms-v2`
- Staff promote-to-catalog remains **allowed** when `catalogUseAcknowledged === false`; Studio intake/detail must **surface** that the customer declined library use (owner decision 2026-07-12). Persist the boolean as chosen; document in DECISIONS.

### 4. Default 10″ + DPI display

1. In `confirmCustomerUploadsAndAttachToRequest`, when creating items, compute size with:

   `resolveInitialPrintRequestItemSize({ pixelWidth, pixelHeight, defaultPrintWidthInches: upload.printWidthInches })`

   so native print metadata can seed width, then **cap at 10″** (and 22″ / aspect rules) while **keeping pixel dimensions** → DPI rises when defaulting down from e.g. 14″@300 to 10″.

2. If pixel dims missing, fall back to upload print inches or skip size fields only if unavoidable (prefer fail-soft with reload path).

3. Portal `PortalPrintRequestItemCard`: in the existing size row (or immediately under it without new card chrome), show compact `{effectiveDpi} DPI` and soft `warningMessage` like Studio; keep hard `errorMessage` for &lt;72 DPI / oversize. No hero layout change.

### 5. Deploy / verify (dev)

- Deploy updated Storage rules + confirm/finalize/create-batch functions to **fresh-prints-dev**
- Smoke or targeted tests for limits, optional catalog flag, initial 10″ attach

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit / limits alignment | `npm` scripts covering shared + storageRulesAlignment | yes |
| Typecheck portal/functions/shared | project scripts | yes |
| Confirm validation unit tests | update/add | yes |
| Initial size / DPI assessment tests | existing shared tests + attach-focused if needed | yes |

### Manual

- [ ] Upload 5+ images → more than 3 process in parallel; batch of many files up to 100 accepted
- [ ] File just under 100 MB accepted; over 100 MB rejected with clear message
- [ ] Confirm copy readable; uncheck library permission → still attach; ownership required
- [ ] Attached upload defaults near **10″** wide; DPI shown; enlarge until warning then error
- [ ] Library design on same request also shows DPI without layout break

---

## Human Checkpoints Anticipated

- [x] Business logic decision — limits (batch uncompressed, concurrency, daily cap) and confirmation copy
- [x] Manual UI/UX review after implement
- [ ] Production deploy — not in this remediation

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Abuse / cost from 100×100MB | High | 2 GB batch uncompressed + daily finalize cap + auth + concurrency lease |
| Function OOM/timeout on 100 MB PNG | Medium | Memory/timeout bump; fail with clear technical error |
| Higher concurrency thundering herd | Medium | Cap at 8; keep per-UID lease |
| Staff promote ignores false catalog flag | Medium | Explicit promote guard |
| “As fast as Studio” expectation | Med | Document CF vs local; ship concurrency + stage wins |

---

## Rollback Plan

Revert constants/rules/functions to prior values on fresh-prints-dev; client terms v2 → v1 only if needed for hotfix. Confirmed false `catalogUseAcknowledged` rows remain valid.

---

## Documentation Updates Required

- [x] FIREBASE.md / BACKEND.md limit tables
- [x] DECISIONS.md — optional library permission + terms v2
- [x] TESTING.md if smoke commands change
- [ ] Other: risk register note if abuse surface material

---

## Open Questions

- [x] None — owner answered 2026-07-12:
  1. Batch uncompressed **2 GB** — approved  
  2. Concurrency **8** — approved  
  3. Daily finalize **200** — approved  
  4. Proposed confirmation copy — approved  
  5. Do **not** block staff promote; **show** that customer unchecked library permission  

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-review.md
- Verdict: approved (owner decisions locked)
