# Plan: Portal upload limits layout, plain copy, ZIP cap alignment

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Residual after `2026-07-18-portal-25mb-remaining-quota` owner FAIL / polish feedback |

---

## Goal

Rearrange Choose-files layout (quota box above file-limit line above buttons), replace “session” wording with plain English, align ZIP compressed/decompressed byte caps with daily image capacity from Studio Settings, and extend `getCustomerUploadDailyQuota` so Portal displays live size limits (not stale hardcoded ZIP 2 GB).

## Background

Owner QA on the remaining-quota UI: layout order wrong; “session” unclear; advertising 2 GB ZIP while image daily capacity is `images/day × 25 MB` is inconsistent; help text must match Settings-backed limits.

## Scope

### In Scope
- Layout: title → rate-limits box → file-limitations text → dropzone/buttons
- Copy: no “session”; use **upload starts** for create-batch quota; keep images / ZIPs; no em dashes
- ZIP byte formula (display + Functions enforcement):
  `maxZipBytes = min(CEILING_2GB, imagesDailyLimit × maxSingleImageBytes)`
  where `imagesDailyLimit` comes from Studio Settings for the purpose (same as image quota)
- Extend `getCustomerUploadDailyQuota` response: remaining buckets + `maxSingleImageBytes` + `maxZipBytes` (+ keep concurrent/batch constants available to UI via response or existing shared constants)
- Rename response field `sessions` → `uploadStarts` (Portal-only consumer)
- Soften create-batch exhausted message away from “sessions”
- Client classify + create/finalize ZIP validation use purpose-scoped max from settings/computed (not only ceiling)
- `storage.rules` stays at **2 GB ceiling** (cannot read Settings); Functions enforce tighter purpose-scoped max
- Docs: FIREBASE / BACKEND / SECURITY light updates
- Deploy `fresh-prints-dev` only: Functions (+ storage only if ceiling expression changes — expected no); soft-reload Portal
- Manual re-test checklist

### Out of Scope
- Production deploy
- Charging `finalizeImage` per image inside a ZIP (ZIP still charges `finalizeZip` only; size formula uses image daily capacity for consistency)
- Studio Settings label rename (“Upload sessions / day”)
- Adding byte-size fields to Studio Settings UI

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/.../customerUploadLimits.constants.ts` — ceiling + `computeCustomerUploadMaxZipBytes`
- `packages/shared/.../customerUploadDailyQuota.types.ts`
- `packages/shared/.../storageRulesAlignment.test.ts` (ceiling wording)
- `functions/.../customerUploadRateLimit.ts` — extend `readDailyQuota`
- `functions/.../customerUploadDailyQuota.ts` — exhausted copy
- `functions/.../getCustomerUploadDailyQuota.ts`
- `functions/.../createCustomerUploadBatch.ts`, `finalizeCustomerUploadZip.ts`, `customerUploadValidation.ts`, `customerUploadZip.ts` as needed for computed max
- `apps/portal/.../CustomerUploadPanel.tsx`, format util + test, `customerUploadService.ts`, CSS
- Docs + workflow review/manual QA

### Architecture Impact
- [x] Details: Callable returns display+enforcement limits; UI does not guess ZIP max from Settings

### Security Impact
- [x] Details: Tighter ZIP reject in Functions; storage ceiling unchanged (fail-closed at finalize if oversized)

### Data Model Impact
- [x] None

### Backend Impact
- [x] Details: Extended callable payload; ZIP size checks purpose+settings aware

### UI / UX Impact
- [x] Details: Layout + copy; manual QA required

### Migration Impact
- [x] None (API field rename Portal-only)

---

## Approach

1. Add shared `CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING` + `computeCustomerUploadMaxZipBytes(imagesDailyLimit)`.
2. Extend `readDailyQuota` / callable response with limits + computed `maxZipBytes`; rename `sessions` → `uploadStarts`.
3. Enforce computed max in create-batch ZIP declare + finalize ZIP compressed/decompressed paths.
4. Portal: rearrange DOM; format “upload starts”; use response bytes for help text and client ZIP reject; fallback to formula with code-default image limit if quota not loaded.
5. Tests + docs; deploy Functions to fresh-prints-dev; soft-reload Portal.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit | format util + compute helper + storage alignment | yes |
| Typecheck / shared / functions tests as practical | project scripts | yes |
| Build full monorepo | no | optional |

### Manual
- [x] Portal Upload + Donate Choose files: layout order, copy, ZIP size matches Settings image limit formula

---

## Human Checkpoints Anticipated
- [x] Manual UI re-test
- [ ] Production deploy — not this phase

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Storage allows up to 2 GB while print ZIP max is lower | Low | Client + createBatch + finalize enforce computed max |
| Settings image limit very low → tiny ZIP | Low | Intended; owner consistency rule |

---

## Rollback Plan

Redeploy prior Functions; soft-reload Portal; counters unchanged.

---

## Documentation Updates Required
- [x] BACKEND.md callable row
- [x] FIREBASE.md ZIP note
- [x] SECURITY.md customer upload limits line
- [x] Other: workflow review + manual QA

---

## Open Questions
- [x] None — formula and “upload starts” wording chosen per owner suggestions

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-18-portal-upload-limits-copy-zip-review.md
- Verdict: pending
