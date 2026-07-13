# Review: Portal Donate Designs

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-13-portal-donate-designs-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly reuses the customer-upload technical pipeline and keeps donations off the print-request attach path (ADR-FP-076). Scope is bounded: purpose discriminator, donate confirm callable, Portal donate page + sidebar link, Studio Donated Designs intake, docs. Approve with a short list of implement-time constraints so print and donate confirmation logic stay shared and safe.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicit out-of-scope; no Phase 9 / auto-list |
| Architecture alignment | pass | Callables + services; no UI Firestore writes |
| Security impact addressed | pass | Server-enforced ownership + required catalog consent |
| Data model impact addressed | pass | Additive `purpose`; legacy = print_request |
| Backend impact addressed | pass | New confirm + create purpose + attach guard |
| Test strategy adequate | pass | Unit + typecheck/build + manual checklist |
| Human checkpoints identified | pass | UI copy, optional flag confirm, prod deploy |
| Roadmap alignment | pass | Completes deferred ADR-FP-076 donation path |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS, ROADMAP |
| No silent scope expansion | pass | Print Upload Designs product behavior preserved |

---

## Architecture Review

**Findings:**
- Reusing `CustomerUploadPanel` / `useCustomerUploadBatch` via `purpose`/`mode` is the right reuse strategy.
- Separate `/donate` route and Studio page avoid conflating print and catalog contribution UX.
- Prefer extracting shared “mark uploads confirmed for catalog intake” helpers used by attach and donate confirms rather than copy-pasting Firestore update blocks.

**Required changes:**
- [x] Share confirmation/catalog-status write helpers between attach and donate callables where practical (do not fork large duplicated transaction bodies).
- [x] Default Portal route to `/donate` unless owner requests `/catalog/donate` before implement starts.

---

## Security Review

**Findings:**
- Donate confirm must reject missing/false `catalogUseAcknowledged` (stricter than ADR-FP-074 attach).
- Both confirm callables must reject purpose mismatch.
- Promote path may still allow staff to promote when `catalogUseAcknowledged` is false for **print** uploads; donate path will always be true if confirm succeeded — no promote change required this phase.
- Same Storage rules and rate limits apply — good.

**Required changes:**
- [x] Validate `purpose` on `createCustomerUploadBatch` as a strict enum; never trust client-only purpose for confirm transitions.
- [ ] None beyond plan for secrets/auth provider changes.

**Human approval needed before production:**
- [x] Functions + indexes deploy
- [x] Final consent copy if owner edits proposed wording

---

## Data Model Review

**Findings:**
- Additive `purpose` on upload + batch is sufficient; parallel collections would be wasteful.
- Treating missing `purpose` as `print_request` avoids backfill.
- Studio queries must filter explicitly so donate rows do not appear in Customer Uploads.

**Required changes:**
- [x] Document and implement query semantics: missing `purpose` ≡ `print_request`.
- [x] Add Firestore composite indexes for donate intake before relying on Studio live queries in QA.

---

## Backend Review

**Findings:**
- New `confirmCustomerUploadsForDonation` is cleaner than overloading attach with a mode flag — keep attach print-only with a purpose guard.
- No env vars — good.

**Required changes:**
- [x] Attach callable: reject `purpose === "catalog_donation"`.
- [x] Donate callable: reject non-donation purpose and any attempt to set `printRequestId` / create print request items.

---

## Testing Review

**Findings:**
- Plan’s automated + manual matrix is adequate.
- Add at least one unit test proving donate confirm requires catalog consent and does not create print request items (mock/transaction assertions as existing confirm tests do).

**Required changes:**
- [x] Include donate consent + no-attach unit coverage in the same test wave as implementation.

---

## Documentation Review

**Findings:**
- ADR follow-up should record: donations use same `customerUploads` collection with `purpose: catalog_donation`; catalog listing consent required; Studio Donated Designs is the intake surface.

---

## Required Changes (if approved_with_changes)

1. Share confirmation write helpers between attach and donate where practical (avoid large duplicated transaction logic).
2. Strict `purpose` validation on create + both confirms; missing purpose ≡ print_request for Studio print queue.
3. Unit tests: donate requires catalog consent; donate does not attach; purpose mismatch rejected.
4. Defaults: Portal route `/donate`; Studio label **Donated Designs**; any Portal customer may donate (no staff flag) unless owner overrides before implement.
5. Ship Firestore indexes with the backend work before Studio QA.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Aligned with ADR-FP-073/074/076, maximizes reuse, and keeps print and donate lifecycles separated at confirm and Studio intake. Conditional approval only to lock implement constraints (shared helpers, strict purpose, tests, indexes, defaults).

---

## Next Step

Implement approved scope with the required changes above. Before coding starts, owner may optionally override: staff donate flag **yes/no** (default no), route path, or consent copy.
