# Review: Assisted History Numbering, Auth Return URL, and Studio Parity

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-17-assisted-history-auth-redirect-studio-parity-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan is bounded, matches the owner’s three requirements, and keeps the prior deploy/manual-QA work explicitly separate. It uses the correct shared/UI/auth layers, avoids a data migration, and identifies the open-redirect risk and required manual checkpoint.

Implementation is approved with narrow requirements on redirect validation, chronological numbering, and preservation of staff-only controls.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Three related Assisted Creation/auth/UI outcomes; no unrelated queue redesign. |
| Architecture alignment | pass | Shared pure labels, Portal auth utility, app-local presentation. |
| Security impact addressed | pass | Same-origin relative-only redirect contract and safe fallback are explicit. |
| Data model impact addressed | pass | Display-only numbering; no persisted sequence or migration. |
| Backend impact addressed | pass | No Functions/rules/index/env change expected. |
| Test strategy adequate | pass | Focused hostile redirect tests plus shared numbering, typecheck, lint, and builds. |
| Human checkpoints identified | pass | Auth and visual/manual behavior require owner testing. |
| Roadmap alignment | pass | Phase 9C Assisted Creation polish and Portal auth continuity. |
| Documentation plan | pass | Backend/auth and workflow behavior updates identified. |
| No silent scope expansion | pass | Prior Brevo/deploy/QA phase remains parked separately. |

---

## Architecture Review

**Findings:**
- Numbering belongs in a shared pure helper because Portal and Studio consume the same chronological history model.
- Presentation order must not determine numbering; Studio can reverse prepared display entries only after labels are assigned.
- Portal and Studio should align structure and copy, not import one another’s React/CSS implementation.
- Staff actions should remain in the existing Studio feature boundary and permission gates.

**Required changes:**
- [x] Derive proof/revision sequence labels before reversing or filtering for display.
- [x] Keep Portal and Studio UI components separate while sharing pure history semantics.

---

## Security Review

**Findings:**
- `returnTo` is attacker-controlled query input and is the only high-risk part of this phase.
- A string beginning with `/` is insufficient by itself: protocol-relative values, encoded/backslash variants, auth loops, and parser inconsistencies must fail closed.
- Firebase login methods do not need modification; navigation occurs only after the existing profile bootstrap reaches an accepted state.

**Required changes:**
- [x] Use one pure validator for all login/profile-completion consumers.
- [x] Accept only a local path/query target that resolves to the current application origin and begins with exactly one forward slash.
- [x] Reject absolute URLs, `//`, backslashes, control characters, malformed input, and final destinations under `/login`, `/register`, or `/complete-profile`.
- [x] Unit test plain, query-bearing, encoded hostile, protocol-relative, backslash, auth-loop, and external-origin inputs.
- [x] Fall back to `/` on every invalid or absent value.

**Human approval needed before production:**
- [x] Owner must manually verify real email/password, Google, and first-time Google profile-completion flows before signoff/release.

---

## Data Model Review

**Findings:**
- Existing `proofs` order and chronological `revisionHistory` provide enough information to derive display numbering.
- No persisted `proofNumber` or `revisionNumber` field is justified.

**Required changes:**
- [x] None beyond maintaining legacy-safe fallback labels.

---

## Backend Review

**Findings:**
- Existing callables already append proof and revision transitions with the required structural statuses.
- No Cloud Functions, security rules, Storage rules, indexes, provider settings, or secrets are needed.

**Required changes:**
- [x] Do not change Functions or rules unless implementation uncovers a concrete blocker. If that occurs, stop, revise the plan/review, and call out exact owner-run deploy commands.
- [x] Final summary and manual QA artifact must explicitly state: **no rules/functions deploy required for this phase** if that remains true.

---

## Testing Review

**Findings:**
- The proposed unit-test focus is appropriate.
- Builds/typechecks cover both app consumers; manual testing is required because Firebase auth redirects and Electron/Portal visual parity are not fully represented by unit tests.

**Required changes:**
- [x] Include mixed history with non-proof statuses and multiple proof/revision cycles.
- [x] Confirm Portal and Studio consume the same labels without changing Proofs-tab numbering.
- [x] Record exact commands and exit codes in the test report.
- [x] Stop at the manual checkpoint; do not claim signoff before owner feedback.

---

## Documentation Review

**Findings:**
- Update `BACKEND.md` with the Portal post-auth return contract and no-backend-change note.
- Update `WORKFLOWS.md` with derived proof/revision History numbering and Studio parity behavior.
- No data-model, rules, deployment, or environment documentation change is necessary unless implementation scope changes.

---

## Required Changes (approved_with_changes)

1. Follow the strict redirect-validation and hostile-input test requirements above.
2. Derive sequence labels chronologically before Studio presentation reversal.
3. Preserve all existing Studio role gates, internal notes, proof upload/download, status actions, and unread Read controls.
4. Keep Functions/rules untouched; if that assumption changes, return to plan/review and provide exact owner-run deploy commands.
5. Create and stop at the required manual QA checkpoint after automated testing.

---

## Blockers (if blocked)

1. None.

---

## Verdict Rationale

The design addresses the required functionality with low data/backend risk and an explicit security boundary for redirect input. The listed changes are implementation constraints already compatible with the plan, so revision is not required before work begins.

---

## Next Step

Implement the approved scope and required changes, then run and document automated checks before creating the owner manual QA checkpoint.
