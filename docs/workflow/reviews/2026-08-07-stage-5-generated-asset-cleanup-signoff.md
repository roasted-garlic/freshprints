# Signoff: Stage 5 — Generated-asset cleanup (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Signoff by | Signoff Agent |
| Owner authorization | `APPROVE STAGE 5 SIGNOFF` |
| Plan | `docs/workflow/plans/2026-08-07-stage-5-generated-asset-cleanup-plan.md` |
| Plan review | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-plan-review.md` (**approved_with_changes**) |
| Implementation review | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-implementation-review.md` (**APPROVED**) |
| Test report | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-test-report.md` (**passed_with_notes**) |
| Dry-run | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-dry-run-record.md` |
| Storage delete | `docs/workflow/reviews/2026-08-07-stage-5-storage-delete-dev-record.md` |
| Post-delete verify | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-post-delete-verify-fresh-prints-dev.json` |
| Resilience corrective | `docs/workflow/reviews/2026-08-07-stage-5-apply-resilience-corrective-implementation-review.md` (**APPROVED**) |
| Rules deploy | `docs/workflow/reviews/2026-08-07-stage-5-rules-deploy-dev-record.md` |
| Prerequisite | Stage 4 Signoff `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-signoff.md` |
| Final status | **approved_with_notes** |
| Project | **fresh-prints-dev** only |

---

## Summary

Stage 5 is **complete on `fresh-prints-dev`**: allowlisted generated Storage (`generated/portal-catalog/`, `generated/catalog-reference/`) and orphan `snapshotPublicationState` docs were dry-run inventoried, deleted (with approved resilience corrective after partial APPLY failures), and verified empty; Firestore/Storage Rules were narrowed and deployed to **dev only**. Stage 4 publisher retirement remains intact. No production / Stage 6 / PR merge was performed under Stage 5.

---

## Changes Delivered

### Behavior / ops (`fresh-prints-dev`)

- Ops script `functions/scripts/stage5-generated-asset-cleanup.mjs` + guard/apply libs (dev-pinned; `APPLY=1` required for destructive)
- Generated Storage prefixes emptied
- `snapshotPublicationState` emptied (2 → 0)
- Storage Rules: removed public-read matches for generated catalog paths → default-deny
- Firestore Rules: removed `snapshotPublicationState` match → default-deny

### Kept by design

- Shared `catalog-snapshots` types (KEEP)
- Portal asset stubs / Stage 4 fail-closed (no generated fallback restored)
- Algolia sync/reconcile Functions (not redeployed as part of Stage 5)

---

## Acceptance criterion reconciliation

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Allowlisted Storage prefixes only | **PASS** |
| 2 | No `originals/` `thumbnails/` `previews/` `display/` | **PASS** |
| 3 | No `customer-uploads/` | **PASS** |
| 4 | `snapshotPublicationState` bounded | **PASS** |
| 5 | Stage 4 publishers stayed retired | **PASS** |
| 6 | No generated Portal runtime restored | **PASS** |
| 7 | Algolia / FS browse compatible with Stage 4 | **PASS** (covered by Stage 4 Signoff; optional post-Rules smoke deferred) |
| 8 | Firestore Rules narrowed | **PASS** |
| 9 | Storage Rules narrowed | **PASS** |
| 10 | Rules deploy `fresh-prints-dev` only | **PASS** |
| 11 | Plan tests | **PASS WITH NOTES** (Rules emulator unrun — no Java; live Rules compiled) |
| 12 | Partial APPLY resolved via resilience corrective | **PASS** |
| 13 | Final verify empty | **PASS** (post-delete JSON 2026-08-08T00:12:49Z) |
| 14 | No production modified | **PASS** |
| 15 | Optional manual smoke | **Optional / non-blocking** — Stage 4 smoke covers runtime contract |

Formal Review RCs 1–4: **PASS** (residue check, negative checklist, hard-refuse guard, non-callable ops script).

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| Stage 5 guard + apply unit tests | PASS (source Implement / corrective reports) |
| Containment / typecheck / eslint / `git diff --check` | PASS |
| `npm run test:rules` | **Not re-run** — no Java locally; documented in test + Rules deploy records |

### Manual / live

| Test | Result | Approved by |
|------|--------|-------------|
| `STAGE 5 DRY-RUN: PASS` | PASS | owner |
| `APPROVE DEV STORAGE DELETE: STAGE 5` + `STAGE 5 STORAGE DELETED: PASS` | PASS | owner |
| Agent post-delete list-only empty verify | PASS | agent |
| `APPROVE DEV RULES DEPLOY: STAGE 5` | PASS (exit 0) | owner |
| Optional post-Rules Algolia smoke | **Not separately recorded** | classified optional; Stage 4 Signoff covers browse/search contract |

---

## Human Approvals Obtained

| Approval | Status |
|----------|--------|
| Stage 5 planning / implement / dry-run / delete / Rules deploy | obtained (prior phrases) |
| `APPROVE STAGE 5 SIGNOFF` | obtained (this pass) |
| Production Storage/Rules / Stage 6 / PR #40 merge | **not obtained** |

---

## Risks & Known Issues (non-blocking notes)

1. Rules emulator suite still unrun locally (no Java); live Rules compile + deploy succeeded on dev.
2. Owner used `STAGE 5 STORAGE DELETED: PASS` rather than plan phrase `STAGE 5 POST-DELETE QA: PASS` — treated as equivalent with agent empty verify.
3. Optional post-Rules Portal Algolia ON/OFF Network smoke deferred; Stage 4 Signoff already validated fail-closed / browse.
4. Production generated-asset cleanup is **not** authorized by this Signoff (script hard-pinned to `fresh-prints-dev`).
5. Shared types / stubs remain by design.

---

## Deferred Items

- Stage 6 / PR #40 production promotion (separate plan)
- Production Storage cleanup dry-run/delete (separate procedure + phrases)
- Optional fresh post-Rules Portal smoke if owner wants belt-and-suspenders

---

## Open Blockers

- [x] None for Stage 5 on `fresh-prints-dev`

---

## Verdict

**approved_with_notes**

Stage 5 generated-asset cleanup is **closed** on `fresh-prints-dev`. Notes above are non-blocking. No production promotion implied.

---

## Confirmations

- NO live Stage 5 action re-run this pass
- NO production mutation
- NO PR merge
- NO Stage 6 auto-start
