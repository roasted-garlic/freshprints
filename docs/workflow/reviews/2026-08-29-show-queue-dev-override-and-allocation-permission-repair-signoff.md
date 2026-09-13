# Signoff: Show Queue DEV Override + Allocation Permission Repair

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-29-show-queue-dev-override-and-allocation-permission-repair-plan.md` |
| Review | `docs/workflow/reviews/2026-08-29-show-queue-dev-override-and-allocation-permission-repair-review.md` |
| Corrective review | `docs/workflow/reviews/2026-08-29-show-queue-dev-fixture-needs-attention-corrective-implementation-review.md` |
| Final status | **approved** |

---

## Summary

Closed Phase 7 prerequisite goal restoring Show Queue allocation writes and adding DEV-only `DEV-OVERRIDE` fixture support on `fresh-prints-dev`. Owner QA **PASS** after a corrective slice fixed `dev_fixture` bypass of the existing Needs Attention lifecycle.

**Corrective history preserved:**

1. Stale Firestore allowlist drift blocked allocation writes (print request creation snapshots + show production-resolution metadata).
2. `DEV-OVERRIDE` / `source: "dev_fixture"` added via callable `upsertDevFixtureShow` with project gate.
3. Initial implementation listed DEV fixtures on Show Queue but `dev_fixture` bypassed **Needs Attention** because classification/recovery gated on `source === "whatnot"`.
4. Corrective extended Show Queue surface eligibility (`whatnot` + `dev_fixture`) for tab classification, read-only Past vs Needs Attention, and recovery preview eligibility.
5. Recovery callables redeployed DEV-only (`previewShowProductionRecovery`, `applyShowProductionRecovery`).
6. Owner re-QA **PASS** — DEV fixtures enter Needs Attention; existing recovery actions work; production untouched.

---

## Changes Delivered

### Behavior

- Firestore rules allowlists reconciled for allocation sequence writes.
- DEV-only `DEV-OVERRIDE` sentinel creates `dev_fixture` shows on Show Queue surface.
- DEV fixtures participate in Upcoming / Needs Attention / Past lifecycle parity (not Whatnot import/sync).
- Recovery callables accept `dev_fixture` for preview/apply.

### Files Created (representative)

- `packages/shared/src/utils/firebaseDevFixtureGate.ts`
- `functions/src/upsertDevFixtureShow.ts`
- `packages/shared/src/utils/showProductionRecovery.test.ts` (extended)
- `tests/firebase/showQueueAllocation.rules.test.ts`
- Corrective + implementation review docs

### Files Modified (representative)

- `firestore.rules`
- `packages/shared/src/utils/showProductionRecovery.ts`
- `packages/shared/src/types/upcomingShow/upcomingShow.types.ts`
- `functions/src/lib/showProductionRecovery.ts`
- `apps/studio/.../UpcomingShowsPage.tsx`, `LoginForm` create flow, display helpers
- `apps/studio/.../upcomingShowService.ts` (`VALID_SOURCES`)

### Documentation Updated

- ADR-FP-155 in `docs/project/DECISIONS.md`
- Plan, reviews, implementation reviews, this signoff
- `.cursor/workflow/state.md`

---

## Tests

### Automated

| Suite | Result |
|-------|--------|
| `tests/firebase/showQueueAllocation.rules.test.ts` | **10/10 pass** |
| `packages/shared/src/utils/showProductionRecovery.test.ts` + contract tests | **27/27 pass** (post-corrective) |
| `firebaseDevFixtureGate`, `devFixtureProjectGate`, `upcomingShowDisplay` | **pass** |
| Functions build | **pass** |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| DEV-OVERRIDE creation + allocation | **PASS** | owner |
| Needs Attention lifecycle after scheduled time | **PASS** (post-corrective) | owner |
| Recovery preview/apply on DEV fixture | **PASS** | owner |
| Production unchanged | **PASS** | owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| DEV deploy (rules + upsertDevFixtureShow) | obtained | 2026-08-29 | Owner approved |
| DEV deploy (recovery callables corrective) | obtained | 2026-08-29 | Owner approved |
| Production deploy | not required | | Production NOT AUTHORIZED |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Rules allowlist drift may recur | medium | Emulator allocation sequence test; compare-deployed-rules script |
| DEV fixture only on `fresh-prints-dev` | low | Callable + client gates documented in ADR-FP-155 |
| Did Not Print bulk re-queue not in this phase | n/a | Next managed goal `show-queue-needs-attention-did-not-print-recovery` |

---

## Deferred Items (Roadmap)

- **Next:** `show-queue-needs-attention-did-not-print-recovery` — Move unprinted requests to another show + Needs Re-queue triage
- WS4 customer activity — **paused** at existing checkpoint

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Owner DEV QA **PASS** including corrective Needs Attention lifecycle. Production untouched. Prerequisite complete for Did Not Print re-queue recovery phase.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` — no new risks requiring register entry
- [ ] `references/project-chatgpt-handoff/` — not present in repo

**Recommended next action:** Proceed to Plan + Review for `show-queue-needs-attention-did-not-print-recovery` (started in same session).
