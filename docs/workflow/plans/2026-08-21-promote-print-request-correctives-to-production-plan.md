# Plan: Promote Print Request Correctives to Production

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `promote-print-request-correctives-to-production` |
| Related | docs/workflow/reviews/2026-08-21-promote-print-request-correctives-to-production-review.md |

---

## Goal

Promote the two already signed-off DEV Print Request goals from protected `development` to production, with separate human checkpoints for Git, production Firestore indexes, one Cloud Function, Portal App Hosting, and Studio release. Do not reopen or reimplement either goal.

## Background

Checkout verified 2026-08-21 after `git fetch origin development production`:

| Item | Value |
|------|-------|
| Local branch | `development` |
| Local HEAD | `eaf52e7265c9dbc3f1a82782380f9b899ebbe9a7` |
| `origin/development` | `eaf52e7265c9dbc3f1a82782380f9b899ebbe9a7` |
| `origin/production` | `99b230333efd9a4892f8c4a30ccf72008baf2246` |
| HEAD == `origin/development` | **yes** |
| Working tree (promotion source) | **clean at `eaf52e7`**. This planning pass dirties only `.cursor/workflow/state.md` (not part of the promotion SHA). |
| `4865c2b` ancestor of `origin/development` | **yes** |
| `bdadd30` ancestor of `origin/development` | **yes** |
| Production-only commit | `99b2303` Merge PR **#83** (expected merge commit; not product divergence) |
| Ahead/behind | `origin/production...origin/development` = **1 / 5** |

Live Portal: `fresh-prints-portal-build-2026-08-19-001` @ `99b2303` **100%** on `https://myprintrequest.com`. Rollback pin: `fresh-prints-portal-build-2026-08-18-001` @ `cb006bd`.

Phase 9 remains PARKED. This is promotion, not new feature work.

---

## 1. Exact SHAs

| Side | SHA |
|------|-----|
| `origin/development` | `eaf52e7265c9dbc3f1a82782380f9b899ebbe9a7` |
| `origin/production` | `99b230333efd9a4892f8c4a30ccf72008baf2246` |

Post-merge production SHA is **unknown until Gate A merge**. Record it then. App Hosting / Function / Studio must use that exact SHA (or an ancestor reachable from `origin/production` after merge).

---

## 2. Full commit range entering production

`origin/production..origin/development` (5 commits):

| SHA | Message | Classification |
|-----|---------|----------------|
| `1b967fd` | docs(workflow): close out portal PR 83 production rollout | **documentation only** — records already-live PR #83 |
| `4865c2b` | feat(print-requests): keep requested sizes through queue and Add Designs | **signed-off and approved for this promotion** — `print-request-shared-sizing-and-queue-integrity` |
| `1bad0f5` | docs(workflow): record print-request sizing commit on development | **documentation only** |
| `bdadd30` | feat(print-requests): split Studio customer and internal lists | **signed-off and approved for this promotion** — `studio-print-request-customer-internal-list-split` |
| `eaf52e7` | docs(workflow): record print-request list-split commit on development | **documentation only** |

No unsigned-off, parked, or unknown implementation is in the range. **No STOP** on silent bundling of unfinished product work.

Studio **1.0.7** Helper Updates source (`7687354`) is **already an ancestor of `origin/production`**. This promotion does **not** newly bundle unpublished 1.0.7 feature work.

---

## 3. Product goals included

1. `print-request-shared-sizing-and-queue-integrity` (DEV signoff approved; owner DEV QA `PASS`)
2. `studio-print-request-customer-internal-list-split` (DEV signoff approved; owner Studio QA `PASS`)
3. Documentation closeout of already-live PR **#83** (`1b967fd`)

No other product goals.

---

## 4. Unrelated signed-off work

**None newly introduced.** 1.0.7 is already production-live as source and as a published GitHub Release.

---

## 5. Surfaces and files (from Git)

### Shared sizing / queue integrity (`4865c2b`)

