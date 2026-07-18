# Plan: Portal duplicate + resize — Save failed / permissions

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `portal-duplicate-resize-permissions` |
| Related | Parked: portal-notification-history-modal manual QA |

---

## Goal

Fix Portal print-request detail **Duplicate → resize** so item autosave succeeds for customers instead of toasting `Save failed` / `Missing or insufficient permissions.`

---

## Background

User report (likely `fresh-prints-dev` Portal customer): on print request details, after **Duplicate** and changing print size, bottom-right autosave shows **Save failed** + Firestore **Missing or insufficient permissions.** + Retry.

### Trace (evidence)

| Step | Path | Mechanism |
|------|------|-----------|
| Duplicate | `PortalPrintRequestItemCard` → `duplicateItem` → `duplicatePortalPrintRequestItem` callable | Admin SDK (bypasses rules). Failures use `actionError`, not autosave toast. Optimistic row uses `pending_dup_*` id until callable returns. |
| Resize / qty | Card debounce/blur → `onUpdate` → `portalPrintRequestService.updatePrintRequestItem` | Client `updateDoc` |
| Autosave toast | `PrintRequestDetailView` `autosaveState.status === 'failed'` | Exact user-visible banner |

### Root causes (ordered)

1. **Primary — optimistic duplicate id race:** Duplicate inserts a local row with id `pending_dup_*` before the callable returns. Resizing that row calls `updateDoc(printRequestItems/pending_dup_*)`. That doc does not exist; Firestore customer rules deny create on that path → **`permission-denied` / “Missing or insufficient permissions.”** (not a real ownership bug).
2. **Secondary — parent touch on item edit:** `updatePrintRequestItem` also wrote `printRequests/{id}` `{updatedBy,updatedAt}`. Studio item edits do not. Customer parent updates must pass `customerCanUpdatePrintRequest` + `printRequestRequiredFieldsValid`; fragile for Admin-created request shapes / null optionals.
3. **UX gap:** Quantity stepper could schedule save without `canSave`, so over-22″ sizes hit rules `<= 22` and also surfaced as permission-denied.

---

## Scope

### In Scope

1. **Client:** Block edits/autosave on optimistic `pending_dup_*` rows until real id exists; clear user-facing wait message if a write is attempted.
2. **Client:** Stop parent `printRequests` touch inside `updatePrintRequestItem` (align with Studio). Keep parent bumps on add/remove/notes/clear.
3. **Client:** Validate quantity (≥1 int) and print inches (≤ 22, > 0) in `updatePrintRequestItem` before write.
4. **Client:** Quantity stepper / scheduled save respect `canSave`.
5. **Client:** Clear notes with `deleteField()` instead of `null`.
6. **Rules (narrow harden):** Customer `printRequests` update allow only `itemCount` / `notes` / `updatedBy` / `updatedAt` via `diff().affectedKeys().hasOnly(...)`; treat `null` optional scalars as absent in optional helpers. Do **not** broaden item create or identity locks.
7. Light workflow state update; **preserve parked notification QA** and other open checkpoints.

### Out of Scope

- Production deploy
- Changing duplicate callable
- Relaxing `isReadyDesign` on create
- Broad rules refactors / Studio changes
- Web-push / notification history signoff

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `firestore.rules` (narrow)
- `.cursor/workflow/state.md`
- Plan / review / test docs under `docs/workflow/`

### Architecture Impact

- [x] Details: Portal service write shape matches Studio for item edits; no new layers.

### Security Impact

- [x] Details: Rules stay default-deny; customer parent updates constrained by `diff().affectedKeys().hasOnly` (tighter than informal equality). Null-tolerant optional helpers do not allow new fields. No privilege expansion on item identity (`designId` / `sourceType` / `customerUploadId` remain locked).

### Data Model Impact

- [x] None (behavior only; notes clear uses delete vs null)

### Backend Impact

- [x] Details: Firestore rules deploy to `fresh-prints-dev` only after `APPROVE DEV DEPLOY`. No Functions deploy required for the client fix; rules harden is separate optional deploy for add/remove/notes reliability.

### UI / UX Impact

- [x] Details: Autosave should reach Saved on valid resize; invalid sizes show clear message. Manual QA on Portal detail.

### Migration Impact

- [x] None

---

## Approach

1. Remove parent `updateDoc` from `updatePrintRequestItem`.
2. Pre-validate size/qty in service; floor quantity.
3. Gate `scheduleSave` / stepper on `canSave`.
4. Notes clear → `deleteField()`.
5. Rules: `diff().affectedKeys().hasOnly(["itemCount","notes","updatedBy","updatedAt"])` inside customer printRequest update; null-safe optional helpers.
6. Typecheck Portal; document retest + deploy commands.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Portal typecheck | `npx tsc --noEmit -p apps/portal` (or package script) | yes |
| Lint | if configured for touched files | no if N/A |
| Unit | none new unless helper extracted | no |
| Rules emulator suite | none in repo | no — document gap |

### Manual

- [x] Portal draft request: Duplicate item → change width/height within 22″ → expect **Saved**, not permissions toast.
- [x] Quantity +/- on valid size → Saved.
- [x] Over-22″ → blocked with clear size message (no permissions toast).
- [x] Remove still adjusts `itemCount` (parent write still used).

---

## Human Checkpoints Anticipated

- [x] Manual Portal retest after fix
- [x] `APPROVE DEV DEPLOY` before `firestore:rules` to `fresh-prints-dev`
- [ ] Production deploy — not in this phase

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| List `updatedAt` no longer bumps on qty/size edit | Low | Acceptable; add/remove/notes still bump |
| Rules deploy lag | Med | Client fix unblocks resize without rules; rules harden still asked for add/remove/notes |
| Mis-attributed duplicate callable failure | Low | Duplicate errors stay on `actionError`; toast path is autosave only |

---

## Rollback Plan

Revert Portal service/card changes; revert rules if deployed; redeploy prior rules to dev.

---

## Documentation Updates Required

- [ ] DECISIONS.md — only if ADR needed (not expected)
- [x] Workflow plan/review/test + state
- [ ] Light BACKEND/DEPLOYMENT note only if deploy commands change (use existing)

---

## Open Questions

- [x] None — proceed; ask for rules deploy approval separately

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-review.md
- Verdict: pending
