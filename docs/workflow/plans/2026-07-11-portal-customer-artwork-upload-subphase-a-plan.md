# Plan: Portal Customer Artwork Upload — Sub-phase A (Shared Contracts)

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` (revised; approved_with_changes) |
| Related | `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-subphase-a-review.md` — **approved** |

---

## Goal

Land **shared contracts and documentation only** for customer-provided request artwork: types, enums, storage path helpers, upload limit constants, pure transparency assessment + tests, ADR-FP-073, and security/data-model design docs. No Portal UI, no Functions callables, no rules deploy, no request-item runtime wiring beyond additive optional fields/helpers that keep existing catalog items compiling.

---

## Scope

### In Scope

- `packages/shared` types: `customerUploads` / `customerUploadBatches` + technical & catalog status enums + failure codes
- Additive optional fields on `PrintRequestItem`: `sourceType?`, `customerUploadId?`, `titleSnapshot?` (keep `designId: string` required until Sub-phase D)
- Source-resolution helpers (default missing `sourceType` → `catalog_design`)
- `customerUploadStoragePaths` helpers (source, production, preview, thumbnail, batch ZIP)
- Customer upload limit + daily abuse constants (locked values from parent plan)
- Pure `assessMeaningfulTransparency` (+ unit tests)
- Studio `FIRESTORE_COLLECTIONS` entries for the two new collections
- ADR-FP-073 in `DECISIONS.md` (Phase 8 artwork ≠ Phase 9 `customRequests`)
- Doc updates: `DATA_MODEL.md`, `ARCHITECTURE.md`, `SECURITY.md` (design), `ROADMAP.md` fast-follow note, `RISK_REGISTER.md` entry

### Out of Scope

- Cloud Functions, Storage/Firestore rules deploy, indexes deploy
- Portal upload UI; Studio intake UI
- Making `designId` optional; ShowAllocation / GangSheetItem runtime changes
- ZIP extraction, sharp processing, wipe target
- Sub-phases B–G

---

## Approach

1. Add shared type/constant/util modules matching parent plan lock-downs.
2. Keep all changes additive so Studio/Portal/Functions still typecheck.
3. Document security model and data model; do not deploy rules.
4. Run shared transparency unit tests + lint/typecheck smoke for touched packages.

---

## Test Strategy

| Check | Command |
|-------|---------|
| Unit | `npx tsx --test packages/shared/src/utils/customerUploadTransparency.test.ts packages/shared/src/utils/printRequestItemSource.test.ts` (and any new tests) |
| Lint | `npm run lint` (or scoped if full lint is noisy) |
| Shared consumers | `npm --prefix apps/studio exec tsc -- --noEmit`; `npm run typecheck --workspace @fresh-prints/portal` |

---

## Human Checkpoints

- None for Sub-phase A (docs + shared types only). Wipe already parked by owner for this goal switch.

---

## Approval

- Review: **approved** (2026-07-11)
- Implementation: in progress / complete with this session’s shared contracts land