- Shared: `printRequestItemSizing.ts`, queued-inches, persistence-health (+ tests)
- Portal: `PrintRequestDetailView.tsx`, `PortalPrintRequestItemCard.tsx`, `portalPrintRequestService.ts`, persistence-barrier contract test
- Studio Print Requests / Show Queue / gang / export as in that commit
- Function: `functions/src/lib/assertQueuePrintRequestItemSize.ts` (+ test) and `functions/src/queuePortalPrintRequestToShow.ts` only among Functions sources
- No Rules, Storage, Auth, secrets, Algolia, Phase 9

### Studio list split (`bdadd30`)

- Studio `/print-requests` kind switcher, query planner pair, routes, Show Queue omit-filter
- `firestore.indexes.json` adds **one** composite (below)
- No Portal/Functions/Rules in this commit

### Firebase

| Change | In range? |
|--------|-----------|
| Firestore Rules | **no** |
| Storage Rules | **no** |
| Indexes | **yes** — one new `printRequests` composite |
| Functions | **yes** — `queuePortalPrintRequestToShow` + new helper module only |
| `apphosting.yaml` / secrets | **no** |

### App Hosting (verified in repo)

| Item | Source |
|------|--------|
| Backend ID | `fresh-prints-portal` (`firebase.json` `apphosting[0].backendId`) |
| Root | `./apps/portal` |
| Project | `fresh-prints-prod` |
| Create command (established) | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit <merged-production-SHA> --force --non-interactive` |
| Agent create | historically hook-blocked; owner-local CLI is the established path |

---

## 6. Production Firebase changes

### Indexes (Gate B)

Required composite (in source **once**; **absent** from live `fresh-prints-prod` inventory):

```text
printRequests COLLECTION
isInternal ASC, queueTab ASC, updatedAt DESC, __name__ DESC
```

Live prod already has `isInternal + updatedAt` and `queueTab + updatedAt + __name__` separately. Those are **not** equivalent. Do not create a second copy of the four-field composite.

Deploy (no `--force`):

```bash
firebase deploy --only firestore:indexes --project fresh-prints-prod
```

If the CLI proposes **deleting** unrelated indexes: **STOP**. Do not confirm. Do not add another index if count queries fail.

Wait until the new composite is **READY** before Gate E.

### Function (Gate C)

```bash
firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-prod
```

Not a bare `functions` deploy. If the tool updates any other Function: **STOP**.

Capture currently deployed revision/source **before** deploy for rollback.

No schema/data migration. No `isInternal` backfill.

---

## 7. Portal rollout (Gate D)

Required. Sizing/persistence changed Portal files. Roll out **exact merged production SHA**. Do not change secrets, GA4, DNS, canonical domain, Auth, or Algolia.

Prior 100% rollback: `fresh-prints-portal-build-2026-08-19-001` @ `99b2303`.

---

## 8. Studio release (Gate E) — version STOP

| Fact | Evidence |
|------|----------|
| Published Studio | **1.0.7** GitHub Release **Latest**, tag `v1.0.7`, published 2026-08-16, not draft (`https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.7`), `targetCommitish` `62d790f8ca740e5c9d8c5b7c5b16b6feb7cbfdc0` |
| `apps/studio/package.json` on `development` and `production` | **1.0.7** |
| 1.0.7 source on `development` | yes (already on production too) |
| 1.0.7 published | **yes** |
| Release workflow | `.github/workflows/studio-release.yml` **hard-fails** unless package version is `1.0.7`; stable builds must be reachable from `origin/production`; Mac `internal-unsigned` / ADR-FP-136; does not auto-publish |

**Do not invent a next version.** Reusing **1.0.7** would overwrite/collide with the published tag/release and is forbidden.

**Gate E is blocked** until the owner names the next version (and authorizes the package.json + workflow expected-version change). That bump is **not** in `eaf52e7`. Do not publish Studio in this first pass.

Windows + Mac dual-arch workflow remains binding. Do not introduce Developer ID/notarization.

---

## 9. Production order after owner approvals

Unless a later checkpoint proves otherwise:

1. **Gate A** — PR `development` → `production`; merge only after merge phrase. No direct push.
2. **Gate B** — production indexes; wait READY.
3. **Gate C** — `queuePortalPrintRequestToShow` only.
4. **Gate D** — App Hosting from merged SHA; then Portal smoke.
5. **Gate E** — only after A–C (index READY) **and** owner version decision; draft then owner publish.

---

## 10. Production smoke tests (owner)

After applicable surfaces are live. Do not create destructive production fixtures solely for an edge case; defer that case instead.

### Portal sizing

1. High-resolution catalog design → ~`14 × 21.1` → adequate DPI accepted.
2. Refresh → size persists.
3. 200–299 DPI warns but allows.
4. Below 200 DPI blocks.
5. Greater than 22″ blocks.

### Portal → Show Queue

6. Queue the `14 × 21.1` request to a production-safe test show.
7. Studio Show Queue shows exactly `14 × 21.1` (no ~1″ or default ~10″).

### Studio sizing / Add Designs / Duplicate

8. Edit a Studio request to a valid size above the old envelope; save/reload preserves inches.
9. Resize an existing design; Add Designs an unrelated design; resized item remains once at its size.
10. Duplicate intentionally; second size; both copies remain.

### Customer / Internal

11. Print Requests defaults to Customer Requests; no internal rows.
12. Internal Requests; no customer rows.
13. Working / Queued / Printing / Printed counts kind-scoped.
14. Show Queue still accesses both kinds.

### Finish / Export

15. Start/Pause/Resume unchanged.
16. Past + Printing auto-finish on a **safe** test show, or mark deferred.
17. Mark Complete where applicable.
18. Export/gang uses requested physical dimensions.

Reply `PASS` / `FAIL:` / `PASS WITH NOTES:`.

---

## 11. Rollback pins

| Surface | Rollback |
|---------|----------|
| Git `production` | `99b230333efd9a4892f8c4a30ccf72008baf2246` (revert merge PR; never force-push) |
| App Hosting | `fresh-prints-portal-build-2026-08-19-001` @ `99b2303` (older: `build-2026-08-18-001` @ `cb006bd`) |
| Function | currently deployed `queuePortalPrintRequestToShow` on `fresh-prints-prod` (capture hash at Gate C **before** deploy, then redeploy that source) |
| Indexes | cannot un-build a READY composite cheaply; do not `--force` delete others. New index is additive. |
| Studio | remain on published **1.0.7** until a new version is published |

---

## 12. Human approval checkpoints

| Gate | Phrase (exact) | Then |
|------|----------------|------|
| A create | `APPROVE CREATE PRODUCTION PR: promote-print-request-correctives-to-production` | Open protected PR `development` → `production` from `eaf52e7`. **Do not merge.** |
| A merge | `APPROVE MERGE PRODUCTION PR #<n>: promote-print-request-correctives-to-production` | Merge via GitHub protected workflow. Record production SHA. |
| B | `APPROVE PROD INDEX: printRequests isInternal+queueTab` | Indexes deploy to `fresh-prints-prod` without `--force`. Wait READY. |
| C | `APPROVE PROD FUNCTION: queuePortalPrintRequestToShow` | Scoped Function deploy only. |
| D | `APPROVE PROD APP HOSTING ROLLOUT: <merged-SHA>` | Owner-local create if agent CLI is blocked. |
| E version | `APPROVE STUDIO VERSION: <x.y.z>` | Only then bump package.json + workflow pin. Owner invents/chooses the number. |
| E publish | `APPROVE STUDIO PUBLISH: <x.y.z>` | After draft + dual-platform smoke. |
| Prod QA | `PROD PRINT REQUEST CORRECTIVES QA: PASS` | Then production Signoff. |

