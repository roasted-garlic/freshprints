# Formal Review: Workstream H — Studio Customer Upload / Donation intake load + sidebar count integrity

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Reviewer | Review Agent (independent of Planning Agent authorship) |
| Plan | `docs/workflow/plans/2026-08-11-studio-customer-upload-intake-performance-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly identifies the dual defects: (1) purpose-unscoped list queries with sequential enrichment before client purpose filter, causing ~donation-scale latency on both Studio intake routes; (2) badge vs Pending empty mismatch driven by **different predicates/limits** (unlimited badge vs `limit(50)` + post-enrich purpose filter), not remount/local state — consistent with cold-start survival. Preferred fix (server-side purpose+status queries, progressive image hydration, Pending-only purpose-scoped badges) is in scope and architecture-aligned. Implementation is gated on the required changes below; A–G must remain unmerged/undeployed during H implement unless the owner separately authorizes.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio/query/index verify; no E/F3 lifecycle rewrite |
| Architecture alignment | pass | Hooks/services; no UI→Firestore shortcut expansion |
| Security impact addressed | pass | Existing intake permissions; no Rules change preferred |
| Data model impact addressed | pass | Status/purpose semantics documented; no schema migration |
| Backend impact addressed | pass | Functions not required for preferred path |
| Test strategy adequate | pass | Automated + cold-start + timing instrumentation |
| Human checkpoints identified | pass | Index prod verify; A–G separate; Studio 1.0.3 blocked |
| Roadmap alignment | pass | Pre-1.0.3 corrective |
| Documentation plan | pass | Badge semantics + DATA_MODEL/Studio notes |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Current list path violates “bounded relevant work”: fetches mixed-purpose pending page, enriches all, then filters — confirmed in `useCustomerUploadIntake`.
- Badge path is enrichment-free but purpose-unscoped and unlimited — correct for explaining cold-start `2`, wrong as long-term scale shape.
- Progressive render (metadata first, URLs later) matches existing Fresh Prints UX expectations and acceptance criteria 4–5, 15.

**Required changes:**
- [x] Implement must purpose-scope **both** list and badge queries (not list-only).
- [x] Route-level Loading must clear on purpose-scoped Firestore metadata, not on full image enrichment.
- [x] Do not use `rows.length` (paginated) as badge total.

---

## Security Review

**Findings:**
- No new public endpoints; staff intake permission gates remain.
- Read-only prod sampling of the “2” docs during Test is acceptable; no agent prod mutation.

**Required changes:**
- [ ] None beyond existing permission checks.

**Human approval needed before production:**
- [ ] Firestore **index deploy** only if prod lacks purpose composites (checkpoint at implement/test, not during this Plan/Review).
- [ ] Studio release / App Hosting / Functions remain separate from H unless owner phrases approve them.

---

## Data Model Review

**Findings:**
- Badge today: `pending_staff_review` only — **not** `not_eligible`. Owner’s E expectation is already partially matched by badge status filter; discrepancy is list incompleteness + possible legacy pending print_request docs.
- Preferred badge = Pending-only, purpose-scoped — **pass** vs Excluded-inclusive (Excluded stays a tab).

**Required changes:**
- [x] **Constraint H-DM-1:** Before claiming “badge inflated by not_eligible,” Test must read the 2 counted docs. If they are true `pending_staff_review`, after H they must **appear** on Uploaded Pending (fix list), not be zeroed by UI hide.
- [x] **Constraint H-DM-2:** Firestore `where("purpose","==","print_request")` excludes docs **missing** `purpose`. Client `resolveCustomerUploadPurpose` treats missing as print_request. Implement must detect/handle this mismatch (compat query path, documented backfill STOP, or verified zero missing-purpose pending in prod) — no silent drop of actionable rows.

---

## Backend Review

**Findings:**
- Preferred path: Studio + existing indexes; Functions/Rules out of preferred scope.
- Workstream E Functions must not be weakened by H Studio changes.

**Required changes:**
- [x] **Constraint H-BE-1:** No Functions/Rules/F3/E lifecycle edits in H unless Formal Review is reopened.
- [x] **Constraint H-BE-2:** Confirm prod indexes for `purpose + catalogReviewStatus (+ createdAt)` before relying on new queries; STOP for human index deploy if missing.

---

## UI / UX Review

**Findings:**
- “Loading donations/uploads…” hostage to all thumbnails is a real defect.
- Empty state must appear immediately after purpose-scoped query returns empty — not after enriching 50 donations.

**Required changes:**
- [x] Progressive card images; broken URL must not block page.
- [x] Preserve live update copy/behavior with purpose-scoped listeners.

---

## Testing Review

**Findings:**
- Plan’s automated + cold-start criteria 22–30 are mandatory.
- Timing instrumentation must be stripped or gated before production Studio package.

**Required changes:**
- [x] Include regression: Excluded / Restore / Send to AI / Delete / E timing / F3 delete-refund paths unchanged.
- [x] Explicit test: many donations + few print_request pending → Uploaded list shows the print_request rows (not empty).

---

## Required Changes Before / During Implementation

1. **H-DM-1 / H-DM-2** — purpose field / legacy pending handling as above.  
2. **H-BE-1 / H-BE-2** — no lifecycle/Rules drift; index verify.  
3. Purpose-scope badge **and** list.  
4. Progressive hydration; Loading ≠ all images.  
5. Update A–G Implementation Review tip table to actual tips (`633d3fa` / `e39fc20`) as docs-only reconciliation (already explained; do not rewrite branches).  
6. Do **not** merge or deploy A–G as part of H planning/implement unless owner issues a separate merge/deploy phrase.

---

## Verdict

**approved_with_changes** — Implement may proceed only after owner issues the approval phrase below and implement follows Constraints H-DM-1, H-DM-2, H-BE-1, H-BE-2 and the Required Changes list.

Studio 1.0.3 remains blocked until H is implemented/tested/signed or a later Formal Review proves no source change is required (this Review does **not** prove no source change — source change **is** required).

---

## Exact next implementation approval phrase

```text
APPROVE IMPLEMENT: STUDIO UPLOAD INTAKE PERF + COUNTS
```

---

## Formal return (1–26)

| # | Finding |
|---|---------|
| 1 | Badge 88: `Sidebar` → `usePendingCustomerUploadCounts().catalogDonation` |
| 2 | Badge 2: same hook `.printRequest` |
| 3 | Status: `pending_staff_review` only; purposes: client-split donation vs non-donation |
| 4 | Badge `2` ≠ `not_eligible` count; = print_request-classified pending docs. List empty ≠ proof those docs are not pending |
| 5 | List: status + `orderBy createdAt desc` + `limit(50)`. Badge: status only, unlimited |
| 6 | List fetches ≤50 docs before purpose filter |
| 7 | Yes — client purpose filter after enrich |
| 8 | Yes — hydration before purpose filter |
| 9 | Shared unscoped pending page + sequential enrich ≈ same cost both routes |
| 10 | Sequential per-row enrich / `getDownloadURL` |
| 11 | Yes — initial Loading waits for full enrichment |
| 12 | `purpose ==` + `catalogReviewStatus ==` + `orderBy createdAt desc` + limit |
| 13 | Repo indexes already cover purpose+status(+createdAt) |
| 14 | New index def unlikely; **prod build verify** may still be required |
| 15 | Pending-only, purpose-scoped badges |
| 16 | Aggregate/`getCountFromServer` or purpose-scoped snapshot without images — yes preferred |
| 17 | Fewer opposite-purpose reads; eliminate cross-purpose enrich tax |
| 18 | Studio intake hooks/services/section + tests; index verify |
| 19 | **approved_with_changes** |
| 20 | `APPROVE IMPLEMENT: STUDIO UPLOAD INTAKE PERF + COUNTS` |
| 21 | Cold start: live Firestore listener (not remount-only local state) |
| 22 | No Studio persistent IndexedDB Firestore cache found for this path |
| 23 | Yes — badge and Pending use different queries (unlimited vs limit 50) |
| 24 | Live 2 pending print_request-classified docs; list page crowded by donations |
| 25 | Not explained by `not_eligible` in badge code; confirm docs in Test (legacy pending likely) |
| 26 | Purpose-scoped list+badge + progressive hydration so restart/sidebar/Pending agree |

---

## Stop

**STOP after Plan + Formal Review.** Do not implement H until the approval phrase. Do not merge A–G. Do not deploy Storage Rules, Functions, App Hosting, or Studio 1.0.3 in this pass.
