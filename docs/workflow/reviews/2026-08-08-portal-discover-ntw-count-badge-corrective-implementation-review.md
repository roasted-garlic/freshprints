# Implementation Review: NTW count badge corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent) |
| Plan | `docs/workflow/plans/2026-08-08-portal-discover-ntw-count-badge-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-plan-review.md` |
| Test report | `docs/workflow/reviews/2026-08-08-portal-discover-ntw-count-badge-corrective-test-report.md` |
| Diff scope | `catalogService.ts`, `useCatalogDesigns.ts`, `useCatalogDesigns.test.ts`, `CatalogPageContent.tsx`, `catalogService.ntwCountOrder.test.ts` |
| Verdict | **approved** |

---

## Summary

Corrective aligns NTW `countReadyDesigns` with list-compatible `orderBy(readyAt desc)` + `__name__ desc` (existing DESC indexes; no new index), and separates pending (“Counting designs…”) from failed (“Count unavailable”). TD-031 pagination contract preserved. Verification 42/42 + typecheck/lint/build PASS. **Do not Signoff TD-031** until production rollout + owner QA.

---

## Binding Formal Review checklist

| Requirement | Status |
|-------------|--------|
| NTW count orderBy readyAt + __name__ desc | **pass** |
| Equality-only counts unchanged | **pass** (gated on `readyAfterMs`) |
| `shouldShowOrdinaryCountPending` pending-only | **pass** |
| Failed → “Count unavailable” | **pass** |
| No fake page-length total on failure | **pass** |
| Binding tests | **pass** |
| No production deploy this pass | **pass** |

---

## Diff probes

| Probe | Finding |
|-------|---------|
| 1. Global count ordering | **Cleared** — only when `readyAfterMs` set |
| 2. NTW aligned with list | **Pass** |
| 3. Unnecessary new index | **None** |
| 4. Rules weakening | **None** |
| 5. Failed mapped to pending | **Fixed** |
| 6. Fake loaded totals | **Cleared** |
| 7. Unbounded retries | **Still one retry** |
| 8. Unbounded hydration | **None** |
| 9. TD-031 pagination | **Preserved** |
| 10. Algolia | **Untouched** |
| 11. Home rails | **Untouched** |
| 12. Unrelated config | **None** |

---

## Index / Rules

| Item | Status |
|------|--------|
| Existing readyAt DESC composite | **Sufficient by design** |
| New index | **Not required** |
| Rules | **Unchanged** |

---

## Verdict

**approved** — ready for separate source promotion / App Hosting after owner phrase.
