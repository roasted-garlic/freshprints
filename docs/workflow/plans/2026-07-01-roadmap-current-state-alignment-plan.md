# Plan — Roadmap Current State Alignment

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `roadmap-current-state-alignment`
- **Roadmap phase:** Phase 6 maintenance — Customers And Print Requests
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** None. User reported AI Processing smoke test passed before this phase.

---

## 1. Goal

Align `docs/project/ROADMAP.md` with the actual workflow state after the completed
`ai-tag-alias-reconciliation` phase and the user-reported AI Processing smoke test pass.

The roadmap currently still says the current goal is deterministic category-ordering manual QA
followed by the AI Functions deploy/smoke checkpoint. That is stale.

---

## 2. Scope

Update durable documentation only:

| File | Change |
|---|---|
| `docs/project/ROADMAP.md` | Refresh **Current Project Status** to reflect Phase 6 PASS WITH NOTES, AI Processing deploy/smoke complete, and next recommended code phase: `print-request-query-index-hardening`. |
| `.cursor/workflow/state.md` | Close this docs-only alignment phase after implementation/signoff, preserving the prior AI phase history and recording the user-reported smoke pass. |
| `docs/workflow/reviews/2026-07-01-roadmap-current-state-alignment-test-report.md` | Record documentation verification commands. |
| `docs/workflow/reviews/2026-07-01-roadmap-current-state-alignment-signoff.md` | Record final docs-only signoff. |

No app code, Firebase rules, Cloud Functions, indexes, secrets, data writes, migrations, or deploys.

---

## 3. Source Of Truth

Use `.cursor/workflow/state.md` and the latest signoff artifacts as the operational source:

- `ai-tag-alias-reconciliation` is complete locally.
- User reported AI Processing smoke test passed on 2026-07-01.
- Current codebase is ready for the next managed phase.
- Recommended next code phase is `print-request-query-index-hardening`, matching TD-014 and Phase 6.

---

## 4. Intended Roadmap Wording

Update the **Current Goal** in `ROADMAP.md` to state:

- AI Processing local fixes are implemented, deployed/smoked per user report, and no longer the current blocker.
- Phase 6 Print Requests foundation remains PASS WITH NOTES.
- Next recommended managed code phase is `print-request-query-index-hardening`.
- After that, `testing-and-ci-bootstrap` remains the next hardening candidate.

Also update **Last realignment** to 2026-07-01 and mention the AI Processing smoke pass plus the next Phase 6 hardening direction.

---

## 5. Verification

Docs-only verification:

1. `git diff --check`
2. Confirm `ROADMAP.md` no longer references deterministic category ordering or the AI smoke checkpoint as the current goal.
3. Confirm `ROADMAP.md` names `print-request-query-index-hardening` as the next recommended managed phase.
4. Confirm `.cursor/workflow/state.md` ends in `DONE: yes` with no human checkpoint required for starting the next managed phase.

---

## 6. Acceptance Criteria

- [ ] `ROADMAP.md` Current Project Status matches actual project state.
- [ ] User-reported AI Processing smoke pass is documented.
- [ ] Next recommended code phase is `print-request-query-index-hardening`.
- [ ] No code, Firebase, secret, deploy, data write, migration, or dependency changes.
- [ ] Documentation verification passes.

---

## 7. Out Of Scope

- Implementing Print Request index hardening.
- Editing Firestore indexes.
- Running Firebase deploys.
- Changing app behavior.
- Re-running AI smoke tests.
- Broad roadmap rewrite.
