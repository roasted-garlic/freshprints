# Review: Custom Request AI Context + Final Source Workflow

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-custom-request-ai-context-and-final-source-workflow-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly maps the owner’s four workstreams onto the real Assisted Creation stack (not the nonexistent `custom-requests/` paths), documents current status/tab/Start Work/approve flows from repo inspection, and proposes a bounded `final_source_needed` stage plus copy-only AI context builders and proof presentation hardening. Scope stays within Phase 9 Assisted Creation; no AI API. Implementation must wait for explicit owner approval. A short list of required changes tightens product defaults and security wording before code starts.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Four workstreams; explicit OOS |
| Architecture alignment | pass | Shared pure builders; services; callables for transitions |
| Security impact addressed | pass | Honest browser limits; authz; avoid new public endpoints |
| Data model impact addressed | pass | New status + `finalSource`; migration none |
| Backend impact addressed | pass | Callables + optional rules; deploy gated |
| Test strategy adequate | pass | 25 cases + commands |
| Human checkpoints identified | pass | Incl. implementation approval stop |
| Roadmap alignment | pass | Phase 9 Custom Designs polish |
| Documentation plan | pass | DATA_MODEL / BACKEND / ADR |
| No silent scope expansion | pass | Notifications deferred; no DRM |

---

## Architecture Review

**Findings:**
- Correctly identifies Assisted Creation as the Custom Request system; rejects invented `custom-requests/` modules.
- AI Context as shared pure utilities + thin Studio modal matches layering.
- Status→tab helper extraction is the right fix for Start Work navigation.
- Final source as a separate Storage object (not overwriting proofs) matches ADR-FP-093 separation of proof vs delivery.

**Required changes:**
- [ ] At implement start, add a single shared `stageForAssistedCreationStatus` used by Studio list + any Portal “open request” helpers that hardcode open enums (audit call sites).

---

## Security Review

**Findings:**
- Prefer authenticated `getBytes` → object URL over new HTTP endpoints; plan correctly gates any new binary Function.
- Opaque Storage keys + presentation-layer fix for legacy proofs is sound.
- AI JSON exclusion list is appropriate.
- Catalog share purge/kind safety called out.

**Required changes:**
- [ ] Implementation must not log `storagePath` or signed URLs in Portal/Studio error toasts.
- [ ] Final-source Storage rules must mirror proof write policy (owner/admin write; owner customer + staff read) — document exact rule snippet in implement notes.

**Human approval needed before production:**
- [x] Production deploy — not authorized this phase
- [x] Rules + Functions deploy to `fresh-prints-dev` — separate owner gates after implement

---

## Data Model Review

**Findings:**
- `final_source_needed` as open nonterminal is required and correctly flagged for open-status arrays.
- Reference model gap (no per-image notes) honestly documented — mapper must not invent `customer_note`.
- answersVersion only `1` — “legacy” tests = sparse v1 docs.

**Required changes:**
- [ ] Lock product defaults at approval (see below); encode in ADR when implementing:
  1. `catalog_share` approve → `approved` directly (preserve ADR-FP-108).
  2. Proof-path Add to Request copies **final source** once present (update ADR-FP-094 in same workflow).
  3. Omit AI JSON `title`.
  4. Final-ready push/email **out of scope** this phase.

---

## Backend Review

**Findings:**
- Approve currently hardcodes `toStatus = "approved"` in `customerRespondToAssistedCreationProof` — plan correctly targets that.
- Reuse `staffAddAssistedCreationProof` patterns for final upload validation; prefer one callable that uploads metadata + transitions to `approved` atomically.
- Purge jobs must ignore `final/` objects when purging proofs.

**Required changes:**
- [ ] None beyond product defaults above.

---

## Testing Review

**Findings:**
- Matrix covers owner’s 25 items; commands match TESTING.md.
- Manual QA script is sufficient for soft-signoff gate.

**Required changes:**
- [ ] None.

---

## Documentation Review

**Findings:**
- ADR + DATA_MODEL + BACKEND updates listed; good.

---

## Required Changes (approved_with_changes)

1. Treat the four product confirms in plan §20 as **defaults** for implementation unless owner overrides at approval time (catalog_share direct complete; Add-to-Request uses final source; omit title; no final-ready notification).
2. Audit all `ASSISTED_CREATION_OPEN_STATUSES` / terminal / Portal display switch sites when adding `final_source_needed`.
3. Do not create `apps/*/custom-requests/` folders; extend Assisted Creation modules only.
4. Prefer client `getBytes` for proof preview; only propose a new HTTP Function if `getBytes` fails under real Portal constraints — then stop for security human checkpoint before adding it.

---

## Blockers (if blocked)

None — planning quality is sufficient to seek owner implementation approval.

---

## Verdict Rationale

**approved_with_changes** — Plan is accurate to the repo, covers all 20 owner deliverables, marks real `[NEEDS REPO CHECK]` gaps (per-image notes, missing custom-requests paths, notification OOS), and enforces the hard gate. Changes are clarifications/defaults, not a rewrite.

---

## Next Step

**Await owner approval to implement.** Do not start Implement until the owner explicitly approves (e.g. `APPROVE IMPLEMENTATION`).
