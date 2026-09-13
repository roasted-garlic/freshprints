# Plan: Studio customer-upload artwork background auto-detect (import parity)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Import detector `importArtworkBackgroundDetection.ts`; Studio CU intake preview controls |

---

## Goal

On the **Studio customer uploads intake** page, apply the **same conservative light-art → dark mat detector** used on Imports Auto background, so staff see the correct preview mat already selected when detection says dark is needed. **Portal customer UI stays unchanged** (no portal picker / no customer-facing auto mat).

## Background

Imports run `suggestDarkArtworkBackgroundFromPngBytes` (Electron + sharp) and feed `autoSuggestsDark` into `resolveImportArtworkBackgroundDecision` (`code_auto` + light-black when true).

Studio customer-upload intake already reuses `ImportPreviewControls`, but hardcodes `autoSuggestsDark={false}` and `resolveCustomerUploadPreviewBackgroundHex` ignores detection. Staff must manually pick Dark for light line art. Customer uploads are finalized in Functions with sharp already available on production PNG bytes — ideal place to run the shared detector once and persist the hint.

Related: ADR-FP-080 / DATA_MODEL artwork-background vs halftone (display mat only; never imply halftone).

## Scope

### In Scope

- Run the **shared** import detector on customer-upload **production PNG** during finalize / ZIP finalize / retry processing success paths.
- Persist:
  - `suggestDarkArtworkBackground: true` when detector says dark (omit / leave unset when false — match import IPC style).
  - When dark and upload is not already `staff_manual`: set `artworkBackgroundHex` + `artworkBackgroundSource: "code_auto"` (same values as import Auto-dark).
- Studio intake: wire `autoSuggestsDark` from persisted hint; preview/resolver parity with Imports Auto.
- Staff Auto/Light/Dark:
  - Light/Dark → `staff_manual` (unchanged).
  - Auto → clear staff override; if `suggestDarkArtworkBackground`, restore `code_auto` + dark hex (do **not** delete the detector hint).
- Promote-to-AI-Review: continue copying upload artwork background fields (already supports `code_auto`).
- Types, DATA_MODEL note, focused tests, ADR if decision-worthy.
- Docs: no Portal UI for this.

### Out of Scope

- Portal customer upload UX / portal preview mats for raw uploads.
- Changing detector thresholds or import Electron path.
- Inferring or setting **halftone** from dark mat.
- Bulk backfill job for historical uploads (see Open Questions / Approach for ready-but-unset coverage).
- TD-034 / catalog enrich work (parked).
- Commit/push/deploy unless owner authorizes separately.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/importArtworkBackgroundDetection.ts` (reuse; no threshold changes)
- `packages/shared/src/utils/resolveImportArtworkBackgroundDecision.ts` (reuse)
- `packages/shared/src/types/customerUpload/customerUpload.types.ts`
- `functions/src/lib/customerUploadProcessing.ts` (detect on success; attach to result)
- `functions/src/finalizeCustomerUpload.ts`
- `functions/src/finalizeCustomerUploadZip.ts`
- `functions/src/retryCustomerUploadProcessing.ts`
- `functions/src/recordCustomerUploadArtworkBackgroundStaffDecision.ts` (Auto → restore `code_auto` when hint true)
- `apps/studio/.../customer-uploads/utils/customerUploadPreviewBackground.ts`
- `apps/studio/.../customer-uploads/components/CustomerUploadIntakePreviewControls.tsx`
- `apps/studio/.../customer-uploads/hooks/useCustomerUploadIntake.ts` (map field; Auto restore behavior)
- `apps/studio/.../customer-uploads/services/customerUploadIntakeService.ts` (if payload shape changes)
- Tests under studio CU + functions processing / staff decision
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md` (short ADR)

### Architecture Impact

- [x] Details: Server-authored display-mat hint on `customerUploads` (parallel to import session `suggestDark` + `code_auto`). Studio remains staff-only consumer. No new client→sharp dependency.

### Security Impact

- [x] Details: Detection runs in trusted finalize/retry (Admin). Staff callable remains intake-permission gated. No new public Portal surface. Fail closed to “no dark suggest” on detector errors (same as import).

### Data Model Impact

- [x] Details: Additive optional `suggestDarkArtworkBackground?: boolean` on `customerUploads`. Existing `artworkBackgroundHex` / `artworkBackgroundSource` gain `code_auto` writes from processing (already typed).

### Backend Impact

