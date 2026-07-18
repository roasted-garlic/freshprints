# Plan: Assisted History Numbering, Auth Return URL, and Studio Parity

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Managing Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-17-assisted-history-auth-redirect-studio-parity-review.md` |

---

## Goal

Make Assisted Creation request progress easier to follow in both applications: number proof and revision-request events consistently in History, return Portal customers to the protected URL they originally requested after authentication, and align Studio’s assisted-request detail structure with the customer-facing Portal Overview / Proofs / History experience while preserving staff-only controls and information.

## Background

The owner explicitly started this coherent workstream while the prior `wizard-back-notif-studio-startup-unread-email-history` workflow still had an owner-run deploy and manual QA outstanding. That prior phase is parked as `passed_with_notes`; its Brevo restriction, deferred deploy notes, and manual QA remain in its own artifacts and are not expanded here.

Current inspection found:

- Portal and Studio Proofs lists already render `Proof {n}` from array order.
- Portal History derives unnumbered status titles in `assistedCreationDisplay.ts`; Studio independently derives unnumbered titles inside `AssistedCreationRequestsSection.tsx`.
- Proof submissions are represented by transitions to `proof_ready`; customer revision requests are transitions to `revision_requested`. These can be numbered deterministically from chronological history without a schema migration.
- `AuthGate` currently redirects unauthenticated users to plain `/login`, and `LoginForm` always returns authenticated users to `/`.
- Studio currently renders Brief / Request details in the main column and Proofs / History as side panels rather than Portal’s Overview / Proofs / History tab structure.

## Scope

### In Scope

- Add a shared, pure chronological history-label helper that numbers proof events and revision requests independently (`Proof 1`, `Revision request 1`, etc.) while retaining special labels for customer updates and proof-email events.
- Use that helper in Portal and Studio History rendering.
- Preserve legacy/malformed history compatibility and avoid coupling numbering to display sort direction.
- Capture the current protected Portal path plus query string in the login URL.
- Validate return targets as same-origin relative application paths only; reject protocol-relative, absolute, malformed, auth-loop, or external values and fall back safely.
- Carry the validated target through email/password and Google login, including first-time Google profile completion.
- Add focused unit tests for return-target validation and history numbering.
- Restructure Studio assisted-request details around Overview / Proofs / History tabs that mirror Portal’s labels, order, and customer-visible content hierarchy.
- Keep staff-only internal notes, status actions, proof upload, unread History controls, download controls, and role gates available in Studio.
- Adjust Studio CSS narrowly to support the parity layout in light and dark themes.
- Create a manual QA checkpoint covering all three owner requirements.

### Out of Scope

- Redesigning the Studio request queue, stage tabs, or staff permissions.
- Sharing Portal React/CSS components directly with Electron.
- Changing Assisted Creation statuses, proof/revision persistence, Firestore schema, Storage paths, or callable behavior.
- Changing Firebase Auth providers or console configuration.
- Changing Firestore/Storage rules, Cloud Functions, email providers, or Brevo.
- Deploying, pushing, or committing.
- Closing the prior workflow’s deferred deploy/manual-QA notes.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/assistedCreationHistory.ts`
- `packages/shared/src/utils/assistedCreationHistory.test.ts`
- `apps/portal/features/assisted-creation/utils/assistedCreationDisplay.ts`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/features/auth/utils/portalReturnUrl.ts` (new)
- `apps/portal/features/auth/utils/portalReturnUrl.test.ts` (new)
- `apps/portal/features/auth/components/AuthGate.tsx`
- `apps/portal/features/auth/components/LoginForm.tsx`
- `apps/portal/features/auth/components/CompleteProfileForm.tsx`
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx`
- `apps/studio/src/renderer/src/styles/components/staff-inbox.css`
- Relevant permanent docs describing Portal auth and Assisted Creation display behavior.

### Architecture Impact

- [ ] None
- [x] Details:
  - Shared pure history semantics stay in `@fresh-prints/shared`; each app owns its presentation.
  - Return-target parsing is a pure Portal auth utility; route components coordinate navigation without introducing backend access.
  - Studio remains a staff-specific UI with local controls, but its customer-visible detail information follows Portal’s presentation order.

### Security Impact

- [ ] None
- [x] Details:
  - URL/query input is untrusted. Only a leading-slash relative path on the current origin is accepted.
  - Reject `//`, backslash-normalized external forms, schemes, credentials/hosts, invalid decoding, and auth destinations that could loop.
  - Login and profile-completion redirects use a validated target or `/`; no external redirect is possible.
  - No auth/authorization boundary, role, or Firebase provider changes.

### Data Model Impact

- [x] None
- [ ] Details:
  - Numbering is derived from chronological `revisionHistory`; no fields, backfill, migration, or status changes.

### Backend Impact

- [x] None
- [ ] Details:
  - No Cloud Functions, Firestore rules, Storage rules, indexes, secrets, or environment variables change.
  - Exact deploy command for this phase: none. UI deployment/release remains owner-controlled.

### UI / UX Impact

