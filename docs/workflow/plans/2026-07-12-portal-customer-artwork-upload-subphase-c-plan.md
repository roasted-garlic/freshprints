# Plan: Portal Customer Artwork Upload — Sub-phase C (Portal UI + Attach)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review → revised after review round 1 |
| Workflow | managed-phase |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` (approved_with_changes) |
| Related review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-c-review.md` |
| Depends on | Sub-phase B complete on `fresh-prints-dev` (deploy + smoke 15/15) |
| ADR | ADR-FP-073, ADR-FP-071 |

---

## Goal

Ship the **customer-facing Portal upload workflow**: select files/folder/ZIP → use deployed Sub-phase B callables + Storage paths → per-file progress/results → required ownership/catalog confirmations → `confirmCustomerUploadsAndAttachToRequest` attaching ready uploads to the single working print request (create only when none exists) — with mobile-first UI, retry-safe orchestration, and no client authority over processing fields.

---

## Background

Sub-phases A–B delivered shared contracts and a trusted backend on `fresh-prints-dev`. Portal has **no** upload UI yet. Catalog add-to-request remains separate. Attach callable does not exist. Parent lock-downs require B before C UI enablement (satisfied on dev). Standing owner authorization covers `fresh-prints-dev` deploys for approved C resources.

---

## Scope

### In Scope

1. Portal feature module `apps/portal/features/customer-uploads/` (components, hooks, services, copy)
2. Request detail primary CTA **Upload artwork** (+ optional empty-state secondary CTA on requests list / catalog empty state — same flow)
3. Single-image, multi-image, `webkitdirectory` folder selection, ZIP upload, drag-drop where practical
4. Client orchestration: `createCustomerUploadBatch` → Storage `uploadBytes` to **server-returned** paths only → `finalizeCustomerUpload` / `finalizeCustomerUploadZip`
5. Per-file progress + Ready/Failed; batch summary; remove unconfirmed files; retry failed; soft concurrency ≤ 3 finalize calls
6. No browser ZIP extract; no Electron/Node FS imports
7. Two required confirmation checkboxes + persist `termsVersion` = `customer-upload-terms-v1`
8. New callable **`confirmCustomerUploadsAndAttachToRequest`** (Admin transaction) implementing parent attach invariants
9. Idempotent attach by `customerUploadId`; set `catalogReviewStatus: pending_staff_review` on attached uploads
10. Minimal Portal display of upload-backed `printRequestItems` (titleSnapshot, preview, qty/size using existing item patterns)
11. Shared attach DTO types; `designId` optional when `sourceType === "customer_upload"` (types + Firestore rules for **customer updates** of upload-backed items only)
12. Guard until D: **server + UI** fail-closed if working request contains upload-backed items when queueing to show
13. Docs: BACKEND/FIREBASE, DATA_MODEL, TESTING, STYLE notes as needed
14. Deploy + backend/UI smoke on `fresh-prints-dev`; enable UI only after smoke PASS

### Out of Scope

- Show Queue / Gang Sheet / export source resolution (D)
- Studio `/imports` intake, promote, exclude (E)
- AI lifecycle verification (F)
- Cleanup schedules / wipe target (G)
- Production deploy / App Hosting
- Changing locked size/transparency limits
- Phase 9 `customRequests`
- Working-request picker
- Weakening cross-customer isolation
- Unparking wipe

---

## Affected Areas

### New

| Path | Role |
|------|------|
| `apps/portal/features/customer-uploads/**` | UI + hooks + services |
| `apps/portal/styles/customer-uploads.css` | Mobile-first styles |
| `functions/src/lib/portalWorkingPrintRequest.ts` | Shared ADR-FP-071 resolve/create working request (attach + reuse with create) |
| `functions/src/confirmCustomerUploadsAndAttachToRequest.ts` | Attach callable |
| `functions/src/lib/confirmCustomerUploadAttach*.ts` (+ tests) | Validation + transaction |
| `packages/shared/src/types/customerUpload/confirmCustomerUploadAttach.types.ts` | DTOs |
| `functions/scripts/smoke-customer-upload-subphase-c.mjs` | Dev smoke harness (temp OK) |

