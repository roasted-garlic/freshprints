# Signoff: Test Data wipe — AI Processing designs only

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-21-ai-processing-designs-wipe-plan.md |
| Review | docs/workflow/reviews/2026-07-21-ai-processing-designs-wipe-review.md |
| Test report | docs/workflow/reviews/2026-07-21-ai-processing-designs-wipe-test-report.md |
| Final status | **approved** |

---

## Summary

Studio Test Data Reset now has an **AI Processing** wipe target/preset that deletes only designs on the AI Processing page (Processing / Needs Review / Rejected), regardless of pipeline stage, plus those designs’ Storage — while keeping ready Design Library and archived designs. Functions redeployed to `fresh-prints-dev`; owner manual smoke **PASS**.

---

## Changes Delivered

### Behavior

- New wipe target `aiProcessingDesigns` + preset **AI Processing**
- Selective Firestore + per-design Storage delete (not full design Storage prefixes)
- Mutually exclusive with full **Designs** wipe in UI; full Designs supersedes if both selected
- No print-request prerequisite or catalog confirm modal for selective wipe alone

### Files Created

- `packages/shared/src/utils/aiProcessingDesignWipeEligibility.ts` (+ tests)
- Plan / review / test report / manual checkpoint / this signoff

### Files Modified

- `packages/shared/src/types/admin/wipeOperationalTestData.types.ts`
- `packages/shared/src/utils/operationalWipeTargets.ts` (+ tests)
- `functions/src/wipeOperationalTestData.ts` (selective wipe + TS reduce fix)
- Studio `wipeTargetOptions.ts`, `TestDataResetPage.tsx`
- `docs/standards/TESTING.md`, `docs/project/DECISIONS.md` (ADR-FP-068), `docs/architecture/BACKEND.md`

### Documentation Updated

- TESTING wipe presets; ADR-FP-068 amendment; BACKEND auth table note

---

## Tests

### Automated

- `npx tsx --test` eligibility + operationalWipeTargets: **31/31 PASS**

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| AI Processing wipe preset on fresh-prints-dev | PASS | owner |
| Ready catalog preserved | PASS | owner |
| Functions redeploy | SUCCESS | owner (agent redeploy after TS fix) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-21 | Dev allowlist only |
| Database migration | not required | | |
| Design / UX | not required | | Manual smoke PASS |
| Business / policy | not required | | |
| Secrets / env | not required | | |
| Functions deploy to fresh-prints-dev | obtained | 2026-07-21 | `wipeOperationalTestData` Successful update |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Node.js 20 runtime deprecation warning on deploy | Low | Separate upgrade track |
| Customer uploads may retain dangling `sourceCustomerUploadId` | Low | Same as full designs wipe; optional Customer Uploads wipe |

---

## Deferred Items (Roadmap)

- Parked: Library design sharing proof-line follow-up (#12) — still awaiting owner re-check if not already done in parallel
- Production wipe allowlist — never without new approved plan

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Automated tests passed; Functions deployed to fresh-prints-dev; owner manual smoke PASS.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — N/A
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated** — package not present in repo; skipped
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated — N/A (package absent)

**Recommended next action for user:** Use **AI Processing** on Test Data when clearing inbox fixtures. Resume parked #12 proof-line follow-up if still open.
