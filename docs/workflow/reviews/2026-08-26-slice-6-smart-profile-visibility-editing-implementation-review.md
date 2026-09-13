# Slice 6 Smart Profile Visibility + Editing — Implementation Review

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Plan | `docs/workflow/plans/2026-08-26-slice-6-ready-design-smart-profile-visibility-editing-plan.md` |
| Formal review | `approved_with_changes` (binding requirements implemented) |
| Verdict | **approved** |

## Scope delivered

- Studio Design Details: Smart Catalog Profile section (Missing / Older / Current via shared resolver)
- All 11 dimension lists + automation summary in Design Details
- Audit & Technical Details: Smart Catalog provenance block
- Owner/admin Smart Profile edit modal with per-dimension Reset to AI
- Functions callables with fail-closed ready+approved guards
- `smartProfileAiSnapshot` on AI enrichment success (queue + ready_backfill)
- Ready backfill staff-dimension merge preservation
- Preservation diagnostic fix (`readyApprovalAuditUnchanged` semantic Timestamp compare)
- ADR-FP-147 + DATA_MODEL / BACKEND updates

## Binding requirements checklist

| Requirement | Status |
|-------------|--------|
| Shared `resolveSmartProfilePipelineStatus()` | Done |
| Callable fail-closed unless ready + approved | Done |
| Validate `staffEditedDimensionKeys` against canonical enum | Done |
| `smartProfileAiSnapshot` on every AI Smart Profile write | Done |
| `ready_backfill` preserves staff-edited dimensions | Done |
| Card badges out of scope | N/A |
| No edit affordance when status != ready | Done |
| Client Firestore smartProfile writes denied | Unchanged (rules) |
| Owner/admin only edit (server enforced) | Done |
| Missing profile read-only | Done |

## Preservation comparison corrective

**Root cause:** `processReadyCatalogUnit` compared Firestore Timestamp fields with `===`, producing false `approvalAuditUnchanged: false` when before/after were separate Timestamp instances with identical seconds/nanoseconds.

**Fix:** `packages/shared/src/utils/firestoreFieldEquality.ts` + worker uses `readyApprovalAuditUnchanged()`.

## Risks / notes

- Callable integration tests against live Firestore not run (permission guard + merge unit tests only).
- Owner manual QA on canary designs still pending DEV callable deploy + Studio reload.
- Reset button shown when snapshot document exists; per-dimension empty snapshot still resets via callable.

## Test evidence

| Check | Command | Result |
|-------|---------|--------|
| Shared utils | `npx tsx --test packages/shared/src/utils/firestoreFieldEquality.test.ts packages/shared/src/utils/smartProfileStaffEdit.test.ts` | pass (33 assertions) |
| Functions merge/snapshot | `npx tsx --test functions/src/ai/smartProfileEnrichmentWrite.test.ts` | pass |
| Callable permissions | `npx tsx --test functions/src/designs/updateDesignSmartProfileDimensions.test.ts` | pass |
| Slice 6 contracts | `npx tsx --test functions/src/catalogReprocess/catalogReprocess.slice6.contract.test.ts` | pass |
| Studio contracts | `npx tsx --test apps/studio/.../designSmartProfileSection.contract.test.ts` | pass |
| Functions build | `npm --prefix functions run build` | pass |
| Studio tsc | `npx tsc --noEmit` (apps/studio) | pass |

## DEV deploy allowlist (not executed)

Deploy to `fresh-prints-dev` only:

- `updateDesignSmartProfileDimensions`
- `resetDesignSmartProfileDimension`

No redeploy required for Algolia sync trigger (unchanged). Optional: redeploy `onCatalogReprocessJobWritten` only if preservation worker fix must ship separately from prior deploy — **included in this implementation** but worker was already deployed; owner may redeploy worker on next Functions batch for semantic audit flag fix.

## Signoff gate

Implementation review **approved**. Hard stop respected: no DEV deploy, no canary rerun, no full Ready Catalog.
