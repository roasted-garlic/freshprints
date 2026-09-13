# Formal Review: Smart Catalog Intelligence — Slice 3

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-24-smart-catalog-intelligence-slice-3-plan.md |
| Master plan | docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md (§14 refined) |
| Verdict | **approved_with_changes** |
| Owner approval | **APPROVE SLICE 3 PLAN WITH REQUIRED CHANGES** (2026-08-24) — searchableAttributes evidence hierarchy amended; implement authorized after bookkeeping |

---

## Summary

Slice 3 plan is grounded in a source audit of the current ready-only Algolia path. It correctly identifies that **`smartProfile` is absent from the record, allowlist, and change classifier**, and makes classifier inclusion a required deliverable. Searchable vs facetable mapping is explicit; **Objects remain search-only**; legacy tags coexist without becoming foundational; DEV reconcile is planned without ready-catalog Smart Profile backfill; Slice 2 QA calibration informs ranking/test matrix. Catalog Processing Mode remains Slice 4 and is reaffirmed as docs-only for this gate. **Approved to proceed to owner approval** before any implementation.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Slice 3 only; autonomy/backfill/retirement/prod out |
| Architecture alignment | pass | Additive Algolia attributes; Firestore SoT; Portal/Studio hydrate pattern |
| Security impact addressed | pass | Public-safe allowlist; no staff/automation fields in index |
| Data model impact addressed | pass | No Firestore schema change required; derived Algolia contract only |
| Backend impact addressed | pass | Builder, settings, classifier, DEV reconcile |
| Test strategy adequate | pass | Automated + concrete DEV query matrix |
| Human checkpoints identified | pass | Plan/Review; DEV deploy/reconcile; prod Algolia separate |
| Roadmap alignment | pass | Continues Smart Catalog slices; Phase 9 parked |
| Documentation plan | pass | BACKEND/DATA_MODEL/ARCHITECTURE on implement |
| No silent scope expansion | pass | No Catalog Processing Mode / auto-approve / tag retirement |
| portalCatalogChangeClassifier | pass | Explicit required change + tests |
| Objects search-only | pass | Owner decision honored |
| Catalog Processing Mode | pass | Reaffirmed Slice 4; not Slice 3 |

---

## Architecture Review

**Findings:**

- Reuses `buildPortalCatalogAlgoliaRecord` / sync / reconcile rather than a parallel index — correct.
- Ordered `searchableAttributes` addresses ranking better than a single undifferentiated blob — aligns with Slice 2 “title identity without Search Concept duplication.”
- Portal managed-search path (search or multi-tag → Algolia; else Firestore browse) must incorporate Smart facetFilters without breaking browse fallback — plan notes flag + service params; implement must preserve fail-closed Algolia behavior.
- Studio managed-search parity is appropriate; Design Library generated-catalog browse is out of Slice 3 Algolia Smart Filter scope unless already on managed path.

**Required changes (implement-phase, non-blocking for owner approval):**

- [ ] Confirm Smart Filter URL strategy as **state-only** (tag parity) unless owner requests URL params in approval reply.
- [ ] Cap Colors (and optionally Themes) facet UI with top-N + typeahead to avoid giant uncontrolled lists.
- [ ] Add record-size assertion/test against Algolia safe target (~10KB) using maxed Smart Profile constants.

---

## Security Review

**Findings:**

- Allowlist expansion must remain public-safe (no `automationReasonCodes`, internal analysis, staff notes).
- Reconcile remains owner/admin callable — no permission weakening.
- Search-only API keys unchanged.

**Required changes:**

- [ ] None blocking

**Human approval before production:**

- [x] Production Algolia index settings / reconcile / Smart Filters flag enable (separate from DEV)

---

## Data Model / Classifier Review

**Findings:**

- Adding `smartProfile` to `INDEX_FILTER_FIELDS` is **mandatory**. Without it, post-ready Smart Profile updates will not sync (classified `operational` today).
- Ready-boundary transition already forces index-filter — covers Needs Review → ready after Slice 2 enrichment.

**Required changes:**

- [x] Plan already requires classifier update + unit tests — retain as implement gate.

---

## Search / Product Review

**Findings:**

- Customer facets: Subjects, Styles, Themes, Interests, Professions/Groups, Occasions, Places, Colors — bounded and sensible.
- Search Concepts and Visible Text correctly **not** proposed as customer facets (open-ended / noisy).
- Slice 2 QA matrix queries included — good.
- Interests may be broad; plan allows DEV demotion to search-only as follow-up — acceptable.

**Required changes:**

- [ ] None blocking

---

## Acceptance criteria check

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Current Algolia/search architecture from source | pass |
| 2 | Smart Profile → Algolia mapping explicit | pass |
| 3 | Search-only vs facetable explicit | pass |
| 4 | Objects search-only | pass |
| 5 | Customer Smart Filter dimensions proposed | pass |
| 6 | Ranking/attribute priority defined | pass |
| 7 | Legacy tag coexistence defined | pass |
| 8 | Ready designs without Smart Profile remain searchable | pass |
| 9 | DEV reindex/reconcile defined | pass |
| 10 | portalCatalogChangeClassifier impact reviewed | pass |
| 11 | Slice 2 QA examples in test plan | pass |
| 12 | No tag retirement | pass |
| 13 | No production action in this phase | pass |
| 14 | No implement before Formal Review approval | pass (STOP) |

---

## Catalog Processing Mode (pre-Slice-3 record)

Confirmed already in master plan §7 + amendment review; reaffirmed in Slice 3 plan header. **Not** part of Slice 3 implement. Slice 4 deliverable.

---

## Blockers

None for owner approval of Plan + Review.

---

## Verdict Rationale

`approved_with_changes` — implement-phase notes (URL state-only default, facet cardinality UX, record-size test) are clarifications, not plan rewrite blockers. Owner must explicitly approve before implementation; production Algolia remains a later checkpoint.

---

## Next Step

Owner **APPROVE SLICE 3 PLAN WITH REQUIRED CHANGES** recorded 2026-08-24:

- Search Concepts must **not** rank immediately under title ahead of structured Smart Profile fields.
- Evidence hierarchy: title → structured identity/intent → searchConcepts → visibleText → objects → legacy searchText/tags.
- Implement-phase notes retained: Smart Filter URL **state-only**; Colors/Themes top-N + typeahead; Algolia record-size test.
- Classifier must include search-relevant `smartProfile` sync.

**Proceed to Implement → Test → Formal implementation review.** Stop before DEV deploy requiring owner authorization.
