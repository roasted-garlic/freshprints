# Plan: Portal Assisted Resume + Guest Auth Overlay Position

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-21-portal-assisted-resume-and-auth-overlay-review.md |

---

## Goal

On the Custom Designs hub, mirror **Help Me Find a Design** resume UX for **Fresh Prints Assisted Creation** when a local wizard draft exists (Reset + Continue). Separately, raise the guest **Login required** overlay on mobile so it does not sit against the bottom nav.

## Background

- Find already uses `hasResumableFindDraft` + Reset/Continue on `EtsyRouteChoosePath`.
- Assisted Creation still shows only **Start assisted request** even when `fp.assistedCreation.draft.v1` localStorage has progress; Start already deep-links into the draft step silently.
- Guest overlay (`.portal-guest-auth-overlay`) is flex-centered inside `.portal-app-content`, which on mobile includes bottom-nav padding — visual center sits too low.

Parked (unchanged): custom-request details parity manual checkpoint — **no PASS invented**.

## Scope

### In Scope

1. **Assisted card resume UI** on Custom Designs choose path:
   - When no open Firestore assisted request **and** a resumable local draft exists: continue/reset copy + **Reset request** / **Continue request** (parallel to Find’s Reset/Continue search).
   - When no draft: keep **Start assisted request**.
   - When open assisted request exists: keep existing **View request status** (open request takes precedence over draft UI).
   - Reset clears assisted draft via `clearAssistedCreationDraft`, then opens wizard at first step.
   - Continue uses existing draft-aware navigation (resume at stored step).

2. **Mobile guest auth overlay position**:
   - CSS-only (or minimal class tweak) so overlay card sits higher on small viewports, accounting for bottom nav + safe-area.
   - Desktop centering unchanged unless a shared tweak is clearly harmless.

### Out of Scope

- Production deploy
- Custom-request details parity review / inventing PASS for that checkpoint
- Changing Firestore open-request cancel/status flows
- Redesigning Find card or auth copy beyond overlay placement

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/assisted-creation/utils/assistedCreationDraftStorage.ts` — `hasResumableAssistedCreationDraft` (+ unit test)
- `apps/portal/features/etsy-recommendations/components/EtsyRouteChoosePath.tsx` — assisted Reset/Continue UI
- `apps/portal/features/etsy-recommendations/pages/EtsyRecommendationsPageContent.tsx` — wire reset/continue/hasDraft props
- `apps/portal/styles/shell.css` — mobile `.portal-guest-auth-overlay` positioning
- Optional: thin test for draft helper

### Architecture Impact

- [x] Details: UI + local draft helper only; reuse existing draft storage and href builders. No new layers.

### Security Impact

- [x] None (localStorage client draft already used; no auth rule changes)

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Custom Designs assisted card; guest login overlay on mobile. Manual checkpoint required.

### Migration Impact

- [x] None

---

## Approach

1. Add `hasResumableAssistedCreationDraft(draft?)` mirroring Find: true when draft exists and has meaningful progress (`stepIndex > 0` and/or non-default answer content such as non-empty description/subjects/mood/etc., or enums moved off defaults). Empty untouched draft → false.

2. Extend `EtsyRouteChoosePath` with `hasResumableAssistedDraft`, `onContinueAssistedCreation`, `onResetAssistedCreation` (names aligned with Find props).

3. Render assisted actions:
   - open request → View status (unchanged)
   - else resumable draft → secondary Reset + primary Continue
   - else → Start (primary)

4. In `EtsyRecommendationsPageContent`:
   - Continue = existing draft-aware `onAssistedCreation` navigation
   - Reset = `clearAssistedCreationDraft()` then `buildAssistedCreationHref({ mode: 'wizard', stepId: 'description' })`
   - Pass `hasResumableAssistedCreationDraft()` (recompute on choose view; client-only)

5. Mobile CSS (`max-width: 47.99rem` to match bottom-nav breakpoint): increase bottom padding of overlay by bottom-nav + FAB half + safe-area; optionally `align-items: flex-start` + modest top offset so card sits in upper-mid viewport. Keep desktop as today.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit | `npx tsx --test apps/portal/features/assisted-creation/utils/assistedCreationDraftStorage.test.ts` (new) | yes |
| Typecheck | Portal `tsc` / project script as used recently | yes |
| Lint | if touched files flagged | no if clean |
| Build | no | no |
| E2E | no | no |

### Manual

- [x] Details: see Human Checkpoints — assisted Reset/Continue; mobile overlay height vs bottom nav

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (both fixes)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: Prior custom-request checkpoint remains open (do not invent PASS)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| False “in progress” from empty draft writes | Low | Meaningful-content check like Find |
| Open request + orphan draft confusing UI | Low | Open request UI wins |
| Overlay too high on short phones | Low | Clamp top padding; manual check |
| Scope creep into custom-request work | Med | Park that phase; separate goal |

---

## Rollback Plan

Revert the listed Portal files; localStorage draft key unchanged.

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
- [x] Other: workflow plan/review/test/manual checkpoint only unless STYLE_GUIDE notes mobile overlay (skip unless pattern is documented elsewhere)

---

## Open Questions

- [x] None — wording: **Reset request** / **Continue request** to parallel Find’s Reset/Continue search.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-portal-assisted-resume-and-auth-overlay-review.md
- Verdict: pending