This first pass **stops after Formal Review**. No PR, merge, or deploy yet.

---

## 13. Schema / data

**No schema or data migration is required.** Discriminator `isInternal` already exists. Missing-field documents stay omitted from equality queries; **do not** backfill in this release. Report separately if discovered.

---

## Scope

### In Scope

- Reconciliation (done)
- This Plan + Formal Review
- After owner phrases: PR, index, one Function, App Hosting, Studio release **per gates**
- Production smoke + Signoff
- Handoff/CURRENT-STATE/ROADMAP at Signoff

### Out of Scope

- Firestore/Storage Rules, Auth, secrets, Algolia, uploads, AI, taxonomy, Phase 9
- Schema/backfill/`isInternal` repair
- Duplicate request-item data cleanup
- Inventing a Studio version
- Reimplementing the two DEV goals

---

## Affected Areas

### Architecture / Security / Data / UI

- Architecture: no new layers. Promotion of existing Page → Hook → Service → planner → SDK and shared assess.
- Security: same permissions; Function size assert is trusted-server. No new public endpoints.
- Data: index only; no field/status change.
- Backend: one Function + indexes + App Hosting.
- UI: Portal sizing already signed off; Studio lists already signed off.
- Migration: **none**.

---

## Approach

1. Formal Review.
2. STOP for Gate A create phrase.
3. Execute gates in order with recorded evidence.
4. Owner production QA.
5. Production Signoff.

