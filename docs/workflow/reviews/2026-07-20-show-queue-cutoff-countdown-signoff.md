# Signoff: Show queue cutoff + calendar countdown

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-20-show-queue-cutoff-countdown-plan.md |
| Review | docs/workflow/reviews/2026-07-20-show-queue-cutoff-countdown-review.md |
| Test report | docs/workflow/reviews/2026-07-20-show-queue-cutoff-countdown-test-report.md |
| Final status | **approved** |

---

## Summary

Small Managed Item **#5** delivered: Studio Show Queue setting for Portal add-to-show cutoff hours; Functions enforce on list + queue; Portal Add-to-Show calendar slots show compact countdown on the capacity row (layout/copy/mobile polish included). ADR-FP-103. No production; no commit.

---

## Changes Delivered

### Behavior

- Studio Show Queue settings → `portalQueueCutoffHoursBeforeStart` (default 5, range 1–72).
- `listPortalAllocatableShows` marks past-cutoff shows non-allocatable; `queuePortalPrintRequestToShow` rejects with `SHOW_QUEUE_CUTOFF`.
- Studio staff allocation after cutoff remains allowed.
- Portal picker: same row as spots — left capacity, right `{duration} to add designs to this show` / `No longer able to add designs to this show`; success/warning/danger by remaining time; CLOSED badge when past cutoff.

### Files Created

- `packages/shared/src/utils/showQueueCutoff.ts` (+ test)
- Plan / review / test report / this signoff

### Files Modified (high level)

- Functions: list + queue + `loadPortalQueueCutoffHours`
- Studio: showQueueSettings + UpcomingShowsPage
- Portal: PortalQueueToShowModal + hooks/services
- `packages/show-picker`; firestore.rules; shared types/error codes
- DATA_MODEL; BACKEND; DECISIONS ADR-FP-103; ROADMAP

### Documentation Updated

- ROADMAP Small Managed #5 → Done; #6 verified Done (Portal already covered)

---

## Tests

### Automated

- Unit `showQueueCutoff.test.ts`: **11/11 pass**
- Portal typecheck: **pass**
- Functions build + deploy to **fresh-prints-dev** (`listPortalAllocatableShows`, `queuePortalPrintRequestToShow`, `firestore:rules`): **pass**
- Studio full typecheck: skipped (pre-existing tsconfig issue)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Studio cutoff setting + Portal countdown / closed-show UX (incl. layout/copy/mobile condense polish) | **PASS** | Owner 2026-07-20 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev Functions/rules only |
| Database migration | N/A | | Settings field additive |
| Design / UX | **PASS** | 2026-07-20 | Owner PASS including countdown layout/copy/mobile polish |
| Business / policy | N/A | | Cutoff already product-directed |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Client vs server clock skew | low | Server authoritative on queue |
| Studio staff can still allocate past Portal cutoff | info | By design (ADR-FP-103) |

---

## Deferred Items (Roadmap)

- Small Managed **#7** — User reset password (next after #6 closed as already Done)
- #8–#12 per ROADMAP
- Orphan remote Functions on fresh-prints-dev — hygiene later

---

## Related verification note (#6)

Portal **Design library / default browse newest-first** (Small Managed **#6**) already implemented — see Decision Log / ROADMAP. Code evidence:

- `useCatalogDesigns.sortFieldForDiscovery` default → `createdAt` (not `updatedAt`)
- `catalogService` `orderBy(sortField, 'desc')` with default `createdAt`
- Metric discover modes keep `requestCount` / `favoriteCount` / `lastRequestedAt`

Studio Electron Design Library still defaults to `updatedAt` (explicitly out of scope of the 2026-07-18 Portal catalog-stable plan). Owner treated #6 as covered by Portal; no Studio change in this closeout.

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Automated checks passed; Functions/rules on fresh-prints-dev; owner **PASS** 2026-07-20 for cutoff + countdown polish.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (N/A)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per MANIFEST when behavior changed (`03`, `04`, `07`, `12` as applicable)

**Recommended next action for user:** Start Small Managed **#7** (user reset password), or pick another queued item / production deploy explicitly.
