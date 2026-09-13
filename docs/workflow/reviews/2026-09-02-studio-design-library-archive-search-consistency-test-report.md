# Test Report: Studio Design Library archive / search consistency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-02-studio-design-library-archive-search-consistency-plan.md |
| Implementation | session (uncommitted) |
| Overall | **pending_manual** (automated **passed_with_notes**) |

---

## Summary

Focused Design Library membership / archive / managed-search tests: **40/40 pass**. Studio `tsc --noEmit` reports **pre-existing** errors outside this goal’s files; **no errors** in changed Design Library paths. Owner QA required before signoff.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit/contract | `npx tsx --test` on membership, exact-id, managed-search membership, archive reconcile contract, Algolia containment, authoritative source | 0 | **pass** | 40 tests |
| Typecheck | `npx tsc --noEmit` (from `apps/studio/`) | 2 | **passed_with_notes** | Pre-existing unrelated errors; **0** matches in changed Design Library files |
| Lint | not run | — | skip | Not required for this narrow pass gate before Owner QA |
| Build | not run | — | skip | Renderer-only; restart Studio for QA |
| Integration | — | — | skip | N/A |
| E2E | — | — | skip | N/A |
| Backend/rules | — | — | skip | No Rules/Functions changes |

### Unit test files included

- `designLibraryMembership.test.ts`
- `designLibraryExactIdSearch.test.ts`
- `designLibraryManagedSearchMembership.test.ts`
- `designLibraryArchiveRestoreReconciliation.contract.test.ts`
- `studioAlgoliaCatalogSearch.containment.test.ts`
- `designLibraryAuthoritativeSource.test.ts`

---

## Failures (if any)

### Studio typecheck (repo-wide)

- **Command:** `cd apps/studio; npx tsc --noEmit`
- **In scope to fix:** no (pre-existing; no hits on this goal’s paths)
- **Action taken:** Documented; did not expand scope

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Lint | Deferred to Owner QA window; focused unit/contract + path-filtered typecheck sufficient for this stop |
| Vite build | Renderer restart for Owner QA; full build not required for this gate |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner QA A–K | pending | See Owner QA checkpoint doc |

Manual test instructions: `docs/workflow/reviews/2026-09-02-studio-design-library-archive-search-consistency-owner-qa.md`

---

## Recommendations

- Optional later: Algolia reconcile as separate maintenance (owner declined for this goal)
- Consider cleaning pre-existing Studio `tsc` debt in a dedicated phase

---

## Signoff Readiness

- [x] Automated checks for this scope pass OR failures documented
- [ ] Manual tests complete OR checkpoint pending ← **pending**
- [ ] Ready for signoff phase ← **no** (await Owner QA; no signoff/commit/push this stop)

**Next step:** manual-test-checkpoint (Owner QA)
