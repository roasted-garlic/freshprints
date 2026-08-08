# Review: Portal Discover / View All complete pagination plan (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent Formal Review) |
| Plan | `docs/workflow/plans/2026-08-08-portal-discover-view-all-complete-pagination-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly identifies the customer surface (`/catalog` → `CatalogPageContent` → `useCatalogDesigns`), proves the **40** ceiling is first-page sizing plus badge seeding from loaded length, and correctly rejects raising `DEFAULT_CATALOG_PAGE_SIZE` or one-shot unbounded loads. Preferred approach (reuse Load more + authoritative `countReadyDesigns`) aligns with architecture and prior Firestore read-efficiency work. Implementation may proceed after the required changes below are followed (no plan rewrite required if Implement agent treats them as binding).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Separates TD-031 from Home/readyAt/Algolia/PR #40 |
| Architecture alignment | pass | Hook → service; no UI→Firestore bypass |
| Security impact addressed | pass | Same ready catalog reads |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Client SDK only |
| Test strategy adequate | pass | Needs binding fixture/mock details in implement |
| Human checkpoints identified | pass | Owner QA after later deploy |
| Roadmap alignment | pass | Post-prod correctness; TD-031 |
| Documentation plan | pass | TECH_DEBT at signoff |
| No silent scope expansion | pass | Hard out-of-scope list |

---

## Architecture Review

**Findings:**

- Root-cause tracing matches repo: copy string, route, Load more, and count seeding are accurate.
- Reusing Load more is correct; infinite scroll would be a new UX pattern without precedent on this page.
- Keeping Home pool / Algolia / page-size constant out of scope is correct.

**Required changes:**

- [x] None structural
- [ ] **Binding:** Prefer edits in `useCatalogDesigns.ts` first. Touch `catalogService.ts` only if count/list inconsistency cannot be fixed in the hook.
- [ ] **Binding:** Do not change `CatalogPageContent` layout/copy unless Load more wiring is broken (investigation says it is not).

---

## Security Review

**Findings:**

- No auth, secrets, Rules, or permission model changes.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [ ] App Hosting rollout of the fix — **later**, separate owner phrase (not this Implement pass)

---

## Data Model Review

**Findings:**

- No schema/migration.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Aggregate count path already exists and is the right efficiency choice.
- No new indexes expected; if implement hits a missing-index error for count under NTW filters, stop and document — do not silently demote filters.

**Required changes:**

- [ ] **Binding:** If `countReadyDesigns` fails, do not leave the badge permanently equal to page length without either (a) retry once, or (b) keeping Load more driven solely by cursor `hasMore`, and recording failure in the test report. Silent forever-wrong totals are part of the defect.

---

## Test Review

**Findings:**

- Acceptance criteria list is strong.
- Plan should be executed with at least one automated test that mocks first page `designs.length === 40`, `hasMore === true`, `countReadyDesigns === 45` and asserts `matchingCount === 45`.
- Add a second test: Load more appends page 2 without duplicate ids.
- Add a third: filter/discover key change resets cursor and designs.

**Required changes:**

- [ ] **Binding:** Include the three automated cases above before claiming Test phase pass.
- [ ] Manual NTW 45-case remains owner QA after deploy — do not claim production PASS from unit tests alone.

---

## Human Checkpoints

- Owner production/staging visual QA after future App Hosting rollout.
- No deploy during Implement source work.

---

## Required Changes Before or During Implementation

1. Treat aggregate count as badge authority whenever it resolves; never permanently prefer `firstPage.designs.length` over a successful count.
2. Always attempt `countReadyDesigns` on the ordinary Firestore path after a successful first page (including `!hasMore`), so a false-negative end-of-list still exposes a true total for QA/debug and badge honesty when count > loaded.
3. If `total > loaded.length` while `hasMore` is false, do not hide incompleteness — restore paging or fail visibly in the loading path (document chosen strategy in the implementation review).
4. Do **not** raise `DEFAULT_CATALOG_PAGE_SIZE`, enable Algolia, mutate Home pool, or expand `CLIENT_SORT_MEMBERSHIP_CAP` in this phase (500-cap residual stays documented).
5. Ship the three automated tests listed in Test Review.
6. STOP before any production deploy; next deploy requires a separate owner phrase after Signoff.

---

## Verdict

**approved_with_changes**

Implementation may start when the owner sends the Implement phrase. Required changes are binding; no plan rewrite required unless Implement discovers a need to change service paging semantics beyond the hook.

---

## Next owner phrase

`IMPLEMENT PORTAL DISCOVER VIEW ALL COMPLETE PAGINATION`