### Modified

| Path | Change |
|------|--------|
| `functions/src/index.ts` | Export attach callable |
| `functions/src/createPortalPrintRequest.ts` | Prefer shared working-request helper (behavior-preserving refactor) |
| `functions/src/queuePortalPrintRequestToShow.ts` | Reject if any item on request is `customer_upload` (until D) |
| `packages/shared/.../printRequest.types.ts` | `designId` optional; invariant: omit for upload items; required for catalog |
| `firestore.rules` | Customer update path for upload-backed items (qty/size) without `isReadyDesign`; client **create** remains catalog/`designId`+ready only |
| `apps/portal/.../PrintRequestDetailView.tsx` | Upload CTA + panel; disable queue CTA when upload items present |
| `apps/portal/.../portalPrintRequestService.ts` | Map upload-backed items (omit designId); queue eligibility helper |
| `apps/portal/.../PortalPrintRequestItemCard.tsx` | Display upload source (minimal; no catalog design fetch) |
| `apps/portal/.../portalAuthService.ts` (or callable error helper) | Map rate-limit / attach / queue-guard errors |
| Docs listed below | Behavior updates |

### Reuse

- B callables + smoke patterns (`smoke-customer-upload-subphase-b.mjs`)
- `requirePortalCustomer`, `errors.*`, ADR-FP-071 gate from `createPortalPrintRequest`
- `CUSTOMER_UPLOAD_*` limits/paths/terms version
- `PortalConfirmModal`, `form-checkbox`, `portal-button*`, `requests.css` patterns
- `shouldIncrementDesignRequestCount` / empty `designId` already no-ops `onPrintRequestItemCreated`

### Do not modify

- Wipe callable / allowlist
- AI enrichment prompts/pipeline
- Studio `/imports` (E)
- Locked transparency thresholds

---

## Architecture Impact

- [x] Portal feature folder for uploads; services own callables/Storage; hooks orchestrate; components render
- [x] No direct client writes to `customerUploads` processing fields or upload-backed `printRequestItems` **create**
- [x] Attach is trusted Admin transaction only
- [x] No Electron imports in Portal

---

## Security Impact

- [x] New public Portal callable (customer-auth)
- [x] Confirmations verified server-side (checkboxes not security)
- [x] Ownership of uploads/batch + request gate
- [x] Storage writes remain path/owner/size/type only
- [x] Firestore rules: do **not** allow clients to create upload-backed items; only Admin attach
- [x] Customer may update qty/size/notes on **own** upload-backed items; cannot change `sourceType` / `customerUploadId` / paths
- [x] Cross-customer isolation unchanged

---

## Data Model Impact

- [x] Runtime: attach sets confirmation fields + `catalogReviewStatus: pending_staff_review`
- [x] `printRequestItems` for uploads: `sourceType: "customer_upload"`, non-empty `customerUploadId`, **`designId` field omitted** (never empty string); catalog items keep non-empty `designId`
- [x] No new collections

### Migration

- Additive only; no backfill required
- Rollback: hide Portal CTA / undeploy attach callable; orphan upload docs remain (cleanup = G)

---

## Backend Impact

### Shared helper: `portalWorkingPrintRequest.ts`

Extract ADR-FP-071 logic used by `createPortalPrintRequest` and attach:

- Query continuable `draft`/`editing` for `customerId`
- 0 → create new request (same field set as today)
- 1 → return id
- >1 → `failedPrecondition(PORTAL_ONE_WORKING_REQUEST_MESSAGE)` or attach-specific fail-closed message if multiple exist without creating

Attach uses “resolve or create”; createPortalPrintRequest continues to “create only if zero” (existing UX). Prefer shared **query + create primitives** so transaction rules stay identical.

### New callable: `confirmCustomerUploadsAndAttachToRequest`

**Auth:** `requirePortalCustomer`

**Input (validated):**

