# Firestore Rules Reconciliation — Owner Show Editing (DEV QA enabler)

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal context | `show-queue-needs-attention-did-not-print-recovery` (QA enabler) |
| Target | `fresh-prints-dev` only |

## Baselines compared

| Baseline | Notes |
|----------|-------|
| `git HEAD` (`7dfd7ee`) | Last committed rules; **missing** recovery + owner edit + parallel feature deltas |
| `fresh-prints-dev` (inferred) | Initial recovery deploy (`2026-08-29`) published working-tree rules at that time; corrective function deploys did **not** redeploy rules |
| Local working tree | HEAD + ~331 lines (mixed categories) |

**Could not download live DEV rules** (Firebase Rules API quota-project blocked). Reconciliation uses deploy history + git diff classification.

## Diff classification (local vs git HEAD)

### Category A — Did Not Print recovery (likely already on DEV)

- `needsStaffRequeue*` optional fields on `printRequests`
- `requeuedFromAllocationId` on `showAllocations`
- `devFixtureUpcomingShowFieldsValid`, `dev_fixture` create/update paths
- `isValidShowProductionResolutionKind` / `productionResolutionKind` on shows
- `unfulfilled_requeue` resolution enum (may have been added locally after initial deploy)

### Category B — Owner Show Editing (authorized now)

- `ownerCanUpdateUpcomingShowMetadata()` — narrow metadata-only owner path
- `allow update: if ownerCanUpdateUpcomingShowMetadata() || …` on `upcomingShows`

**Rule contract:** `hasOnly` on diff keys (`title`, `whatnotUrl`, `scheduledStartAt`, `notes`, `updatedBy`, `updatedAt`); preserves `productionStatus`, capacity, resolution fields; locks `whatnotShowId` / `devFixtureSentinel`.

### Category C — Unrelated / other phases (present in working tree vs HEAD)

- Smart profile / design inbox preview control (`smartProfile`, `designInboxPreviewControlUpdate`, artwork background)
- Design import batch metadata fields
- Print request creation snapshot fields
- Catalog automation / AI settings collections
- Staff inbox suppressions collection
- Other expression-budget-heavy validators

**Risk:** If Category C was **not** on DEV at initial deploy, deploying local `firestore.rules` would publish Category C.

**Mitigating evidence:** Category C hunks were already in the modified working tree at session start; initial recovery deploy published working-tree rules before later function-only correctives. **Estimated net delta vs DEV:** Category B (+ possible `unfulfilled_requeue` enum if post-deploy).

## Isolation method

No git stash/reset of working tree. Deploy uses current `firestore.rules` after:

1. Lightweight owner metadata rule (avoids `upcomingShowRequiredFieldsValid` expression budget blow-up)
2. Emulator verification on exact file (`tests/firebase/showQueueAllocation.rules.test.ts` — **18/18 pass**)

If Category C were absent on DEV, the safer isolation would require a fetched DEV snapshot + patch — **not available** in this session.

## Authorized deploy scope

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

**Not deployed:** Functions, indexes, Storage, Hosting, Portal, production.
