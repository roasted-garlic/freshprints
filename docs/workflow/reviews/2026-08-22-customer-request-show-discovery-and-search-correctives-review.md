# Review: Customer Request, Show Discovery & Search Correctives

| Field | Value |
|-------|-------|
| Date | 2026-08-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-22-customer-request-show-discovery-and-search-correctives-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan is well-bounded, repo-grounded, and correctly captures all five workstreams without Phase 9 scope creep. Root-cause analysis for WS2, WS3, and WS5 matches current code. The three-wave implementation split is appropriate for safe delivery. Approval is conditional on implementing the listed required changes (defaults for open product questions) before Wave 3.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | All five workstreams present; out-of-scope explicit |
| Architecture alignment | pass | Trusted callables, service layers, no UI→Firestore violations |
| Security impact addressed | pass | Show Designs DTO boundary; conversion staff-only |
| Data model impact addressed | pass | Optional fields; no migration |
| Backend impact addressed | pass | Three new/extended callables documented |
| Test strategy adequate | pass | Unit + E2E + manual DEV QA per wave |
| Human checkpoints identified | pass | Plan/review, QA, prod deploys separated |
| Roadmap alignment | pass | Phases 4, 6, 7, 8 fast-follow |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS |
| No silent scope expansion | pass | Phase 9 parked; no deploy in scope |

---

## Architecture Review

**Findings:**

- WS1 correctly rejects flipping `isInternal` on the existing document; new internal request + archived customer request with linkage is the right model.
- WS2 should implement reconciliation in the **callable** (not Studio-only) so helpers with Mark Complete permission get consistent behavior without widening Firestore client writes.
- WS4 correctly identifies that Portal cannot query cross-customer allocations; new callable is mandatory.
- WS5 shared normalization in `packages/shared` is the right consolidation point; Studio exact-ID path correctly isolated.

**Required changes:**

- [x] WS2: Prefer server-side reconciliation inside `completeStaffGangSheetAndOpenNext` (or shared Functions lib), not Studio-only post-call — **confirmed in plan; implement as stated**
- [x] WS4: Default **auth-required** Show Designs unless owner explicitly opts into guest browse during implementation — **use plan default**

---

## Security Review

**Findings:**

- Show Designs callable must never return `printRequestId`, `customerId`, or upload identifiers — plan states this; implementation must add explicit DTO type + tests.
- Conversion callable must be staff-only; customers read closure metadata on own requests only.
- Username change does not weaken Rules or reservation uniqueness.
- Search normalization does not expose private data.

**Required changes:**

- [ ] None blocking

**Human approval needed before production:**

- [x] Functions deploy for new callables (WS1, WS2 extension, WS4)
- [x] App Hosting rollout for Portal changes
- [x] Studio publish for Studio UI changes

---

## Data Model Review

**Findings:**

- `closureKind` + bidirectional IDs are sufficient for audit without recycling CR sequences.
- `archived` + `closureKind` avoids mislabeling as `completed`/printed.
- Portal tab derivation needs explicit handling for converted requests (plan notes this).

**Required changes:**

- [x] Implement `derivePortalPrintRequestDisplayLabel()` (or extend grouping) so converted requests show **“Converted to Internal Request · Closed”** and land in terminal history (default: Printed tab) — **required before Wave 3 signoff**

---

## Backend Review

**Findings:**

- Index impact likely low; confirm `showAllocations` by `upcomingShowId` at implement time.
- Algolia reindex correctly deferred; client post-filter acceptable for WS5.
- Idempotency strategies documented for conversion and gang-sheet completion.

**Required changes:**

- [ ] None blocking

---

## Testing Review

**Findings:**

- E2E test spanning WS1 + WS2 is essential and included.
- Manual DEV QA checklist covers regression surfaces (Whatnot finish, Design ID search).
- Commands match `docs/standards/TESTING.md`.

**Required changes:**

- [x] Add explicit negative test: `kill` must not match `will` after normalization — **in plan; verify at test phase**

---

## Documentation Review

**Findings:**

- ADR for conversion semantics and search normalization contract required.
- DATA_MODEL and BACKEND updates scoped appropriately.

---

## Required Changes (approved_with_changes)

1. **WS2:** Implement allocation finish + print-request reconciliation in **Cloud Functions** (shared with callable), not Studio client-only writes.
2. **WS1 Portal UX:** Implement explicit converted-request label and terminal tab placement using plan default (Printed tab + closure chip) unless owner replies before Wave 3 implement.
3. **WS4:** Ship auth-required Show Designs in Wave 2; guest public browse remains out of scope unless owner approves during implement.
4. **WS1 eligibility:** Auto-cancel only `pending`/`queued` allocations; hard-fail on `in_progress`/`printed`/`done` — implement as plan default.

---

## Blockers

None.

---

## Verdict Rationale

The plan satisfies all user-mandated plan sections (root causes, schema analysis, privacy boundary, file lists, rules/indexes/functions/Algolia impact, compatibility, idempotency, tests, manual QA, ADRs, deploy checkpoints). Wave sequencing reduces risk. Open questions are documented with sensible defaults suitable for implementation.

**Implementation is authorized for Wave 1 after owner acknowledges this review.** Waves 2–3 proceed sequentially within approved scope. Owner may override open-question defaults by replying before the relevant wave starts.

---

## Next Step

**STOP — await owner implementation approval.** Do not begin code changes until owner approves implementation (per user instruction: Plan + Formal Review only).

When approved:
1. Update workflow state to `Review Status: approved_with_changes`
2. Begin Wave 1 (WS2 + WS5) implement phase