- [ ] None
- [x] Details:
  - History titles become sequence-aware.
  - Portal login returns customers to the intended protected screen.
  - Studio assisted detail presents Overview / Proofs / History tabs, with staff controls retained in a clearly staff-only section.
  - Manual visual review is required for Studio/Portal structural parity, responsive Portal behavior, Studio light/dark themes, keyboard tab navigation, and no loss of staff actions.

### Migration Impact

- [x] None
- [ ] Forward steps:
- [x] Rollback / compatibility:
  - Revert display/helper and auth-navigation changes. Existing records and sessions remain valid.
  - Legacy history entries continue to render with status-based fallback labels.

---

## Approach

1. Add shared chronological event-label derivation that tracks proof and revision counters independently and returns stable labels by entry order.
2. Replace Portal and Studio’s duplicate History title branching with the shared label helper; retain Portal actor labels and Studio unread/read behavior.
3. Introduce a pure Portal return-target utility with a conservative allowlist and test matrix.
4. Have `AuthGate` append the encoded current path/query when routing to login. Have login and complete-profile flows preserve and consume the validated value, with `/` fallback.
5. Refactor Studio’s selected-request detail to an accessible Overview / Proofs / History tab interface modeled on Portal:
   - Overview: status/brief/request details/references.
   - Proofs: numbered proof list and proof detail/download behavior.
   - History: numbered event feed plus staff unread controls.
   - Staff controls: internal notes, lifecycle actions, and proof upload remain staff-only and outside customer-equivalent content.
6. Add or adjust narrow Studio styles using existing tokens and class conventions.
7. Update permanent auth/Assisted Creation documentation and record that no rules/functions deploy is required.
8. Run focused tests, typechecks, lint/build checks in proportion to the affected apps, then create the manual QA checkpoint and stop for owner results.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared/history + redirect unit tests | `npx tsx --test packages/shared/src/utils/assistedCreationHistory.test.ts apps/portal/features/auth/utils/portalReturnUrl.test.ts` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint | `npm run lint` | yes |
| Studio Vite build | `npm --prefix apps/studio exec vite -- build` | yes |
| Portal build | `npm run build:portal` | yes |
| Functions build | not applicable — no Functions change | no |
| Backend/rules | not applicable — no rules/backend change | no |
| E2E | no configured automated E2E suite; manual auth/UI checkpoint required | no |

### Manual

- [ ] History numbering:
  - A request with multiple proof/revision cycles shows `Proof 1`, `Revision request 1`, `Proof 2`, etc. in Portal and Studio History.
  - Proofs tabs still show matching proof numbers.
  - Customer-update and email-sent events retain their distinct labels.
- [ ] Login return-to:
  - Signed-out direct navigation to an Assisted request/status URL with query state goes to login and returns to the exact internal path after email login.
  - Repeat with Google login.
  - First-time Google profile completion returns to the original path after setup.
  - Invalid/external return values fall back to `/`.
- [ ] Studio/Portal visual parity:
  - Overview / Proofs / History labels and content order are recognizably aligned.
  - Studio still exposes internal notes, status actions, proof upload, downloads, and unread Read controls according to role.
  - Studio light/dark themes and keyboard navigation remain usable.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [x] Design approval (structural parity, not a wholesale redesign)
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: authenticated manual test for email/password, Google, and first-time profile-completion return paths.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Open redirect via crafted query input | High | Pure strict validator, hostile-input unit matrix, relative same-origin paths only, safe `/` fallback. |
| Redirect loop through `/login`, `/register`, or `/complete-profile` | Medium | Explicitly reject auth destinations as final return targets. |
| Query string lost between AuthGate, login, and profile completion | Medium | Use one validated parameter contract and preserve it through each auth route. |
| History numbering differs when Studio reverses display order | Medium | Derive sequence numbers chronologically before any presentation reversal. |
| Legacy notes/statuses produce wrong labels | Medium | Structural status detection with fallback status formatting and mixed-history tests. |
| Studio parity refactor hides or weakens staff-only controls | High | Keep staff controls in the same component and role gates; manual role/action regression checklist. |
| Broad CSS churn affects unrelated Customer Requests UI | Medium | Scope selectors under assisted-request classes and avoid changes to shared global controls. |
| Prior deferred deploy gets accidentally mixed into this phase | Medium | No Functions/rules edits; keep prior commands and QA solely in prior artifacts/state parked-workflow note. |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the shared display helper and app consumers, restore `AuthGate`/login/profile default navigation, and restore the prior Studio detail markup/styles. No data rollback, Firebase rollback, or migration is required because this phase changes only derived labels, client navigation, and UI structure.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [x] BACKEND.md — document secure post-auth return behavior and no backend deploy.
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: `docs/WORKFLOWS.md` or Assisted Creation section if present; workflow test/manual QA artifacts.

---

## Open Questions

- [x] None. Owner requirements define the desired labels, redirect safety boundary, and parity scope sufficiently for implementation.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-17-assisted-history-auth-redirect-studio-parity-review.md`
- Verdict: approved_with_changes