```ts
{
  batchId: string;
  uploadIds: string[]; // ready uploads to attach; non-empty; ≤ CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH
  ownershipConfirmed: true;
  catalogUseAcknowledged: true;
  termsVersion: "customer-upload-terms-v1";
  defaultQuantity?: number; // default 1; integer 1..100000 (Portal card has no upper clamp; server caps abuse)
}
```

**Behavior:**

1. Load batch; ownership match
2. Load each upload; ownership; `technicalStatus === ready`; belong to batch
3. Require both confirmations + exact known terms version
4. Transaction:
   - Resolve/create working request via shared helper
   - For each uploadId: if item already exists with same `customerUploadId` on that request → skip create (idempotent)
   - Else Admin-create `printRequestItem`: `sourceType: customer_upload`, `customerUploadId`, `titleSnapshot` from filename, print size from upload metadata when present, `quantity` = validated default, **do not write `designId`**
   - Update upload (+ batch as needed): confirmation fields, `confirmedAt`, `printRequestId`, `catalogReviewStatus: pending_staff_review`
5. Return `{ printRequestId, attachedItemIds, reusedItemIds }`

**Does not:** promote; enqueue AI; write `designs`.

### Queue guard (pre-D)

`queuePortalPrintRequestToShow`: before allocating, load request items; if any `sourceType === "customer_upload"` (or non-empty `customerUploadId`), throw `failedPrecondition` with user-safe message e.g. “Custom artwork on this request isn’t ready for show queue yet. Catalog-only requests can still be queued.”

Portal: hide/disable queue CTA when detail items include uploads.

### Rules change (narrow)

- **Client create:** unchanged — requires non-empty `designId` + ready design
- **Client update (customer):** if `resource.data.sourceType == "customer_upload"`, allow qty/size/notes; forbid changing `sourceType`, `customerUploadId`, `printRequestId`; `designId` must remain absent/unchanged
- **Staff:** retain update capability without inventing client create for uploads

### Deploy (standing auth — `fresh-prints-dev` only)

```bash
firebase deploy --only functions:confirmCustomerUploadsAndAttachToRequest,functions:queuePortalPrintRequestToShow,functions:createPortalPrintRequest,firestore:rules --project fresh-prints-dev
```

(`createPortalPrintRequest` only if refactored to shared helper.) Prefer local Portal (`npm run dev:portal`) against deployed Functions for C smoke.

---

## UI / UX Impact

### Confirmation copy (provisional — parent plan; allowed for C on `fresh-prints-dev`)

```
☐ I own this artwork or have permission to reproduce and print it.

☐ I understand Fresh Prints may review this artwork and, if staff approve it,
  add it to the shared Design Library for other customers to use. Adding it to
  my print request does not mean it is in the Design Library.
```

- Both must be checked to enable Attach
- User-facing copy must not say “AI Review” / Gemini
- Clarify technical acceptance ≠ Design Library approval; catalog exclusion (later) ≠ remove from request (short helper text near confirmations)

### Flow

1. Open working request → **Upload artwork**
2. Add files (picker / multi / folder / ZIP / drag-drop)
3. Auto or explicit start: create batch → upload → finalize (queued)
4. Per-file Ready/Failed + message; remove pending; retry failed
5. Check both boxes → **Add to my print request**
6. Navigate/refresh detail showing new items

### Mobile-first

- Full-width actions &lt; 40rem; stacked file rows; large touch targets
- Reuse portal tokens / buttons / panels

### Refresh recovery

- Persist in-progress batchId / uploadIds in `sessionStorage` keyed by uid+batchId where practical; on remount, resume finalize for non-ready or show status from Firestore reads (customer can read own uploads)

---

## Approach

