# Final Test Report: Studio Design Library archive / search consistency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-02-studio-design-library-archive-search-consistency-plan.md |
| Overall | **passed_with_notes** (Owner QA **PASS**; automated focused **39/39**; Studio tsc pre-existing outside scope) |

---

## Summary

Final regression on the closeout working tree: focused Design Library membership / archive / managed-search suite **39 pass / 0 fail**. No typecheck errors in changed Design Library paths. Owner QA **PASS** in DEV.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit/contract | `npx tsx --test` on membership, exact-id, managed-search membership, archive reconcile, Algolia containment, authoritative source | 0 | **pass** | 39 tests |
| Typecheck | `cd apps/studio; npx tsc --noEmit` | 2 | **passed_with_notes** | Pre-existing unrelated; **0** hits on changed Design Library paths |
| Lint | skipped | — | skip | Not blocking for this closeout |
| Build | skipped | — | skip | Renderer-only; Owner QA already on restarted Studio |
| Backend/rules | N/A | — | skip | No Rules/Functions changes |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner QA A–K | **PASS** | `docs/workflow/reviews/2026-09-02-studio-design-library-archive-search-consistency-owner-qa.md` |

---

## Signoff Readiness

- [x] Automated checks for this scope pass OR failures documented
- [x] Manual tests complete
- [x] Ready for signoff phase
