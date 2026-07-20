# Plan: Portal 25 MB image cap + remaining daily quota UI

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-18-upload-caps-studio-settings-plan.md (residual: Portal remaining display was out of scope) |

---

## Goal

Lower the customer single-image byte cap from **100 MB → 25 MB**, and show Portal Upload / Donate remaining daily quotas in the Etsy preview style (`X of Y left today`, midnight UTC reset), backed by a new read-only callable (rate-limit docs stay client-denied).

## Background

Owner decisions (2026-07-18): 25 MB image max; remaining quota UI on upload + donate. Upload-caps phase already shipped Studio Settings + purpose-scoped counters; this closes the residual Portal remaining display and the size default change.

## Scope

### In Scope
- `CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES = 25 * 1024 * 1024` + matching `storage.rules` image check
- Tests/docs that hardcode 100 MB for this constant (prefer constant import)
- Callable `getCustomerUploadDailyQuota` returning today’s used/limit/remaining for sessions, images, and ZIPs for the signed-in customer’s purpose bucket
- Portal `CustomerUploadPanel` (upload + donate): show remaining before upload; refresh after successful charge and after quota/charge failures
- Deploy to `fresh-prints-dev`: storage rules + finalize/create-batch Functions (bundled constant) + new callable
- Manual re-test checklist

### Out of Scope
- ZIP / batch uncompressed byte limits (stay 2 GB)
- Production deploy
- Changing Studio Settings quota integers (already live)
- Etsy / other features

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/.../customerUploadLimits.constants.ts`
- `packages/shared/.../storageRulesAlignment.test.ts`
- `packages/shared/src/types/customerUpload/` — quota request/response types (+ format helper optional)
- `storage.rules`
- `functions/src/lib/customerUploadRateLimit.ts` — `readDailyQuota` (or equivalent)
- `functions/src/getCustomerUploadDailyQuota.ts` — **new**
- `functions/src/index.ts`
- `functions` that import the image size constant (redeploy: create/finalize/retry as needed)
- `apps/portal/.../customerUploadService.ts`, `CustomerUploadPanel.tsx`, CSS, format util
- Docs: `FIREBASE.md` size row; light `BACKEND.md` callable row; `SECURITY.md` if still conflicting

### Architecture Impact
- [x] Details: UI → service → callable → Admin read of `customerUploadRateLimits` + settings limits. No client Firestore access to rate-limit docs.

### Security Impact
- [x] Details: Auth required; portal customer only; returns only caller’s counters for requested purpose; no writes; rate-limit docs remain `allow read, write: if false`.

### Data Model Impact
- [x] Details: None. Read existing rate-limit + settings docs.

### Backend Impact
- [x] Details: New callable; redeploy size-validating Functions + storage rules to dev.

### UI / UX Impact
- [x] Details: Quota line under upload header (Etsy-like). Copy without em dashes. Manual QA required.

### Migration Impact
- [x] None
- [x] Forward: Deploy storage + Functions; soft-reload Portal
- [x] Rollback: Redeploy prior constant/rules/callable; counters unchanged

---

## Approach

1. Change shared image byte constant; mirror `storage.rules`; fix alignment test message/expression.
2. Add shared types + `readDailyQuota` using `loadCustomerUploadQuotaSettings` + `resolveDailyQuotaTarget`.
3. Callable `getCustomerUploadDailyQuota({ purpose })`.
4. Portal: fetch on mount; display `N of M images left today` / sessions / ZIPs + `(resets at midnight UTC)`; refresh after batch/finalize success or resource-exhausted failure.
5. Update docs; run tests; deploy selective targets to `fresh-prints-dev` (owner authorized in this task).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared storage alignment | `node --test` / package script for `storageRulesAlignment.test.ts` | yes |
| Functions unit (read quota helper if tested) | functions test for resolve / new helper | yes if added |
| Typecheck / build Functions | `npm --prefix functions run build` | yes |

### Manual
- Soft-reload Portal upload + donate; confirm 25 MB messaging and remaining lines; optional oversize reject; refresh after uploads.

---

## Human Checkpoints Anticipated
- [x] Manual UI re-test (upload + donate remaining + 25 MB)
- [ ] Production deploy (forbidden)
- [x] Dev deploy authorized by this task deliverable (no separate APPROVE string required)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale Portal bundle still shows 100 MB | Low | Soft-reload; constant from shared package |
| Callable not deployed → empty/error UI | Medium | Fail soft (hide or muted “couldn’t load”); deploy in same workflow |
| Storage `< 25MB` vs Functions `<= 25MB` off-by-one | Low | Preserve existing `<` vs `>` pattern |

---

## Open Questions
- None (owner decisions locked).

## Decision Log
- 2026-07-18 - Owner: 100→25 MB; remaining UI on upload/donate; callable preferred; ZIP stays 2 GB; no production.
