# Test Report: Custom Designs mobile nav, hierarchical URLs, draft resume

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Phase | test |
| Plan | docs/workflow/plans/2026-07-16-custom-designs-mobile-nav-url-draft-plan.md |
| Status | **partial** — automated passed; manual mobile QA pending |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (URL + multi-value) | `npx tsx --test apps/portal/features/etsy-recommendations/utils/etsyRecommendationUrlState.test.ts apps/portal/features/etsy-recommendations/utils/applyEtsySubjectSuggestion.test.ts` | 0 | PASS (13 tests) |
| Portal typecheck | `npm run typecheck --workspace=@fresh-prints/portal` | 0 | PASS (after clearing stale `.next/types` for deleted `custom-designs/page.tsx`) |

Skipped: full portal build, lint (not required for this slice), E2E, backend/rules.

---

## Manual Test Checkpoint

**Feature / area:** Custom Designs questionnaire mobile density + flow URLs + draft resume  
**Why automated tests are insufficient:** Layout visibility and touch targets need a real mobile viewport.  
**Environment:** local Portal  
**Prerequisites:** Signed-in Portal customer; open Custom Designs

### Steps

1. Narrow viewport to ~390px width. Open Find wizard subject step.  
   **Expected:** **Back** and **Next** on one row; suggestion pills visible without excessive scroll under the input.
2. Fill subject, tap Next through style → wording → review; refresh mid-flow.  
   **Expected:** URL is `/custom-designs/find/{step}`; answers still filled after refresh.
3. From choose, tap Find again after leaving mid-flow via Back/nav.  
   **Expected:** Resumes at saved draft step with prior answers.
4. Open legacy `/custom-designs?step=subject`.  
   **Expected:** Replaces to `/custom-designs/find/subject`.
5. Complete Find designs → results; confirm URL includes `/find/results?requestId=…`. Start over / back to options.  
   **Expected:** Draft cleared; new Find starts empty on subject.

### Pass criteria

- [ ] Side-by-side Back/Next on mobile; pills reasonably visible
- [ ] Path URLs for find steps; legacy query redirects
- [ ] Draft survives refresh and Find resume
- [ ] Results + clear-on-options still work

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

---

## Notes

- Stale Next generated types under `.next/types/.../custom-designs/page.ts` broke typecheck until removed; catch-all route is now `custom-designs/[[...segments]]/page.tsx`.
