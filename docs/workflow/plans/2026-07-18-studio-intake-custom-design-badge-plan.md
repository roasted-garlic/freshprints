# Plan: Studio intake — Custom design badge for assisted uploads

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-studio-intake-custom-design-badge-review.md |

---

## Goal

On Studio customer-upload / catalog intake (same page as uploads and donate), visually distinguish items that came from Assisted Add to Request as **Custom** (assisted-approved), so staff do not treat them as ordinary customer uploads.

## Background

Owner: “Since it is using the same page as uploaded design, can we somehow notate that this was a custom design?”

Assisted Add to Request already writes `assistedCreationRequestId` / `assistedProofId` on `customerUploads` (ADR-FP-094). Portal already labels these **Custom** with purple (`--color-custom`). Studio intake does not map or display those fields today.

## Scope

### In Scope
- Map `assistedCreationRequestId` (and optionally `assistedProofId`) onto Studio `CustomerUploadIntakeRow`
- Show a **Custom** badge/label on assisted-sourced rows in the intake list and detail header
- Purple styling aligned with Portal Custom purple (hardcode or local CSS vars matching `#7c3aed` / `#6d28d9`)
- Soft-reload Studio only (no Functions deploy if fields already exist)

### Out of Scope
- Functions / callable changes
- New Firestore fields
- Changing promote / exclude / donate flows
- Portal changes
- Filtering intake to hide or segregate assisted rows
- Production deploy

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/.../customerUploadIntakeService.ts` — map assisted fields
- `apps/studio/.../CustomerUploadIntakeSection.tsx` — badge in list + detail (+ tech details Source line)
- `apps/studio/.../styles/layout.css` (or adjacent) — Custom pill styles

### Architecture Impact
- [x] None — UI + intake row mapping only; service layer already owns Firestore reads

### Security Impact
- [x] None — read existing fields staff already can see via intake query; no new permissions

### Data Model Impact
- [x] None — reuse existing optional `assistedCreationRequestId` / `assistedProofId`

### Backend Impact
- [x] None — prefer existing fields; no deploy

### UI / UX Impact
- [x] Details: Studio Imports intake list + detail show **Custom** badge when `assistedCreationRequestId` is set; normal uploads/donations unchanged

### Migration Impact
- [x] None
- [ ] Forward steps: N/A
- [ ] Rollback / compatibility: revert UI/CSS; old rows without assisted fields simply show no badge

---

## Approach

1. In `listForIntake`, parse `assistedCreationRequestId` (non-empty string → truthy source) onto the row; optionally keep `assistedProofId` for tech-details display.
2. In list item: when assisted, show a compact **Custom** pill next to title (or under subtitle).
3. In detail header meta: include **Custom** (and keep donation annotation behavior for donate scope).
4. In Technical details modal: add Source = “Custom design (Assisted)” when assisted; leave donation “Catalog donation” and normal uploads without that line (or “Customer upload”).
5. CSS: purple pill matching Portal Custom badge tone.

Detection rule: `Boolean(assistedCreationRequestId)` — same as Portal.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | Studio / root typecheck if available | yes |
| Lint | if configured for touched files | no (optional) |
| Unit tests | N/A — presentational | no |
| Build | Studio build if quick | no |
| Integration | no | no |
| E2E | no | no |
| Backend/rules | no | no |

### Manual
- [x] Details: Soft-reload Studio → Imports intake → assisted-sourced pending row shows Custom; plain upload / donate do not

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (badge visibility / wording)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: **Consent residual still needs `APPROVE DEV DEPLOY`** (separate parked workflow) — not required for this badge if assisted fields already exist on uploaded docs

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Older assisted uploads missing audit fields | low | No badge (fail soft); only new Add-to-Request path sets fields |
| Consent deploy still pending → fewer assisted intake rows to QA | low | Manual QA can wait for a row with `assistedCreationRequestId`, or use existing row if any |
| Purple clashes with Studio theme | low | Soft tint via color-mix like Portal |

---

## Rollback Plan

Revert the three Studio files; no data migration.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md — optional one-line note that Studio intake surfaces Custom badge from assisted fields
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md — brief note if desired
- [x] Other: workflow plan/review/test/signoff only; light DATA_MODEL touch if we document staff UX

---

## Open Questions
- [x] None — label **Custom** to match Portal; field already exists

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-18-studio-intake-custom-design-badge-review.md
- Verdict: pending
