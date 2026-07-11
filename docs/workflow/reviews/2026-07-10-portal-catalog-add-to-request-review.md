# Review: Portal catalog “Add to request” from browse / design details

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-10-portal-catalog-add-to-request-plan.md |
| Verdict | **approved** |

---

## Summary

Plan is narrowly scoped to Portal browse→request entry using existing create/add/selection APIs. Human confirmed all recommended product defaults (immediate persist, skip design-CTA confirm, details+card CTAs, multi-request picker). Safe to implement without backend or rules changes.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal UI/hooks only; no Studio, no callables/rules |
| Architecture alignment | pass | UI → hook → existing services; selection mode reused |
| Security impact addressed | pass | Customer-owned draft/editing writes only; ready-design checks via existing service |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Reuse `createPortalPrintRequest` + `savePrintRequestDesignSelections` |
| Test strategy adequate | pass | Typecheck/lint/build + manual 0/1/2+ matrix; unit helper if extracted |
| Human checkpoints identified | pass | Product decisions confirmed; manual UI QA after implement |
| Roadmap alignment | pass | Phase 8 Portal polish on catalog/request UX |
| Documentation plan | pass | DECISIONS ADR required |
| No silent scope expansion | pass | Toast framework / deep scroll polish explicitly out of scope |

---

## Architecture Review

**Findings:**
- Shared `useAddDesignToRequestFlow` + picker modal is the right extraction; avoid bloating `usePrintRequestCreationFlow` with design-scoped state.
- Prefer `savePrintRequestDesignSelections` for persist to avoid duplicate items.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No new public endpoints or rule relaxations.
- CTA must remain behind existing Portal auth; design must be ready (existing service enforces).

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev Portal only for this phase)

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Manual matrix for 0/1/2+ and already-on-request is essential.
- Extract pure branch helper if practical for unit tests.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR in `DECISIONS.md` for browse→add-to-request entry and locked product defaults.

---

## Required Changes (if approved_with_changes)

None

---

## Blockers (if blocked)

None

---

## Verdict Rationale

Product open questions resolved by human (2026-07-10): all recommended defaults accepted. Plan is reversible, reuses proven selection mode, and does not expand into backend/rules. Approved for implementation as written.

---

## Locked product decisions (human-confirmed)

1. Immediate persist (qty 1) then enter selection mode
2. Skip create-confirm for design-level CTA
3. Details modal CTA + compact card Add
4. Multi-request: picker modal (not Working tab)

---

## Next Step

Implement approved scope.
