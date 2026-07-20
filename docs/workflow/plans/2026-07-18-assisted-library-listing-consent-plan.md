# Plan: Assisted Add to Request — Design Library listing consent

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Residual under Small Managed Items #1 (ADR-FP-094); parallel to #2 upload caps (do not block) |

---

## Goal

When a Portal customer clicks **Add to Request** on an approved Assisted proof, show a clear consent modal asking whether Fresh Prints may consider the design for the public Design Library. Both **Allow** and **Don’t allow** still add the design to Current Request. Persist consent on the resulting `customerUploads` document so Studio intake can promote (or know not to). Skip the modal when the design is already in the working request. Do not auto-publish to catalog.

## Background

Small Managed Items #1 shipped Add to Request (callable `customerAddAssistedApprovedProofToPrintRequest`) with private-only uploads (`catalogReviewStatus: not_eligible`, `catalogUseAcknowledged: false`). Owner asked for an additive consent step before add. Existing print-upload flow already uses `catalogUseAcknowledged` + Studio intake (`pending_staff_review`); this residual aligns Assisted with that consent model without changing Download or auto-publishing.

#2 upload caps remains parked awaiting `APPROVE DEV DEPLOY` — this work is independent and must not wait on #2.

## Scope

### In Scope

- Portal modal on first **Add to Request** (not Download) when not already in working Current Request
- Modal copy + dual proceed actions (Allow / Don’t allow); dismiss/Escape cancels without adding
- Callable request field `catalogUseAcknowledged: boolean` (reuse existing upload field name)
- Persist on created `customerUploads` using **shared** `buildCatalogIntakeConfirmationPatch` (same as print-upload attach / donate):
  - **Allow:** `catalogUseAcknowledged: true`, `catalogReviewStatus: pending_staff_review`
  - **Don’t allow:** `catalogUseAcknowledged: false`, `catalogReviewStatus: pending_staff_review` (still intake — matches unchecked upload checkbox; Studio shows Declined)
  - Both also set `ownershipConfirmed`, `termsVersion`, `confirmedAt`
- Optional denormalize `catalogUseAcknowledged` on `printRequestIngest` for Studio/assisted audit
- Soft-reload Portal after Functions deploy
- Brief `DATA_MODEL.md` + ADR note updates
- Manual QA checklist
- Dev Functions deploy after owner `APPROVE DEV DEPLOY` (this callable only; no production)

### Out of Scope

- Changing Download flow
- Auto-publishing to Design Library / designs collection
- Studio UI changes beyond reading existing intake fields (intake already shows `catalogUseAcknowledged`)
- Re-prompt when Already in request
- Changing consent for regular customer uploads / donations
- #2 upload caps deploy or QA
- Production deploy
- Commit unless asked

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/types/assistedCreation/assistedCreationActions.types.ts` — request payload
- `packages/shared/src/types/assistedCreation/assistedCreation.types.ts` — optional ingest field
- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` — validate + persist consent
- `apps/portal/features/assisted-creation/services/assistedCreationService.ts` — pass boolean
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx` — modal gate
- New small Portal modal component (or dual-action variant) under assisted-creation or shared
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md` (brief ADR residual)
- Unit/validation tests if shared validators added

### Architecture Impact

- [x] Details: Portal UI → service → existing callable; persist via existing `customerUploads` catalog fields. No new collections.

### Security Impact

- [x] Details: Callable remains owner-customer auth’d. Client boolean is trusted only as consent flag (customer-owned upload); cannot escalate privileges. Deny stays fail-closed private. Allow only opens Studio intake (`pending_staff_review`), same as print-upload consent path — staff still must promote.

### Data Model Impact

- [x] Details: Reuse `catalogUseAcknowledged` + `catalogReviewStatus` on assisted-copied uploads. Optional `printRequestIngest.catalogUseAcknowledged`. No migration; new writes only. Legacy ingested proofs remain private.

### Backend Impact

- [x] Details: Extend `customerAddAssistedApprovedProofToPrintRequest` request shape. Redeploy that Function on fresh-prints-dev. No rules change expected (Admin SDK writes).

### UI / UX Impact

- [x] Details: Consent modal before add; skip when Already in request. Manual UI checkpoint required.

### Migration Impact

- [x] None for existing docs
- [x] Forward steps: new adds only
- [x] Rollback / compatibility: omit/false → private; old clients without field → treat as deny (private) if we require boolean, or default deny if missing

---

## Approach

