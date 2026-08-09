# Test Report: Amendment 9 P1 — Import / approval read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Plan | `docs/workflow/plans/2026-08-07-amendment-9-p1-import-approval-read-containment-plan.md` |
| Formal Review | **approved_with_changes** (I4 + A3 retained) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Verdict | **passed** |

---

## Commands

| Check | Command | Exit |
|-------|---------|-----:|
| P1 wiring + P0 reconcile + approval shape | `npx tsx --test …amendment9P1… …localReconciliation… …catalogApproval…` | **0** (14 pass) |
| Studio `tsc --noEmit` | `npx tsc -p apps/studio` / `cd apps/studio && npx tsc --noEmit` | **0** |
| Studio Vite build (3 targets) | `npx vite build` in apps/studio | **0** |
| Lint | `npm run lint` | **0** |
| Whitespace | `git diff --check` (P1 paths) | **0** |

---

## Budgets after Formal Review retains

| Path | Pre | Post target | Mechanism |
|------|----:|------------:|-----------|
| Import oneshots | 5 | **2** (I1 + I4) | Skip I2/I3 via create authority; I4 fresh after Storage; I5 via I4 documentData |
| Approve oneshots | 3 | **2** (A1 + A3) | Skip A2 via draft Design; retain A3 write-boundary getDoc |

---

## Notes

- Manual 45-design measurement deferred to combined morning checklist.
- No Firebase deploy for P1 (Studio-only).
