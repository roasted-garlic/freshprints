# Review: Final prelaunch UX companion + censor amendment

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-09-final-prelaunch-ux-companion-censor-amendment-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Amendment correctly finalizes Needs Companion as unlinked-only queue, separates Companion management into its own modal, and fixes Portal reveal fatigue with a single details-level gate. Toggle label **Censored** (with accessible “Show censored content”) matches the owner amendment. Data-model choice A (keep `companionSetIncomplete`, no rename/migration) is the safest.

Proceed Implement → Test on `fresh-prints-dev` only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | |
| Architecture alignment | pass | Service-owned denorm; presentation-only Portal censor |
| Security | pass | No new customer data exposure |
| Data model | pass | Option A selected; soft-deprecate set complete for queue |
| Test strategy | pass | Owner list mapped |
| No silent scope expansion | pass | |
| Production gates | pass | DEV only |

---

## Binding required changes for Implement

1. **Data:** Keep `companionSetIncomplete`; unlinked-only; clear on first link for all members written in that link txn; heal linked+incomplete → clear incomplete; no auto-queue on dissolve.
2. **UI Studio:** Hide Mark Needs Companion when linked; remove linked Mark Complete / Mark Needs Companion set toggles from Companion modal for this MVP.
3. **Portal:** List cards never show Click to reveal; details is sole reveal gate; lightbox inherits revealed; residual Censored Content indicator after reveal; toggle visible label **`Censored`**.
4. **Companion modal:** Dedicated button below View more details; not inside Audit modal; live member list after link/unlink via mutation + one bounded set member refresh.
5. **Mobile filters:** Fix secondary grid for four controls; no overflow; desktop unchanged.
6. **No** Algolia / prod / cutover / field rename migration.

---

## Verdict

**approved_with_changes** — implement immediately applying binding changes (owner product clarification authorizes this corrective). STOP after DEV test for owner re-QA.
