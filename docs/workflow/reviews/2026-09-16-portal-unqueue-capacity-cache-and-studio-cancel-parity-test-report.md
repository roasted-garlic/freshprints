# Test Report: Portal unqueue capacity cache + Studio cancel-parity remove

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-formal-review.md` |
| Overall | **passed_with_notes** — automated focused suite/typecheck/lint pass; Owner DEV QA accepted the remove/re-add behavior; Signoff approved_with_notes |

---

## Summary

Implementation of cache invalidation and Studio soft-cancel passed focused automated checks. Owner
DEV QA accepted the remove/re-add behavior in DEV. No production deploy was performed.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|---|---|---:|---|---|
| Unit / contract | `npx tsx --test` on Portal cache + service/hook contracts + Studio unqueue contract | 0 | **pass** | 6/6 |
| Portal typecheck | `npx tsc --noEmit -p apps/portal/tsconfig.json` | 0 | **pass** | |
| Functions typecheck | `npx tsc --noEmit -p functions/tsconfig.json` | 0 | **pass** | |
| Lint (changed files) | `npx eslint` on Portal cache/hook/service + Studio unqueue callable | 0 | **pass** | |
| Studio typecheck | — | — | **skip** | No Studio renderer code changed |
| Full build | — | — | **skip** | Not required for this narrow follow-up; Functions deploy remains unauthorized |
| Integration / E2E | — | — | **skip** | Covered by Owner DEV QA checklist |

---

## Failures

None.

---

## Skipped Checks

| Check | Reason |
|---|---|
| Studio package/typecheck | No renderer changes in this goal |
| Functions build/deploy | Deploy unauthorized; local/source contract covered |
| Full monorepo lint | Out of scope; changed-file ESLint passed |

---

## Manual Testing

| Test | Status | Notes |
|---|---|---|
| Portal remove → immediate Add to Show capacity/personal spots | PASS | Owner DEV QA, 2026-09-16 |
| Studio staff remove → canceled / History only | PASS | Owner DEV QA, 2026-09-16 |
| Cap math still blocks 25 when 4 spots used | PASS | Owner DEV QA, 2026-09-16 |

Checklist: `docs/workflow/reviews/2026-09-16-portal-unqueue-capacity-cache-and-studio-cancel-parity-owner-dev-qa-checklist.md`

---

## Notes for Signoff

- Parent count-parity Signoff is no longer blocked; this follow-up is closed through the parent
  Signoff.
- Portal cache fix is client-only (no Functions deploy required for that half).
- Studio cancel parity requires the updated `unqueueStudioCustomerPrintRequestFromShow` in the Functions environment Studio calls.
