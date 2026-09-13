# Read-only Source-Delta Reconciliation: Assisted Creation Multi-Proof Selection

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `assisted-creation-multi-proof-selection` |
| Compared against | Signed-off `portal-assisted-final-artwork-progress-and-readd-corrective` source |
| Plan | `docs/workflow/plans/2026-09-12-assisted-creation-multi-proof-selection-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-review.md` |
| Classification | **B — PLAN NEEDS MINOR AMENDMENT** |
| Runtime change in this reconciliation | **None** |

## Read-only finding

The multi-proof architecture remains compatible with the signed-off Assisted Add-to-Request
corrective. Proof rounds/options remain an additive extension of `proofs[]`; final-source-first
download/Add-to-Request authority remains separate; and the progress/re-add state is orthogonal to
proof selection. No material architectural conflict requires a new Formal Review.

The Plan nevertheless needs a minor source-aware amendment before implementation because the signed-
off corrective changed shared Assisted request parsing and the Portal Assisted detail/modal contract.

## Exact overlap and required notes

### `packages/shared/src/types/assistedCreation/assistedCreation.types.ts`

The signed-off source now includes `AssistedCreationAddToRequestProgressStage`,
`AssistedCreationAddToRequestProgress`, and optional `AssistedCreationRequest.addToRequestProgress`.
Multi-proof types must add round/option fields without replacing or narrowing these progress fields.

### `apps/portal/features/assisted-creation/services/assistedCreationService.ts`

`parseRequestDoc` now parses a whitelisted, stale-aware `addToRequestProgress` value from the
existing customer request subscription. Multi-proof parsing changes must merge into this parser and
preserve the stale-progress guard; they must not treat progress as proof-round state or drop it while
adding round/selection fields.

### `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`

The signed-off final-artwork card passes `request.addToRequestProgress` to the existing progress
modal and calls Add-to-Request directly without catalog consent. Multi-proof proof-card/detail work
must preserve that prop wiring, direct no-consent behavior, final-source preference, and the existing
remove/re-add/idempotency path. If the file is edited for round display, rebase against this final
source rather than replacing the approved card.

### `apps/portal/features/assisted-creation/components/AssistedAddToRequestProgressModal.tsx` and CSS

The existing modal now owns customer-safe server-stage mapping, elapsed time, Step N of M, remaining
steps, and stale-progress completion handling. Multi-proof must reuse this modal and must not add a
second progress modal or client-simulated stage/ETA logic.

### Add-to-Request callable/resolver boundary

The signed-off callable is not part of the multi-proof runtime allowlist, but selected-proof changes
must continue to set the authoritative `approvedProofId`/final-source lineage consumed by its
resolver. If implementation discovers a need to edit the callable or shared resolver, stop and
reconcile that overlap against the signed-off corrective before implementation.

## Sequencing and implementation notes

1. Do not implement multi-proof until the separate sentinel corrective and the Staff Artwork neutral-
   projection corrective are both resolved according to the parent gate.
2. Before implementation, amend the multi-proof Plan/Review implementation allowlist and tests with
   the overlap notes above; no new runtime design is required.
3. Rebase/merge source edits against the signed-off progress/re-add files. Preserve the existing
   direct Assisted Add-to-Request call, progress prop, parser/stale guard, and modal behavior.
4. Add regression coverage showing multi-proof selection still preserves final-source-first
   Add-to-Request, approved-proof fallback, live progress rendering, and remove/re-add idempotency.
5. Keep the multi-proof Plan/Formal Review history independent; do not fold this reconciliation or
   either corrective's Signoff into the multi-proof feature history.

## Disposition

Classification **B — PLAN NEEDS MINOR AMENDMENT**. The plan remains viable after these source-aware
notes. No implementation, deployment, staging, commit, push, freeze, parent M0, or production action
was performed.

---

## Post-Signoff update (2026-09-12)

Staff Artwork, sentinel, progress/re-add, and final-artwork-ready-email children are now **signed
off**. The Classification-B Plan amendment has been applied to the multi-proof Plan and Formal
Review (including final-artwork-ready-email coexistence as an additional **B** overlap — not **C**).

See:

- `docs/workflow/plans/2026-09-12-assisted-creation-multi-proof-selection-plan.md`
- `docs/workflow/reviews/2026-09-12-assisted-creation-multi-proof-selection-classification-b-amendment.md`
- Formal Review § “Classification-B source-aware amendment (2026-09-12)”

Next checkpoint: **OWNER ACCEPT MULTI-PROOF PLAN AMENDMENT + AUTHORIZE IMPLEMENT**.