1. **Types** — Add required `catalogUseAcknowledged: boolean` to callable request. Optionally add same on `AssistedCreationPrintRequestIngest`.
2. **Callable** — Validate boolean. On create upload: if true → `catalogUseAcknowledged: true` + `catalogReviewStatus: pending_staff_review`; else keep private. Idempotent “already attached” path: do not re-prompt / do not rewrite consent (return existing).
3. **Portal service** — `addApprovedProofToPrintRequest(requestId, { catalogUseAcknowledged })`.
4. **UI** — On Add click (when not `alreadyInStash`): open modal. Allow → call with true; Don’t allow → call with false; overlay/Escape → close, no call.
5. **Modal copy (proposed):**
   - Title: **Add to Design Library?**
   - Body: Allow Fresh Prints to consider this custom design for the public Design Library? Either choice still adds it to your Current Request. Staff approves designs first. It will not appear in the library automatically.
   - Footer: **Cancel** (far left, dismiss only) · **Don’t allow** · **Allow** (right)
6. **Docs** — Update ADR-FP-094 residual in DATA_MODEL / DECISIONS.
7. **Test + deploy** — Automated typecheck/build/targeted tests; owner `APPROVE DEV DEPLOY`; soft-reload Portal; manual QA.

---

## Modal copy (locked for implement)

| Element | Copy |
|---------|------|
| Title | Add to Design Library? |
| Body | Allow Fresh Prints to consider this custom design for the public Design Library? Either choice still adds it to your Current Request. Staff approves designs first. It will not appear in the library automatically. |
| Cancel | Cancel (far left; dismiss, no add, no intake write) |
| Allow | Allow |
| Deny | Don’t allow |

---

## What gets persisted (field parity with upload / donate)

Shared helper: `buildCatalogIntakeConfirmationPatch` (same as `confirmCustomerUploadsAndAttachToRequest` and `confirmCustomerUploadsForDonation`).

| Flow | Consent UI | `catalogUseAcknowledged` | `catalogReviewStatus` | Other confirmation fields |
|------|------------|--------------------------|----------------------|---------------------------|
| Print upload attach | Checkbox (optional) | true / false | **always** `pending_staff_review` | `ownershipConfirmed`, `termsVersion`, `confirmedAt`, `printRequestId` |
| Donate | Required checkbox | **true** (required) | `pending_staff_review` | same; `printRequestId: null` |
| Assisted Add to Request | Modal Allow / Don’t allow | true / false | **always** `pending_staff_review` | same patch; `printRequestId` set; plus `assistedCreationRequestId` / `assistedProofId` |

| Modal choice | Maps to |
|--------------|---------|
| **Allow** | `catalogUseAcknowledged: true` → Studio shows Design Library permission **Allowed** |
| **Don’t allow** | `catalogUseAcknowledged: false` → Studio shows **Declined** — still in intake (same as unchecked print-upload checkbox) |

Neither choice auto-publishes to catalog / `designs`. Staff promote via existing Customer Uploads → AI Review path.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Shared/assisted unit tests | `npx tsx --test` on touched shared tests | yes if validators/tests added |
| Lint | `npm run lint` (scoped if needed) | yes if TS/TSX touched |

### Manual

- [x] Details: See manual QA doc after implement — Allow path, Don’t allow path, Already in request skip, Download unchanged, Studio intake visibility when Allow

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [x] `APPROVE DEV DEPLOY` for Functions (callable) on fresh-prints-dev
- [ ] Design approval — copy proposed above; owner can tweak in QA notes
- [ ] Production deploy — out of scope
- [ ] Database migration — none
- [ ] Other: soft-reload Portal after deploy

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Confusing PortalConfirmModal Escape = deny | Medium | Dual-action modal; Escape/overlay = abort only |
| Allow mistaken for instant publish | Medium | Modal copy states staff review; status is intake-only |
| #2 deploy confusion | Low | Separate checkpoint; deploy only this callable |
| Missing boolean from old client | Low | Server requires boolean or defaults deny |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Redeploy prior Function; Portal soft-reload. Existing uploads keep their stored consent fields. No data wipe.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — ADR-FP-094 residual: consent + catalog status on assisted copy
- [x] DECISIONS.md — brief residual under ADR-FP-094
- [ ] Other: workflow plan/review/test/manual QA/signoff

---

## Open Questions

- [x] None blocking — reuse `catalogUseAcknowledged` + `pending_staff_review` vs inventing `allowLibraryListing` (prefer existing field)

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-assisted-library-listing-consent-review.md
- Verdict: pending
