# Signoff: Stage 4 — Generated publisher retirement (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-4-publisher-retirement-plan.md` |
| Plan review | `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-plan-review.md` (**approved_with_changes**) |
| Test report | `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-test-report.md` |
| Implementation review | `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-implementation-review.md` (**APPROVED**) |
| Delete record | `docs/workflow/reviews/2026-08-07-stage-4-publisher-delete-dev-record.md` |
| Spike attribution | `docs/workflow/reviews/2026-08-07-stage-4-post-delete-142-spike-attribution.md` |
| Final status | **approved_with_notes** |

---

## Summary

Stage 4 complete on **`fresh-prints-dev`**: Portal no longer uses generated search/facet Storage; publisher Function **source** retired; six publisher Functions **deleted** from live `fresh-prints-dev`; Algolia sync/reconcile retained and redeployed. Owner post-delete QA **PASS**.

**Stage 5 Storage cleanup, Stage 6 / production Function delete, PR #40 merge, and production are not authorized by this signoff.**

---

## Changes Delivered

### Behavior
- Algolia ON: search / multi-tag / facets via Algolia; Firestore ordinary browse unchanged
- Algolia OFF: Firestore browse healthy; managed search/facets fail closed; **no** generated Storage fallback
- Design writes no longer trigger portal-catalog full publications (~1.1K C+T+R / ~120s class)
- Algolia per-design sync remains

### Six Functions deleted (live + source)

1. `onCategorySnapshotSourceWritten`  
2. `onTagSnapshotSourceWritten`  
3. `onPortalCatalogSnapshotSourceWritten`  
4. `onPortalCatalogPublicationStateWritten`  
5. `rebuildCatalogSnapshots`  
6. `retryPortalCatalogPublication`

### Kept live

- `syncPortalCatalogDesignToAlgolia`
- `reconcilePortalCatalogAlgoliaIndex`
- `reconcilePortalCatalogAlgoliaIndexScheduled`

### Classifier

`functions/src/algolia/portalCatalogChangeClassifier.ts`

### Documentation

- ADR-FP-126 (`DECISIONS.md`), `BACKEND.md`, workflow/handoff updates

---

## Tests

### Automated
- 114/114 focused suite (source Implement)
- Portal + Functions typecheck; touched eslint; `git diff --check`

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| `STAGE 4 PUBLISHERS DELETED: PASS` | PASS | owner |
| `ALGOLIA POST-DELETE SMOKE: PASS` | PASS | owner |
| NO PUB SPIKE (publisher class) | PASS (attribution) | agent + owner context |
| `ALGOLIA OFF: PASS` | PASS | owner |
| `STAGE 4 POST-DELETE QA: PASS` | PASS | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Stage 4 planning | obtained | 2026-08-07 | `APPROVE STAGE 4 PLANNING` |
| Stage 4 implement | obtained | 2026-08-07 | `APPROVE STAGE 4 IMPLEMENT` |
| Dev Function delete | obtained | 2026-08-07 | `APPROVE DEV FUNCTIONS DELETE: STAGE 4 PUBLISHERS` |
| Production / Stage 5 / Stage 6 / PR merge | **not obtained** | | Separate phrases required |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Generated Storage objects still exist | low | Stage 5 dry-run cleanup |
| Studio ~1.1K taxonomy hydrate on design edit | low / known | Not publisher class; P2 accepted; spike attribution 4:42 PM |
| Prod still has publishers | medium | Stage 6 / separate prod delete auth |
| Uncommitted Stage 4 source on branch | process | Commit when owner requests |

---

## Deferred Items (Roadmap)
- **Stage 5** — Storage / `snapshotPublicationState` / Rules cleanup (dry-run + approval)
- **Stage 6** — Production promotion / prod Function delete / PR #40 merge
- TD-030 — details/share Add-to-Request quantity-control parity

---

## Open Blockers
- [x] None for Stage 4 on `fresh-prints-dev`

---

## Verdict

**approved_with_notes** — Stage 4 complete on development. Notes: Studio taxonomy hydrate may still spike Console reads on edit; Storage objects retained until Stage 5; production untouched.

---

## Confirmations
- No Stage 5 started  
- No Stage 6 / production Function delete  
- No PR #40 merge  
- No production deploy  
- Publisher class retired on **dev** only  
