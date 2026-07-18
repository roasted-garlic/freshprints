# Plan: Assisted Creation Messages

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Managing Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-17-assisted-creation-messages-review.md` |

---

## Goal

Turn Assisted Creation History into a two-way **Messages** surface in Portal and Studio: customers can send a note on their own request at every lifecycle status, both apps retain the existing message-bubble timeline, and long threads scroll inside a capped panel instead of extending the page indefinitely.

## Background

The owner explicitly expanded the open Assisted Creation UX work. The current implementation already renders chronological chat bubbles, but calls the tab **History** and has no general customer composer. `customerUpdateAssistedCreationRequest` is intentionally limited to `submitted` because it edits the brief and references; widening that callable would risk customer mutation of locked request content. A distinct message-only callable is the safer boundary.

The roadmap's generic “Messaging System” exclusion predates this explicit, request-scoped owner direction. This scope is not platform-wide chat: it appends text-only entries to an existing owned request timeline.

The unrelated invite continue-URL deploy/manual-QA checkpoint remains parked and must not be deployed or signed off as part of this work.

## Scope

### In Scope
- Rename Assisted detail **History** tabs and headings to **Messages** in Portal and Studio.
- Add a Portal customer compose box at the bottom of the Messages panel.
- Permit an authenticated customer to append a text-only message to their own Assisted Creation request in every defined status: `submitted`, `in_progress`, `proof_ready`, `revision_requested`, `approved`, `rejected`, and `cancelled`.
- Add a dedicated `customerSendAssistedCreationMessage` callable; do not broaden brief/reference editing.
- Validate trimmed non-empty messages with a 2,000-character maximum and a transaction-enforced 10-second per-request customer cooldown.
- Add an explicit `kind: "customer_message"` structural marker to new revision entries; retain optional-marker compatibility for existing entries.
- Treat marked customer messages as customer updates for Studio unread/read-through behavior regardless of request status.
- Cap the timeline height and enable internal vertical scrolling in Portal and Studio; keep the composer below the scroll region.
- Scroll the thread to the newest message when Messages opens or the thread changes.
- Update data model/backend/workflow/security documentation and the existing Assisted manual QA checklist.
- Provide the exact `fresh-prints-dev` selective Functions deploy command; do not deploy without `APPROVE DEV DEPLOY`.

### Out of Scope
- Customer edits to `answers`, `referenceImages`, `status`, `proofs`, `staffNotes`, ratings, or staff/system history fields.
- Attachments, rich text, reactions, deletion/editing of sent messages, push/email notifications, or a general cross-product messaging system.
- New staff compose behavior; existing staff proof/status/internal-note paths remain unchanged.
- Firestore/Storage rules or index changes; direct client writes remain denied.
- Production deployment, secrets, migrations/backfills, push, or commit.
- Closing the parked invite continue-URL or earlier Assisted visual/auth manual checkpoints.

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`
- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts`
- `packages/shared/src/types/assistedCreation/assistedCreationActions.types.ts`
- `packages/shared/src/utils/assistedCreationHistory.ts`
- `packages/shared/src/utils/assistedCreationHistory.test.ts`
- `functions/src/assistedCreationRequests.ts`
- `functions/src/index.ts`
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/styles/assisted-creation.css`
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx`
- `apps/studio/src/renderer/src/styles/components/staff-inbox.css`
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/standards/SECURITY.md`
- `docs/WORKFLOWS.md`
- Assisted Creation test/manual-QA workflow artifacts and `.cursor/workflow/state.md`

### Architecture Impact
- [ ] None
- [x] Details:
  - Portal component → service → callable → Admin SDK preserves project layering.
  - A dedicated message callable prevents the locked brief/reference update API from becoming status-agnostic.
  - Shared types and history predicates remain the canonical cross-app interpretation layer.

### Security Impact
- [ ] None
- [x] Details:
  - Callable requires Firebase Auth and `requirePortalCustomer`, then verifies `customerUid` ownership inside a Firestore transaction.
  - Only `revisionHistory` and `updatedAt` are written; status and all staff/proof/brief fields are preserved.
  - Message is trimmed, required, and limited to 2,000 characters.
  - A 10-second per-request cooldown is computed from the latest structurally marked customer message in the same transaction, preventing concurrent bypass without a new rate-limit collection.
  - Direct Firestore writes remain denied, so no rules broadening is needed.
  - Terminal-state messaging is explicitly allowed because the owner required every stage; the UI remains clear that sending a message does not reopen or change the request status.

