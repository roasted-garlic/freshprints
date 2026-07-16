# Review: Admin-managed Etsy questionnaire suggestion lists

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent (+ Security Agent perspective) |
| Plan | docs/workflow/plans/2026-07-16-etsy-admin-managed-suggest-lists-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Narrow, well-scoped plan: Firestore overlay for admin-added Subject/Tone suggestions, callable writes for owner/admin, Portal merge with static seed, Studio Settings UI. Security model matches existing AI settings pattern (Admin SDK writes, client write deny). Approved with small required implementation constraints below—no plan rewrite needed.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Add/deactivate only; no CMS/scrape |
| Architecture alignment | pass | UI → service → callable/Firestore; shared helpers |
| Security impact addressed | pass | See Security Review |
| Data model impact addressed | pass | New collection documented; soft-delete |
| Backend impact addressed | pass | Two callables + rules; dev-only deploy |
| Test strategy adequate | pass | Unit + typecheck + manual QA |
| Human checkpoints identified | pass | Owner manual QA; no prod |
| Roadmap alignment | pass | Phase 9A follow-up |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS |
| No silent scope expansion | pass | Out-of-scope explicit |

---

## Architecture Review

**Findings:**
- Overlay model (static seed ∪ admin docs) is the right narrow choice vs migrating the full dictionary into Firestore.
- Extending `matchSuggestDictionary` with optional extras avoids duplicated match logic.
- Parser remaining static-only (A8) is acceptable for this phase; document as known limitation in ADR.

**Required changes:**
- [ ] None (architectural)

---

## Security Review

**Findings:**
- Callable-only writes with owner/admin gate is correct; do **not** allow client writes even with rules (avoids rule drift / incomplete field validation).
- Read-as-signed-in is appropriate (non-secret marketing helpers). Do not allow unauthenticated read.
- Server must enforce: kind enum, max lengths, trimmed non-empty label, alias count/length caps, case-insensitive dedupe against static + active admin.
- Soft-deactivate must verify doc exists and preferably `kind` is unchanged (no field rewrite attacks via client—N/A if Admin SDK only).
- Do not reuse `etsyRecommendationConfig` deny-all collection for this feature (legacy scrape kill switch); new collection keeps intent clear.
- No secrets; no production.

**Required changes:**
- [x] Cap aliases (e.g. max 10, each ≤ 40 chars) and reject control characters / empty tokens in callable validation.
- [x] On deactivate, only flip `active`/`updated*` — do not accept arbitrary field patches from client payload beyond `suggestionId`.
- [x] Portal/Studio must not attempt client writes to the collection.

**Human approval needed before production:**
- [x] Production deploy of rules/functions (out of this phase)

---

## Data Model Review

**Findings:**
- `labelKey` for dedupe is good; ensure callable sets it server-side only.
- `active: boolean` with soft-delete is sufficient; hard delete out of scope.
- Composite index: plan queries `kind` + `active`; add composite to `firestore.indexes.json` if the query uses both equality filters (implementer verifies).

**Required changes:**
- [x] Document collection name exactly as implemented in DATA_MODEL in the same workflow.
- [x] If query is `where('kind','==',…).where('active','==',true)`, add composite index entry during implement.

---

## Backend Review

**Findings:**
- Two callables sufficient; list can be direct Firestore read (signed-in) — prefer that over a third callable to reduce latency (matches catalog-style reads).
- Deploy target `fresh-prints-dev` only — correct.

**Required changes:**
- [x] Fail closed on auth/role; return user-safe duplicate errors (no stack/PII).

---

## Testing Review

**Findings:**
- Shared merge/dedupe + callable validation tests are the right automated core.
- Manual QA covers the owner path (admin add → portal dropdown).

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- DATA_MODEL / BACKEND / DECISIONS required; ROADMAP optional one-liner under Phase 9A follow-ups if touching ROADMAP anyway—skip unless trivial.

---

## Required Changes (if approved_with_changes)

1. Callable validation: alias caps + length; server-owned `labelKey`; deactivate payload = `suggestionId` only.
2. Add Firestore composite index if `kind`+`active` compound query is used.
3. Keep client writes denied; Portal falls back to static-only on read failure.
4. ADR must note parser does not yet consume admin subject overlays (A8).

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Security and scope are sound; overlay approach avoids a large seed migration. Conditional approval encodes validation/index/docs constraints for implement without expanding product scope.

---

## Next Step

Implement approved scope (with required changes above) on `fresh-prints-dev`.