---

## Test Strategy

### Automated (run this session against `eaf52e7` source)

| Check | Command | Result |
|-------|---------|--------|
| Shared sizing | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts` | pass |
| Queued inches | `...printRequestQueuedInches.test.ts` | pass |
| Persistence health | `...printRequestItemPersistenceHealth.test.ts` | pass |
| Index JSON + duplicates | `...firestoreIndexesDuplicateValidation.test.ts` | pass |
| Composite exactly once | node identity count | **1** |
| List-split / Add Designs / routes / Finish | Studio + Portal focused `tsx --test` | 78 pass |
| `assertQueuePrintRequestItemSize` | Functions test | pass |
| `queuePortalPrintRequestToShow` scoped tests | validation + source contracts | 17 pass |
| Schedule grouping / Past+Printing | `showScheduleGrouping.test.ts` | 23 pass |
| Studio `tsc --noEmit` | cwd `apps/studio` | 0 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 |
| Functions build | `npm --prefix functions run build` | 0 |
| Lint | `npm run lint` | 0 |
| Studio Vite build | `npx vite build` cwd `apps/studio` | 0 |
| Functions lint script | none in `functions/package.json` | skip — documented |
| Portal `build:portal` | `npm run build:portal` | **blocked** — local `npm run dev:portal` holds `apps/portal/.next/trace` (EPERM). Not a product compile error. Portal typecheck passed. App Hosting builds in cloud at Gate D. Retry locally after next-dev is stopped. |
| Full Studio installer | `npm run build:studio` / GHA | **deferred to Gate E** (version unresolved; workflow pins 1.0.7) |
| `git diff --check` | `origin/production..origin/development` | **fail** — trailing whitespace on three lines of already-committed plan markdown `docs/workflow/plans/2026-08-20-studio-print-request-customer-internal-list-split-plan.md`. Documentation only. Do not rewrite development history this pass. |

### Manual

Owner production smoke in §10 after surfaces are live.

---

## Human Checkpoints Anticipated

- [x] Production deploy (Gates A–E, each separately)
- [x] Studio version decision (Gate E) — **blocking for publish, not for Git/index/Function/Portal**
- [ ] Database migration — none
- [ ] Secrets / env — none
- [x] Manual production QA

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Index deploy `--force` deletes extras | high | Never `--force`; STOP on deletion prompt |
| Count query wants a second index | medium | STOP; do not add silently |
| Function deploy fans out | high | Scoped `--only functions:queuePortalPrintRequestToShow`; STOP if others change |
| Studio 1.0.7 collision | high | Do not publish until owner names a new version |
| Portal next-dev locked local build | low | Cloud App Hosting build at Gate D; typecheck already passed |
| Missing `isInternal` on legacy docs | low | Do not backfill; report if found |
| Past+Printing Finish on live shows | medium | Use a safe fixture or defer |

---

## Rollback Plan

See §11. Never force-push `production`.

---

## Documentation Updates Required

- [x] DEPLOYMENT.md — no procedure change; App Hosting path verified in-repo
- [ ] ROADMAP / CURRENT-STATE / 13-recent — at **production Signoff**, not now
- [ ] DECISIONS — ADR-FP-140 production index note at Signoff

---

## Open Questions

- [x] **Studio next version** — owner must supply. Do not invent. Blocks Gate E only.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-21-promote-print-request-correctives-to-production-review.md
- Verdict: pending