1. Shared attach types + working-request helper + validation
2. Implement attach callable + queue guard + unit tests; export
3. Firestore rules update for upload-backed item customer updates
4. Portal services: callables + Storage upload
5. Hooks: batch orchestration (concurrency 3), confirm/attach
6. Components: panel, file row, checkboxes, attach actions
7. Wire request detail (+ optional empty CTAs); disable queue when uploads present
8. Mapper + item card minimal upload display
9. Extend callable error messages
10. Docs
11. Deploy Functions+rules to `fresh-prints-dev`
12. Smoke harness + Portal typecheck/build; fix until pass
13. Signoff C; then plan D

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (attach validation + helpers) | `npx tsx --test functions/src/lib/confirmCustomerUpload*.test.ts` (+ shared if added) | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal build | `npm run build:portal` | yes |
| Lint (touched surfaces) | eslint on changed Portal/Functions paths | yes |
| Backend smoke C | `node functions/scripts/smoke-customer-upload-subphase-c.mjs` | yes |

### Smoke checklist (dev)

- [ ] Single transparent PNG → ready → confirm → attached item on request
- [ ] Multi PNG + folder selection path
- [ ] ZIP two files → attach both
- [ ] Opaque → failed; cannot attach that file
- [ ] Attach blocked until both checkboxes
- [ ] Second attach same uploadIds → no duplicate items
- [ ] Creates working request when none; uses existing when one
- [ ] Rate-limit / busy errors surface safely
- [ ] Other customer cannot attach / read
- [ ] Queue-to-show with upload items: UI disabled **and** server `failedPrecondition`
- [ ] Mobile layout smoke (viewport or CSS breakpoint verification + harness)

### Manual / owner

- Deferred to feature-end visual checkpoint (G) unless automated UI cannot cover; C does **not** block on owner visual before C signoff if automated smoke + build pass

---

## Human Checkpoints Anticipated

- [ ] New npm dependency — **none expected** (use existing Firebase client + shared)
- [ ] Production deploy — no
- [ ] Final confirmation wording / visual acceptance — **deferred to end of G** (provisional copy OK for C per owner Continue Workflow instructions)
- [ ] Wipe unpark — no
- [x] Standing `fresh-prints-dev` deploy authorization — granted in Continue Workflow prompt

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Upload items break queue/export before D | High | Explicit fail-closed guard + messaging; D immediately next |
| Clients invent Storage paths | High | Only use batch response paths |
| Duplicate items | Medium | Idempotent attach by customerUploadId |
| Rules accidentally allow client create of upload items | High | Create path still requires ready designId |
| Concurrency / quota UX confusion | Medium | Soft queue + clear errors |

---

## Rollback Plan

1. Remove/hide Portal upload CTAs
2. Redeploy prior Functions revision without attach (or disable callable)
3. Revert rules if needed
4. Uploaded blobs remain; cleanup via G

---

## Documentation Updates Required

- [x] BACKEND.md / FIREBASE.md — attach callable
- [x] DATA_MODEL.md — attach confirmation + optional designId for uploads
- [x] TESTING.md — C smoke command
- [x] ROADMAP.md — C status
- [ ] STYLE_GUIDE.md — only if new patterns beyond existing portal classes

---

## Acceptance Criteria

- [ ] Single / multi / folder / ZIP upload via B callables + canonical Storage paths
- [ ] Per-file progress and failure states; batch summary; retry/remove
- [ ] No client ZIP extract; no trusted field client writes
- [ ] Both confirmations + terms version persisted via attach
- [ ] Attach callable enforces ownership, ready-only, ADR-FP-071 gate, idempotency
- [ ] Working request created only when none; no picker; fail if multiple
- [ ] Qty/size editable on attached upload items (customer)
- [ ] Clear copy: not Design Library until staff; exclusion ≠ remove from request (helper)
- [ ] Mobile-first UI
- [ ] Deployed + smoke PASS on `fresh-prints-dev`
- [ ] D not started until C signed off

---

## Open Questions

- [x] Confirmation wording for C — use parent provisional copy (owner Continue Workflow)
- [x] designId until D — **omit** field on Admin-created upload items; rules/types allow; queue guarded server+UI until D

---

## Review revision log

| Date | Change |
|------|--------|
| 2026-07-12 | Incorporated review round 1: shared working-request helper; server+UI queue guard; omit designId; quantity 1..100000; smoke for queue reject |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-c-review.md`
- Verdict: **approved** (2026-07-12, round 2 after revision)
- Implementation: allowed
