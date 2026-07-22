# Review: Studio view of Etsy Open API search results

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-20-studio-etsy-api-results-view-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Narrow, well-scoped fix for a real Studio gap: API listings are ephemeral today and only website links appear in the Etsy detail pane. Persisting a bounded Admin-written snapshot plus a staff-only refresh callable is the smallest path that works for both new Portal searches and existing/completed requests. Security posture (no client writes, secret-bound callable, no customer quota charge) is sound.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio Etsy API results only; Portal UI out |
| Architecture alignment | pass | Callables + Admin write; Studio service layer |
| Security impact addressed | pass | Staff assert; secret reuse; no keys in snapshot |
| Data model impact addressed | pass | Additive optional `lastApiSearch` |
| Backend impact addressed | pass | Portal persist + new staff callable |
| Test strategy adequate | pass | Unit + manual Studio QA + Functions deploy gate |
| Human checkpoints identified | pass | Manual UI + fresh-prints-dev Functions deploy |
| Roadmap alignment | pass | Phase 9A Studio polish |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS, SECURITY |
| No silent scope expansion | pass | Parks #12; no scrape / Portal redesign |

---

## Architecture Review

**Findings:**
- Correct layering: search + persist in Functions; Studio maps Firestore and calls staff callable.
- Prefer a shared persist helper and shared search/normalize path so Portal and staff stay consistent.

**Required changes:**
- [x] Extract shared persist (and ideally shared “run search for request doc” core) so staff and Portal cannot drift on keyword/listing shape.

---

## Security Review

**Findings:**
- Client writes remain denied — good.
- Staff callable must use the same staff gate as other Studio callables (`assertStaffCaller` / `loadCallerProfile`).
- Do not charge `etsyRecommendationRateLimits` on staff fetch.
- Soft-fail when `ETSY_X_API_KEY` missing (status `unavailable`), same as Portal.
- Snapshot may be readable by the owning customer via existing rules — acceptable (public listing metadata they already saw).

**Required changes:**
- [x] Reject custom search parameters on the staff callable (same deny list as Portal: keywords/query/limit/offset/sort).
- [x] Document that production deploy of the new secret-bound callable needs a separate human gate later.

**Human approval needed before production:**
- [x] Functions deploy with `ETSY_X_API_KEY` binding (dev allowed in this phase with owner deploy; production later)

---

## Data Model Review

**Findings:**
- Optional `lastApiSearch` without schemaVersion bump is fine.
- Cap listings at `ETSY_RECOMMENDATION_DISPLAY_LIMIT`.

**Required changes:**
- [x] None beyond plan

---

## Backend Review

**Findings:**
- Best-effort persist on Portal search is correct (customer UX must not fail if snapshot write fails).
- Staff fetch should work for `active` | `completed` | `cancelled`.

**Required changes:**
- [x] Staff path must not require `status === "active"` (unlike Portal refresh).

---

## Testing Review

**Findings:**
- Mock Etsy client seam already exists (`setEtsyClientForTests`) — reuse for staff/persist tests if the core is extracted.
- Manual Studio soft-reload + Functions deploy notes required in test report.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Plan lists the right docs. ADR should amend ADR-FP-087n / 087l family (e.g. ADR-FP-087o).

---

## Required Changes (if approved_with_changes)

1. Shared search+persist core used by Portal and staff callables (avoid duplicated keyword/search logic).
2. Staff callable: deny custom search params; allow any request status; no customer quota charge.
3. Production deploy remains out of scope / separate human gate; `fresh-prints-dev` deploy is the QA gate.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Approved with the three binding changes above. Scope is narrow and reversible; security defaults fail closed on missing secret and keep writes Admin-only.

---

## Next Step

Implement approved scope (with required changes). Park #12 remains until owner completes that manual QA separately.
