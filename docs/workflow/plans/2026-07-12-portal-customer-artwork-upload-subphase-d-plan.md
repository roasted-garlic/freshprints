# Plan: Portal Customer Artwork Upload — Sub-phase D (Source-Aware Request / Show / Gang / Export)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review → **revised after review round 1** |
| Workflow | managed-phase |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Related review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-d-review.md` |
| Depends on | Sub-phase C signed off on `fresh-prints-dev` (smoke 13/13) |
| ADR | ADR-FP-073, ADR-FP-071 |

---

## Goal

Make every runtime path that currently assumes `designId` is always present **source-aware**, so customer-upload-backed print request items can move through Studio request views, staff queue-to-show, Show Queue, gang sheet generate/preview/PNG export, and show ZIP export using the upload’s **production PNG** — without writing request/production status onto `designs.status`, without incrementing catalog `requestCount` for uploads, and without breaking legacy catalog-design workflows.

After D, remove the Sub-phase C temporary Portal queue block for upload-backed items (server + UI), because production paths will resolve correctly.

---

## Background

Sub-phase C attaches upload items (`sourceType: customer_upload`, no `designId`) and intentionally fail-closes Portal queue-to-show. Studio mappers, allocations, gang sheets, and export still assume catalog `designs` + `/originals/{designId}.png`. Parent plan lists this as high-risk and in-scope for D.

---

## Scope

### In Scope

1. **Shared contracts** for source-aware allocations and gang sheet items (optional `designId`, `sourceType`, `customerUploadId`, asset path snapshot fields)
2. **Shared asset resolver** used by Studio gang sheet loaders, builder placement, ZIP export, and gang PNG export
3. **Studio Print Request** mapper + item cards + summaries + selection (upload-safe)
4. **ShowAllocation** create/update (Studio `allocatePrintRequestItem`) + Firestore rules for upload branch
5. **`queuePortalPrintRequestToShow`**: remove C temporary upload block; write source-aware allocations (same field set as Studio)
6. **Portal**: remove UI queue disable for upload items; keep ADR-FP-071 one-working-request rules
7. **GangSheetItem** writers/loaders/builder/preview; Storage path validation for `/customer-uploads/.../production.png`
8. **Show ZIP + gang PNG export** image request builders
9. **`onPrintRequestItemCreated`**: explicitly use `shouldIncrementDesignRequestCount` (no-op for uploads)
10. Docs: DATA_MODEL, ARCHITECTURE, BACKEND/FIREBASE, TESTING, SECURITY notes as needed
11. Deploy approved Functions + rules (+ indexes if any) to `fresh-prints-dev`; smoke harness covering queue → allocation → asset resolve (and unit tests for resolver)

### Out of Scope

- Studio `/imports` intake UI and staff promote/exclude (E)
- AI promotion lifecycle verification (F)
- Cleanup schedules / wipe target (G)
- Production deploy
- Changing locked upload size/transparency limits
- Phase 9 `customRequests`
- Fourth Studio design workspace
- Renaming every historical `originalPathSnapshot` field if a compatible alias/`assetPathSnapshot` can be documented (prefer additive: keep field name, broaden allowed path semantics)

### Explicit non-goals

- Do not write request/show/gang status onto `designs.status`
- Catalog exclusion / AI rejection do not delete production assets (E/F verify; D must not couple production paths to catalog review status)
- Do not require `designId` on upload-backed items

---

## Affected Areas

### New

| Path | Role |
|------|------|
| `packages/shared/src/utils/printAssetResolution.ts` (+ tests) | Resolve production/preview/thumb paths for catalog vs upload |
| `apps/studio/.../customer-uploads/services/customerUploadReadService.ts` (or under print-requests) | Staff read of own-needed upload docs (Admin not required; staff Firestore read already allowed) |
| `functions/scripts/smoke-customer-upload-subphase-d.mjs` | Dev smoke: attach → queue → allocation shape → asset paths |

### Modified (representative; implementer must cover inventory)

| Area | Paths |
|------|-------|
| Shared types | `showAllocation.types.ts`, `gangSheet.types.ts` |
| Functions | `queuePortalPrintRequestToShow.ts`, `onPrintRequestItemCreated.ts` |
| Firestore rules | `showAllocationRequiredFieldsValid`, `gangSheetItemRequiredFieldsValid` |
| Studio print requests | `printRequestService.ts` mapper/writers, item cards, summaries, selection mode, pages |
| Studio shows | `upcomingShowService.ts` allocate + map; AddToShowModal labels |
| Studio gang sheets | `gangSheetService.ts`, `useGangSheetShowAssets.ts`, `useGangSheetBuilder.ts`, builder page |
| Studio export | `useExportShowZip.ts`, `useExportGangSheetPng.ts` (+ storage URL helper if needed) |
| Portal | `PrintRequestDetailView` queue CTA; any remaining C guard copy |

### Reuse

- `printRequestItemSource.ts`, Portal `mapPrintRequestItem`, `customerUploadStoragePaths`, C attach item shape
- Electron export services already take `downloadUrl` — fix upstream builders only

---

## Architecture Impact

- [x] One shared resolver for “what PNG do we print for this line/allocation?”
- [x] Studio UI remains thin; services own Firestore + storage URL fetch
- [x] No Electron imports in Portal; no Portal-only assumptions in Studio services
- [x] Catalog and upload remain distinct provenance until staff promotion (E/F)

---

## Security Impact

- [x] Firestore rules: allocation/gang create for upload items must not require ready catalog design; still require staff (or trusted callable for Portal queue)
- [x] Customers still cannot invent upload-backed allocations client-side except via `queuePortalPrintRequestToShow` Admin writes
- [x] Storage: customers already read own upload paths; staff already read `customer-uploads/**` — no rule weakening for isolation
- [x] Do not allow clients to point gang sheets at arbitrary Storage paths — snapshot from owned upload/design docs only

---

## Data Model Impact

### Field invariants (binding)

| Entity | Catalog (`sourceType` absent or `catalog_design`) | Upload (`sourceType: customer_upload`) |
|--------|---------------------------------------------------|----------------------------------------|
| `PrintRequestItem` | non-empty `designId`; no `customerUploadId` | non-empty `customerUploadId`; **`designId` omitted** |
| `ShowAllocation` | non-empty `designId`; no `customerUploadId` | non-empty `customerUploadId`; **`designId` omitted**; title snapshot from filename |
| `GangSheetItem` | non-empty `designId`; `originalPathSnapshot` under `/originals/...png` | `customerUploadId` present; **`designId` omitted**; `originalPathSnapshot` = upload **production** path `/customer-uploads/{uid}/{uploadId}/production.png` |

Legacy docs without `sourceType` ⇒ treat as catalog.

### `ShowAllocation` (additive)

- `sourceType?: "catalog_design" | "customer_upload"` (missing ⇒ catalog)
- `designId?: string` — required for catalog; **omitted** for upload (never empty string)
- `customerUploadId?: string` — required for upload
- Keep `designTitleSnapshot` for display (upload: original filename / titleSnapshot)

### `GangSheetItem` (additive)

- Same source fields as needed for loaders
- Keep field name `originalPathSnapshot`; **broaden allowed path semantics** (no breaking rename): catalog `/originals/...png` **or** customer-upload production PNG path
- Rules regex updated accordingly

### Allocation payload parity (binding)

Portal `queuePortalPrintRequestToShow` and Studio `allocatePrintRequestItem` must write the **same** source-aware field set for a given print request item.

- Prefer a pure shared builder in `packages/shared` (e.g. `buildShowAllocationFieldsFromPrintRequestItem`) consumed by the callable and mirrored by Studio.
- If Studio cannot import a functions-only helper, document a key-by-key parity checklist in the implementation PR/signoff and cover both writers in tests.

### Migration

- Additive only; no backfill required
- Legacy allocations without `sourceType` remain catalog
- Rollback: re-enable Portal queue guard; hide staff place for uploads (not preferred once D ships)

---

## Backend Impact

### `queuePortalPrintRequestToShow`

1. Remove C temporary `PORTAL_UPLOAD_ITEMS_NOT_QUEUEABLE_MESSAGE` block
2. For each item: if upload → require `customerUploadId`, load upload (ready, owned by request customer), omit `designId` on allocation, set source fields + title snapshot
3. If catalog → require non-empty `designId` as today
4. Capacity / show schedule checks unchanged

### `onPrintRequestItemCreated`

- Call `shouldIncrementDesignRequestCount` explicitly; never touch `designs` for upload items

### Deploy (`fresh-prints-dev`, standing auth)

```bash
firebase deploy --only functions:queuePortalPrintRequestToShow,functions:onPrintRequestItemCreated,firestore:rules --project fresh-prints-dev
```

(Include indexes only if new composite queries are required.)

---

## UI / UX Impact

### Studio

- Request detail/cards show upload title + preview; qty/size editable per existing patterns
- Add-to-show and Show Queue list upload lines without requiring Design Library
- Gang sheet tray/canvas places upload production assets; preview thumbs from upload derivatives
- Export ZIP/PNG includes upload production files

### Portal

- Re-enable **Add to show** when request has upload items (after D deploy + smoke)
- Copy: no longer show C “not ready for show queue” banner

---

## Approach

1. Shared types + invariant helpers + `printAssetResolution` utils + unit tests
2. Shared allocation field builder (parity) + Firestore rules for allocation + gang sheet upload branches
3. Studio print request mapper/UI (unblock Studio loading mixed requests)
4. Studio allocate + Portal queue callable (source-aware writes; remove C server queue block only after step 9 smoke)
5. Gang sheet assets/builder/rules
6. Export builders (unit-test resolver; Electron export consumes URLs)
7. Portal UI: remove C queue disable **only after** D smoke PASS
8. Wire `onPrintRequestItemCreated` to `shouldIncrementDesignRequestCount`
9. Docs + deploy + smoke + typechecks/builds
10. Signoff D → plan E

**Hard gate:** Do not remove Portal UI / server C upload queue guards until D smoke PASS on `fresh-prints-dev`.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Unit: `printAssetResolution`, source helpers, allocation field builder | yes |
| Unit: export/gang image-request builders with mocked URLs (if Electron harness impractical) | yes |
| Functions build | yes |
| Portal typecheck + build | yes |
| Studio typecheck on D-touched files | yes — fix D-touched errors; document unrelated pre-existing Studio failures without expanding scope |
| Smoke D on `fresh-prints-dev` | yes |

### Smoke checklist (dev)

- [ ] Upload item attaches (reuse C)
- [ ] **Upload-only** Portal queue-to-show succeeds; allocation omits `designId`, has `customerUploadId` + `sourceType`
- [ ] **Mixed** catalog + upload queue succeeds; both allocation shapes correct
- [ ] **Catalog-only** queue regression unchanged
- [ ] Studio Add to Show can allocate upload item (manual or harness-assisted)
- [ ] Shared resolver returns upload production path for upload allocations
- [ ] Gang sheet placement unit/integration: `originalPathSnapshot` is upload production path
- [ ] Show ZIP / gang PNG image-request builders include upload assets (unit or smoke)
- [ ] Catalog item still increments `requestCount`; upload item does not
- [ ] Production path resolution ignores `catalogReviewStatus` (exclusion does not break fetch)
- [ ] Portal UI queue re-enabled only after this smoke PASS

### Manual / owner

- Deferred to G consolidated visual checkpoint unless smoke cannot cover Studio UI

---

## Human Checkpoints Anticipated

- [ ] New npm dependency — **none expected**
- [ ] Production deploy — no
- [ ] Owner visual — deferred to G

---

## Risks

| Risk | Mitigation |
|------|------------|
| Missed `designId` hard-require in Studio | Follow explore inventory; grep `designId` in Studio show/gang/export before signoff |
| Rules reject upload allocation/gang writes | Dual-branch validators mirrored from printRequestItems |
| Export skips null designs | Shared resolver required before export hooks |
| Scope creep into E intake UI | Explicit out of scope |
| Portal queue opens before Studio export ready | Deploy Functions+rules and pass smoke before removing UI guard |

---

## Acceptance Criteria

- [ ] Legacy items without `sourceType` behave as `catalog_design`
- [ ] Catalog items require `designId`; upload items require `customerUploadId` and omit `designId`
- [ ] Customer-upload items use production PNG through show → gang → export
- [ ] Upload items do not increment design `requestCount`
- [ ] Catalog exclusion / AI status does not break production asset resolution
- [ ] No request/production status written to `designs.status`
- [ ] Existing catalog-design workflows unchanged
- [ ] C temporary Portal queue block removed after verified source-aware queue
- [ ] D smoke PASS on `fresh-prints-dev`

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Yes — project docs only |
| Development History | No |

---

## Open Questions

None blocking — parent ADR-FP-073 and C attach shape are authoritative.
