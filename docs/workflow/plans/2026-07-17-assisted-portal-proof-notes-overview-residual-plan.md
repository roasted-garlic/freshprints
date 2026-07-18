# Plan: Portal Assisted proof notes + Overview approved download

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (residual) |
| Parent | docs/workflow/plans/2026-07-17-assisted-approved-proof-download-plan.md |
| Related | docs/workflow/reviews/2026-07-17-assisted-portal-proof-notes-overview-residual-review.md |

---

## Goal

Portal Assisted Creation mirrors Studio’s per-proof messaging: each proof surfaces a **Fresh Prints (staff) proof note** and **customer notes linked to that proof** (revision / approval / follow-up), not a full history dump. Past / approved requests put the **final approved design** (compact preview + Download) on **Overview** so customers do not dig into Proofs only to download.

## Background

Owner residual after assisted approved-proof download / CORS work:

1. Portal proofs show staff note inline but not Studio’s linked customer notes for that proof window.
2. Past-request detail opens on Overview with brief only; download lives under Proofs.
3. Prefer compact, square-ish `object-fit: contain` previews and condensed notes (button → small scrollable modal), not oversized modals.

Prior residual (signed URL download + Approved badge + IAM Token Creator) remains; this is UI-only Portal polish. No new callables expected.

## Scope

### In Scope

- Per-proof Portal UI: two note affordances matching Studio —
  - Fresh Prints / proof note (`proof.note`)
  - Customer-facing linked notes for that proof’s history window (same time-window logic as Studio `relatedNotesForProof`)
- Small scrollable notes modal(s); no giant inline dumps
- Overview tab: when `status === 'approved'`, front-and-center compact approved preview + Download (reuse existing signed-URL callable)
- Compact square-ish proof / approved preview styling (`contain`)
- Status panel (active approved / proof_ready): align note pattern + keep download compact where already present
- Manual QA steps for owner retest (includes download if still pending)

### Out of Scope

- Production deploy; Functions deploy (unless unexpected gap)
- Commits
- Changing Messages tab full history
- Shared package extract of Studio helper (Portal-local mirror OK; optional later)
- Changing retention / purge / Approved badge logic

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/assisted-creation/utils/assistedCreationDisplay.ts` — `relatedNotesForProof` (+ reuse boilerplate filter)
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx` — Overview approved card; proof modal notes buttons; compact preview
- `apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx` — note buttons on active proof; compact approved preview if missing
- `apps/portal/styles/assisted-creation.css` — square preview stage; notes modal; Overview download card
- Optional unit test for related-notes windowing if cheap

### Architecture Impact

- [x] Details: UI + display util only; services unchanged (existing download callable)

### Security Impact

- [x] None (customer already sees own history / notes; no new data exposure)

### Data Model Impact

- [x] None

### Backend Impact

- [x] None (no new callables)

### UI / UX Impact

- [x] Details: Overview gains approved download block; proof modal uses note buttons; compact previews. Manual UI QA required.

### Migration Impact

- [x] None

---

## Approach

1. Port Studio’s `relatedNotesForProof` windowing into Portal display util with customer-facing labels (`You` / `Fresh Prints` / `System`).
2. Proof detail modal: replace large inline staff note with **Fresh Prints note** / **Your notes (N)** buttons → compact notes modal (Studio pattern).
3. Overview: if approved, render compact approved-design card (thumb/stage + Download + expiry hint) above Brief; Proofs tab remains full proof list.
4. Status panel: same note buttons on current proof; compact square preview for approved download section if oversized.
5. CSS: square stage (`aspect-ratio: 1/1`, max size capped), notes modal small + scrollable body.
6. Update workflow state; hand off manual QA (include Download retest if still open).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit -p apps/portal` (or package script) | yes |
| Unit | related-notes helper if added | optional |
| Lint | portal lint if quick | no |
| Build | skip unless typecheck fails | no |
| Functions | none | no |

### Manual

- Open past approved request → Overview shows preview + Download without opening Proofs
- Open a proof with staff note → Fresh Prints note modal
- Open a proof with revision/approval notes in window → Your notes modal; Messages tab still full history
- Proofs / status previews stay compact (not full-bleed tall)
- Download still works via signed URL (prior residual)

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval (not blocking — follow Studio pattern)
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Linked-note window mismatches Studio | low | Copy same start/end millis filter |
| Overview clutter for non-approved | low | Gate card on `approved` only |
| Modal stacking (proof + notes) | low | Match Studio z-index / close notes first |

---

## Rollback Plan

Revert Portal component/CSS/util changes; no backend rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: workflow plan/review/test/manual QA only (behavior already covered by assisted docs)

---

## Open Questions

- [x] None — Overview tab (not a new tab) hosts approved download; Proofs unchanged as list.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-assisted-portal-proof-notes-overview-residual-review.md
- Verdict: pending