- [x] Details: Finalize / ZIP / retry ready writes include detector fields. Staff artwork-background callable Auto path may write `code_auto` when restoring detection (not only delete).

### UI / UX Impact

- [x] Details: Studio CU intake Auto chip resolves to Dark when hint true (same as Imports). Portal unchanged. Manual Studio smoke recommended.

### Migration Impact

- [x] Forward steps: Additive fields only; no migration required for schema.
- [x] Rollback / compatibility: Omit writes; old clients ignore unknown field; Studio without deploy still shows Auto/light until Studio ships wiring.
- [ ] Historical ready uploads without hint: **not auto-backfilled** in v1 unless Open Question chooses lazy detect (default: new processing / staff Retry processing / future backfill).

---

## Approach

1. **Shared reuse only** — call `suggestDarkArtworkBackgroundFromPngBytes(sharp, productionPng)` inside customer-upload processing success path (or immediately after, before Firestore ready write). Prefer false on any failure; never fail the upload for detector errors.
2. **Persist on ready** — in finalize, ZIP finalize, and retry ready updates:
   - if suggest dark → `suggestDarkArtworkBackground: true` + `artworkBackgroundHex` / `source: code_auto` **unless** existing `artworkBackgroundSource === "staff_manual"` (preserve staff choice on retry).
   - if not suggest dark → do not set `suggestDarkArtworkBackground`; do not clear staff_manual; optionally leave prior `code_auto` alone or clear only when reprocessing and staff_manual absent (prefer: rewrite detection result each successful process when not staff_manual).
3. **Studio wiring**
   - Map `suggestDarkArtworkBackground` on intake rows.
   - Pass `autoSuggestsDark={row.suggestDarkArtworkBackground === true}` into `ImportPreviewControls`.
   - Update `resolveCustomerUploadPreviewBackgroundHex` to accept / use `autoSuggestsDark` (and keep halftone-on → dark when Auto).
   - Auto control: if hint true → persist `code_auto`+dark; else clear hex/source; **never** clear `suggestDarkArtworkBackground`.
4. **Promote** — existing field copy is enough when `code_auto` is stored; if only hint exists (edge), map hint → `code_auto` at promote (defensive).
5. **Portal** — confirm no reads of this hint for customer-facing preview; no UI work.
6. **Docs** — DATA_MODEL customerUploads note; short ADR (Studio CU uses import detector; display-only; portal excluded).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck` (or package-scoped if documented) | yes |
| Unit / contract | shared detector unchanged smoke; CU preview helpers with `autoSuggestsDark`; processing attaches suggest flag; staff Auto restore `code_auto`; promote maps fields | yes |
| Lint | project lint if touched packages use it | yes if available |
| Build | not required for this slice | no |
| Integration | finalize path unit/mock preferred over live Firebase | yes (unit) |
| E2E | no | no |
| Backend/rules | no rules change expected | no |

### Manual

- [x] Details: Studio Customer Uploads — open a light line-art ready upload (after reprocess or new finalize) → Auto shows Dark mat without staff click; Light override sticks; Auto restores Dark; Portal upload flow unchanged visually for customer.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Studio intake smoke)
- [ ] Design approval
- [ ] Business logic decision — see Open Questions (historical uploads)
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: Functions + Studio deploy to DEV before live verification

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Detector false positives darken normal art | Med | Reuse conservative import thresholds; prefer false negatives |
| Retry overwrites staff Light/Dark | High | Skip writing `code_auto` when `staff_manual` present |
| Auto clear deletes hint | Med | Never delete `suggestDarkArtworkBackground` from staff Auto |
| Historical uploads stay light until reprocess | Low/Med | Document; optional follow-up backfill / Retry |
| Extra sharp work on finalize | Low | Same sample path as import (≤400px); fail-soft |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert processing writes and Studio wiring. Existing docs without the field behave as today (Auto = light). No destructive data change.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [x] DATA_MODEL.md — customerUploads artwork background auto hint
- [ ] BACKEND.md — only if callable contract summary lives there
- [x] DECISIONS.md — short ADR
- [ ] Other: workflow plan/review/signoff artifacts

---

## Open Questions

- [x] **Historical ready uploads:** Default for this plan = **no bulk backfill**; coverage via new finalize / staff **Retry** processing. Confirm if owner wants a follow-up lazy detect-on-open instead.
- [x] Portal: confirmed out of scope per request.

---

## Approval

- Review doc: 
- Verdict: pending
