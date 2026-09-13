# Test Report: Studio Delete First-Action Latency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-delete-first-action-latency` |
| Status | **passed_with_notes** |
| Plan | docs/workflow/plans/2026-09-02-studio-delete-first-action-latency-plan.md |

---

## Commands run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Warmup / deletion contract tests | `npx tsx --test packages/shared/src/types/deletion/deletionWarmup.types.test.ts functions/src/deletionCallableWarmup.contract.test.ts apps/studio/src/renderer/src/features/deletion/services/deletionCallableWarmup.contract.test.ts apps/studio/src/renderer/src/features/deletion/services/schedulePostAuthDeletionWarmup.contract.test.ts` | 0 | 17/17 pass |
| Related deletion contracts | `npx tsx --test functions/src/deleteEligibleUnapprovedDesign.contract.test.ts functions/src/customerUploadDeletionExecution.test.ts` | 0 | 11/11 pass |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Functions typecheck | `npx tsc --noEmit -p functions/tsconfig.json` | 0 | pass |
| Studio full `tsc --noEmit` | `npm --prefix apps/studio exec -- tsc --noEmit -p apps/studio/tsconfig.json` | 2 | **pre-existing** errors unrelated to this goal (gang sheet, AI review, intake, etc.) — no new errors attributed to deletion warmup files |

---

## Coverage mapped to requirements

| Requirement | Covered by |
|-------------|------------|
| Warmup side-effect free / auth after role assert | Functions contract tests |
| No standalone ping Function | Functions + Studio contracts |
| Parallel print-request reads | Functions contract (`Promise.all`) |
| Show single recheck | Functions contract |
| Dialog mutate warm decoupled from preview | Studio contract |
| Staff Inbox not warmed | Studio contract |
| Role-gated idle list / no setInterval | Studio schedule contract |
| Shared warmup flag parser | shared unit test |

---

## Manual / Owner QA

Required after DEV Functions deploy — see Owner QA checklist in implementation review / deploy checkpoint. Not run in this agent pass.

---

## Notes

- Performance acceptance is Owner QA measured (not CI latency asserts).
- Studio package full typecheck has known baseline failures; Functions build is the authoritative compile gate for backend changes.