### Data Model Impact
- [ ] None
- [x] Details:
  - `AssistedCreationRevisionEntry.kind?` gains an optional structural discriminator including `customer_message`.
  - New customer messages use same-status entries (`fromStatus === toStatus`) and preserve the request's current status, including terminal statuses.
  - Existing unmarked history remains readable; no migration or backfill.

### Backend Impact
- [ ] None
- [x] Details:
  - New callable export: `customerSendAssistedCreationMessage`.
  - No Firestore/Storage rules, indexes, secrets, or environment variables change.
  - Required dev deployment after owner approval:
    `firebase deploy --only functions:customerSendAssistedCreationMessage --project fresh-prints-dev`

### UI / UX Impact
- [ ] None
- [x] Details:
  - Universal tab name: **Messages**.
  - Existing bubbles remain chronological with newest at the bottom.
  - Timeline receives a bounded height and internal scroll; compose box is fixed below the thread within the panel.
  - Composer has a programmatic label, character count, disabled/busy state, error text, and keyboard-accessible Send button.
  - Portal active and past/terminal request detail surfaces both use the same Messages composer.
  - Studio is read-only for this new customer-send path but displays and unread-tracks messages.

### Migration Impact
- [x] None
- [ ] Forward steps:
- [x] Rollback / compatibility:
  - Revert the client/callable/export and optional marker use. Existing marked entries remain harmless readable history records.

---

## Approach

1. Add shared message limits and optional revision-entry `kind`; update shared history classification/titles to prefer structural markers while preserving legacy submitted-update detection.
2. Add callable request/response types and implement `customerSendAssistedCreationMessage` with authentication, ownership, status validation against all defined statuses, length validation, transaction cooldown, same-status append, and no other mutable fields.
3. Export the callable and add a Portal service method with safe callable error mapping.
4. Rename Portal detail tab/type/copy to Messages; add a reusable composer and scrollable timeline with bottom-scroll behavior.
5. Rename Studio tab/type/copy to Messages; cap and scroll its existing timeline while retaining unread Read controls.
6. Update permanent docs and extend the Assisted manual QA checklist.
7. Run targeted unit tests, Functions build, Portal/Studio typechecks, lint, and app builds; record results and stop at the owner deploy/manual-QA checkpoint.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared history tests | `npx tsx --test packages/shared/src/utils/assistedCreationHistory.test.ts` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint | `npm run lint` | yes |
| Portal build | `npm run build:portal` | yes |
| Studio Vite build | `npm --prefix apps/studio exec vite -- build` | yes |
| Rules tests | not applicable — rules unchanged and direct writes remain denied | no |
| E2E | no configured automated authenticated cross-app suite | no |

### Manual
- [ ] Send from Portal in every status, including `approved`, `rejected`, and `cancelled`; confirm status does not change.
- [ ] Confirm Studio receives the customer bubble and unread Read behavior works.
- [ ] Confirm another customer/request cannot be messaged.
- [ ] Confirm blank, over-2,000-character, and rapid repeat submissions fail safely.
- [ ] Confirm **Messages** naming in current, past, and Studio detail views.
- [ ] Confirm long threads scroll internally and open at the newest entry without growing the page.
- [ ] Confirm mobile Portal and Studio light/dark keyboard/focus behavior.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review
- [x] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: explicit `APPROVE DEV DEPLOY` before selective Functions deploy; owner may self-deploy instead.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Customer mutates locked request content | High | Dedicated append-only callable writes only `revisionHistory` and `updatedAt`. |
| Cross-customer message injection | High | Auth + customer-profile + transaction ownership check. |
| Spam / oversized request documents | High | 2,000-character limit and 10-second per-request cooldown; future high-volume chat should move to a subcollection. |
| Terminal message appears to reopen work | Medium | Same-status append only; status badge remains unchanged and composer helper text says messaging does not reopen status. |
| Legacy string matching remains fragile | Medium | New structural `kind`; legacy matching retained only for old records. |
| Long Firestore array growth | Medium | This owner-scoped enhancement reuses the current schema; document future subcollection migration if usage becomes high volume. |
| Composer hidden by nested scroll | Medium | Scroll only the thread; keep composer outside the scrolling element. |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert callable export/client UI and shared marker interpretation. No data rollback is required; new same-status history entries remain valid timeline records. No rules, index, Storage, secret, or environment rollback is involved.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] SECURITY.md
- [x] Other: `docs/WORKFLOWS.md`, workflow test/manual-QA artifacts.

---

## Open Questions
- [x] None. “Any stage” explicitly includes active and terminal statuses. The implementation preserves status and does not reopen terminal requests.

---

## Approval
- Review doc: `docs/workflow/reviews/2026-07-17-assisted-creation-messages-review.md`
- Verdict: approved
