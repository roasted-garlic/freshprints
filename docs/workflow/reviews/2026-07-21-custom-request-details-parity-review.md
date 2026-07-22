# Review: Custom request details parity (Portal + Studio)

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-custom-request-details-parity-plan.md |
| Verdict | **approved** |

---

## Summary

Root cause and fix match the evidence: Firestore already stores full `AssistedCreationAnswers` and `referenceImages`; Studio’s Request details JSX omits subject extras Portal already shows, and both UIs omit wording notes/bools and `referenceUsage`. A shared non-empty display-row helper plus Studio/Portal wiring and a Studio ref-URL placeholder fix is the right narrow approach. Security/data/backend impact is none; manual checkpoint is correctly required.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio primary; Portal gaps; no schema/deploy/#14 |
| Architecture alignment | pass | Pure shared util; UI keeps presentation |
| Security impact addressed | pass | Display-only |
| Data model impact addressed | pass | No persisted field changes; optional DATA_MODEL note OK |
| Backend impact addressed | pass | No Functions/rules |
| Test strategy adequate | pass | Unit helper + typechecks + manual Portal/Studio |
| Human checkpoints identified | pass | Manual UI parity |
| Roadmap alignment | pass | Bugfix / parity; parked #14 untouched |
| Documentation plan | pass | Minimal DATA_MODEL note |
| No silent scope expansion | pass | Wizard review / full label merge optional/out |

---

## Architecture Review

**Findings:**
- Shared `buildAssistedCreationAnswerDisplayRows` under `packages/shared/src/utils/` fits existing `@fresh-prints/shared/*` export pattern.
- Portal/Studio keep `DetailRow` / `AnswerRow`; no backend calls from UI.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No auth, storage path, or rules changes. Reference image placeholder still uses existing Storage URL resolution; failures become UI placeholders only.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (no production deploy in scope)

---

## Data Model Review

**Findings:**
- Fields already on `AssistedCreationAnswers`. No migration.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Persistence path confirmed intact; do not change callables in this phase.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Helper unit tests are the right automated gate. Manual mixed-field submit is required for owner confidence.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Brief DATA_MODEL note on display contract is enough; skip ADR unless behavior dispute arises.

---

## Required Changes (if approved_with_changes)

n/a

---

## Blockers (if blocked)

n/a

---

## Verdict Rationale

Inspection-backed plan, bounded scope, correct layering, adequate tests and human checkpoint. Boolean display rule for `textLayoutFlexible` (show true and false with explicit labels) is accepted so deliberate checkbox state is never dropped. Implement as written.

---

## Next Step

Implement approved scope (shared helper → Studio → Portal → Studio ref placeholders → unit tests → typecheck → manual checkpoint).

---

## Addendum A Review (2026-07-21)

| Field | Value |
|-------|-------|
| Scope | Wizard exact-wording draft persistence |
| Verdict | **approved** |

Preserve `exactText` across wording radio switches; submit-time `parseAssistedCreationAnswers` still strips when mode ≠ `exact_wording`. Review-step display must gate on `exact_wording`. Unit tests for apply helper + strip-on-submit required. Extend existing manual checkpoint.

---

## Addendum B Review (2026-07-21)

| Field | Value |
|-------|-------|
| Scope | Mood / vibe Etsy-style chip input (reuse `EtsyMultiValueInput`) |
| Verdict | **approved** |

Reuse existing Portal chip control; keep `mood: string` Firestore shape; normalize comma-joined tokens on submit in `parseAssistedCreationAnswers`. Cap items + shortText length. CSS so chips work on Style & mood step. Extend same manual checkpoint (create/remove/restore pills; Portal + Studio Mood row). No schema migration; prior checkpoint PASS not invented — do not invent.

---

## Addendum C Review (2026-07-21)

| Field | Value |
|-------|-------|
| Scope | Wizard Review card parity via shared display helper |
| Verdict | **approved** |

Root cause is hardcoded review list, not deploy. Wire `buildAssistedCreationAnswerDisplayRows` into review step; keep Description + reference file count locally. Gate Exact text to `exact_wording` in helper. No Firebase deploy.
