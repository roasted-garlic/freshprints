# Test Report: Selected Print Request live sync (Studio ↔ Portal)

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-16-selected-print-request-live-sync-studio-portal-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-16-selected-print-request-live-sync-studio-portal-formal-review.md` |
| Overall | **passed_with_notes** — automated contracts/typecheck/lint pass; Owner DEV QA required for cross-app live feel |

---

## Summary

Request-scoped live subscriptions wired for Studio selected detail and Portal open detail (request, items when not Working-cart-driven, allocations). Focused contracts pass.

### Follow-up (Owner QA findings)

- Portal detail header now prefers live `items` summaries over list-cache `summariesByRequestId`.
- Shared `printRequestItemPropSyncGuard` rejects remote apply while local qty/size edits are pending; Studio item cards use the same guard + server `updatedAt` from the save result.

---

## Commands Run

| Check | Command | Exit | Result |
|---|---|---:|---|
| Contract tests | `npx tsx --test` liveSync contracts (Studio + Portal) | 0 | **5/5 pass** |
| Follow-up contracts | prop-sync + count parity + liveSync (17 tests) | 0 | **17/17 pass** |
| Portal typecheck | `npx tsc --noEmit -p apps/portal/tsconfig.json` | 0 | pass |
| Studio typecheck | `npx tsc --noEmit -p apps/studio/tsconfig.json` | 0 | pass |
| Lint | eslint on changed implementation files | 0 | pass (initial); follow-up not re-linted file-by-file |
| Build / deploy | — | — | skip (not required; no Functions) |

---

## Manual Testing

See Owner DEV QA checklist (checks 5–6 added for header live counts and rapid +/- parity). Required before Signoff.

---

## Notes

- Remote item snapshots apply when the local item-card draft is clean; pending debounce/in-flight/queued/dirty edits hold remote apply until settle.
- Unselected Studio list rail not live.
- No production deploy.
